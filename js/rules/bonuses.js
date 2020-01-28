import {FILTERS} from './filters.js';
import {OBSIDIAN} from './rules.js';
import {determineAdvantage, Prepare} from './prepare.js';

export function applyBonuses (actorData) {
	const data = actorData.data;
	const flags = actorData.flags.obsidian;
	const attacks = [];
	const damage = [];

	Array.from(actorData.obsidian.effects.values())
		.filter(effect => !effect.isScaling || effect.selfScaling)
		.flatMap(effect => effect.components)
		.forEach(c => {
			if (c.type === 'attack') {
				attacks.push(c);
			} else if (c.type === 'damage') {
				damage.push(c);
			}
		});

	const toggleable = actorData.obsidian.toggleable;
	const partition = (effect, pred) =>
		effect.toggle.active && effect.bonuses.length
		&& (!effect.filters.length || effect.filters.some(pred));

	attacks.forEach(attack => {
		const key = attack.attack[0] + attack.category[0];
		const bonuses =
			toggleable.filter(effect =>
				partition(effect, filter =>
					FILTERS.isAttack(filter) && FILTERS.inCollection(filter, key)))
				.flatMap(effect => effect.bonuses);

		if (bonuses.length) {
			attack.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
			attack.value = attack.rollParts.reduce((acc, part) => acc + part.mod, 0);
		}
	});

	damage.forEach(dmg => {
		let pred = filter => filter.multi === 'any';
		if (!OBSIDIAN.notDefinedOrEmpty(dmg.damage)) {
			pred = filter => FILTERS.inCollection(filter, dmg.damage);
		}

		const bonuses =
			toggleable.filter(effect =>
				partition(effect, filter => FILTERS.isDamage(filter) && pred(filter)))
			.flatMap(effect => effect.bonuses);

		if (bonuses.length) {
			dmg.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
			dmg.mod = dmg.rollParts.reduce((acc, part) => acc + part.mod, 0);
			dmg.display = Prepare.damageFormat(dmg);
		}
	});

	for (const [id, abl] of Object.entries(data.abilities)) {
		const saveBonuses =
			toggleable.filter(effect =>
				partition(effect, filter =>
					FILTERS.isSave(filter) && FILTERS.inCollection(filter, id)))
				.flatMap(effect => effect.bonuses);

		if (saveBonuses.length) {
			flags.saves[id].rollParts.push(
				...saveBonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
			abl.save = flags.saves[id].rollParts.reduce((acc, part) => acc + part.mod, 0);
		}

		const abilityBonuses =
			toggleable.filter(effect =>
				partition(effect, filter =>
					FILTERS.isCheck(filter)
					&& FILTERS.isAbility(filter)
					&& FILTERS.inCollection(filter, id)))
				.flatMap(effect => effect.bonuses);

		if (abilityBonuses.length) {
			flags.abilities[id].rollParts.push(
				...abilityBonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
		}
	}

	for (let [id, skill] of
		Object.entries(data.skills).concat(Object.entries(flags.skills.custom)))
	{
		const custom = !isNaN(Number(id));
		let key = id;

		if (custom) {
			key = `custom.${flags.skills.custom.indexOf(skill)}`;
		} else {
			skill = flags.skills[id];
		}

		const bonuses =
			toggleable.filter(effect =>
				partition(effect, filter =>
					FILTERS.isCheck(filter) && (
						(filter.check === 'skill' && FILTERS.inCollection(filter, key))
						|| (FILTERS.isAbility(filter) && FILTERS.inCollection(filter, skill.ability)))))
				.flatMap(effect => effect.bonuses);

		if (bonuses.length) {
			skill.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
			skill.mod = skill.rollParts.reduce((acc, part) => acc + part.mod, 0);
			skill.passive = 10 + skill.mod + (skill.passiveBonus || 0);
			skill.passive += 5 * determineAdvantage(skill.roll, flags.skills.roll);
		}
	}

	for (let i = 0; i < flags.skills.tools.length; i++) {
		const tool = flags.skills.tools[i];
		const bonuses =
			toggleable.filter(effect =>
				partition(effect, filter =>
					FILTERS.isCheck(filter) && (
						(filter.check === 'tool' && FILTERS.inCollection(filter, `tool.${id}`))
						|| (FILTERS.isAbility(filter) && FILTERS.inCollection(filter, tool.ability)))))
				.flatMap(effect => effect.bonuses);

		if (bonuses.length) {
			tool.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
			tool.mod = tool.rollParts.reduce((acc, part) => acc + part.mod, 0);
		}
	}

	const initBonuses =
		toggleable.filter(effect =>
			partition(effect, filter =>
				FILTERS.isCheck(filter)
				&& (FILTERS.isInit(filter)
					|| (FILTERS.isAbility(filter)
						&& FILTERS.inCollection(filter, flags.attributes.init.ability)))))
			.flatMap(effect => effect.bonuses);

	if (initBonuses.length) {
		flags.attributes.init.rollParts.push(
			...initBonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
		data.attributes.init.mod +=
			flags.attributes.init.rollParts.reduce((acc, part) => acc + part.mod, 0);
	}
}

function bonusName (actorData, bonus) {
	if (bonus.name.length) {
		return bonus.name;
	}

	const effect = actorData.obsidian.effects.get(bonus.parentEffect);
	if (effect.name.length) {
		return effect.name;
	}

	const item = actorData.obsidian.itemsByID.get(effect.parentItem);
	return item.name;
}

function bonusToParts (actorData, bonus) {
	const parts = [];
	if (bonus.ndice !== 0) {
		parts.push({mod: 0, ndice: bonus.ndice, die: bonus.die});
	}

	if (bonus.bonus !== 0) {
		parts.push({mod: bonus.bonus, name: bonusName(actorData, bonus)});
	}

	if (!OBSIDIAN.notDefinedOrEmpty(bonus.prof)) {
		parts.push({
			mod: Math.floor(bonus.prof * actorData.data.attributes.prof),
			name: game.i18n.localize('OBSIDIAN.ProfAbbr')
		});
	}

	if (!OBSIDIAN.notDefinedOrEmpty(bonus.ability)) {
		parts.push({
			mod: actorData.data.abilities[bonus.ability].mod,
			name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${bonus.ability}`)
		});
	}

	if (!OBSIDIAN.notDefinedOrEmpty(bonus.level)) {
		let level;
		if (bonus.level === 'chr') {
			level = actorData.data.details.level.value;
		} else if (bonus.level === 'cls') {
			const cls = actorData.obsidian.classes.find(cls => cls._id === bonus.class);
			if (cls) {
				level = cls.flags.obsidian.level;
			}
		}

		if (level !== undefined) {
			parts.push({mod: level, name: bonusName(actorData, bonus)});
		}
	}

	return parts;
}
