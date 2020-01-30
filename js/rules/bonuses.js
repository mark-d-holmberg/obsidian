import {FILTERS} from './filters.js';
import {OBSIDIAN} from './rules.js';
import {determineAdvantage, Prepare} from './prepare.js';
import {Effect} from '../module/effect.js';

export function applyBonuses (actorData) {
	const data = actorData.data;
	const flags = actorData.flags.obsidian;
	const attacks = [];
	const damage = [];
	const saves = [];

	Array.from(actorData.obsidian.effects.values())
		.filter(effect => !effect.isScaling || effect.selfScaling)
		.flatMap(effect => effect.components)
		.forEach(c => {
			if (c.type === 'attack') {
				attacks.push(c);
			} else if (c.type === 'damage') {
				damage.push(c);
			} else if (c.type === 'save' && c.calc === 'formula') {
				saves.push(c);
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
		let attackPred = filter => !FILTERS.damage.isAttack(filter);
		const parentEffect = actorData.obsidian.effects.get(dmg.parentEffect);

		if (parentEffect) {
			const attack = parentEffect.components.find(c => c.type === 'attack');
			if (attack) {
				const key = attack.attack[0] + attack.category[0];
				attackPred = filter =>
					FILTERS.damage.isAttack(filter) && FILTERS.inCollection(filter, key);
			}
		}

		let damagePred = filter => FILTERS.damage.isDamage(filter) && filter.multi === 'any';
		if (!OBSIDIAN.notDefinedOrEmpty(dmg.damage)) {
			damagePred = filter =>
				FILTERS.damage.isDamage(filter) &&  FILTERS.inCollection(filter, dmg.damage);
		}

		const bonuses =
			toggleable.filter(effect =>
				partition(effect, filter =>
					FILTERS.isDamage(filter) && (attackPred(filter) || damagePred(filter))))
			.flatMap(effect => effect.bonuses);

		if (bonuses.length) {
			dmg.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
			dmg.mod = dmg.rollParts.reduce((acc, part) => acc + part.mod, 0);
			dmg.display = Prepare.damageFormat(dmg);
		}
	});

	saves.forEach(save => {
		let pred = filter => filter.multi === 'any';
		if (!OBSIDIAN.notDefinedOrEmpty(save.ability)) {
			pred = filter => FILTERS.inCollection(filter, save.ability);
		}

		const bonuses =
			toggleable.filter(effect =>
				partition(effect, filter => FILTERS.isDC(filter) && pred(filter)))
				.flatMap(effect => effect.bonuses);

		if (bonuses.length) {
			let bonus = 8;
			if (!OBSIDIAN.notDefinedOrEmpty(save.bonus)) {
				bonus = Number(save.bonus);
			}

			save.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
			save.value = bonus + save.rollParts.reduce((acc, part) => acc + part.mod, 0);
		}
	});

	for (const [id, abl] of Object.entries(data.abilities)) {
		if (OBSIDIAN.notDefinedOrEmpty(flags.saves[id].override)) {
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

		const scoreBonuses =
			toggleable.filter(effect =>
				partition(effect, filter =>
					FILTERS.isAbilityScore(filter) && FILTERS.inCollection(filter, id)))
				.flatMap(effect => effect.bonuses);

		if (scoreBonuses.length) {
			flags.abilities[id].value +=
				scoreBonuses.reduce((acc, bonus) =>
					acc + bonusToParts(actorData, bonus)
						.reduce((acc, part) => acc + part.mod, 0)
					, 0);
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

		if (!OBSIDIAN.notDefinedOrEmpty(skill.override)) {
			continue;
		}

		const bonuses =
			toggleable.filter(effect =>
				partition(effect, filter =>
					FILTERS.isCheck(filter) && (
						(filter.check === 'skill' && FILTERS.inCollection(filter, key))
						|| (FILTERS.isAbility(filter) && FILTERS.inCollection(filter, skill.ability)))))
				.flatMap(effect => effect.bonuses);

		const rollMods =
			toggleable.filter(effect => effect.toggle.active && effect.mods.length)
				.filter(effect => !effect.filters.length || effect.filters.some(filter =>
					FILTERS.isCheck(filter) && (
						(filter.check === 'skill' && FILTERS.inCollection(filter, key))
						|| (FILTERS.isAbility(filter) && FILTERS.inCollection(filter, skill.ability)))))
				.flatMap(effect => effect.mods);

		if (bonuses.length) {
			skill.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
			skill.mod = skill.rollParts.reduce((acc, part) => acc + part.mod, 0);
			skill.passive = 10 + skill.mod + (skill.passiveBonus || 0);
			skill.passive += 5 * determineAdvantage(skill.roll, flags.skills.roll);
		}

		if (rollMods.length) {
			const rollMod = Effect.combineRollMods(rollMods);
			skill.passive = 10 + skill.mod + (skill.passiveBonus || 0);
			skill.passive += 5 * determineAdvantage(skill.roll, flags.skills.roll, ...rollMod.mode);
		}

		const passiveBonuses =
			toggleable.filter(effect =>
				partition(effect, filter =>
					FILTERS.isPassive(filter) && FILTERS.inCollection(filter, key)))
				.flatMap(effect => effect.bonuses);

		if (passiveBonuses.length) {
			skill.passive +=
				passiveBonuses.reduce((acc, bonus) =>
					acc + bonusToParts(actorData, bonus)
						.reduce((acc, part) => acc + part.mod, 0), 0);
		}
	}

	for (let i = 0; i < flags.skills.tools.length; i++) {
		const tool = flags.skills.tools[i];
		if (!OBSIDIAN.notDefinedOrEmpty(tool.override)) {
			continue;
		}

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

	for (const speed of OBSIDIAN.Rules.SPEEDS) {
		if (!flags.attributes.speed[speed]) {
			flags.attributes.speed[speed] = {};
		}

		const bonuses =
			toggleable.filter(effect =>
				partition(effect, filter =>
					FILTERS.isSpeed(filter) && FILTERS.inCollection(filter, speed)))
				.flatMap(effect => effect.bonuses);

		if (bonuses.length) {
			flags.attributes.speed[speed].derived =
				(flags.attributes.speed[speed].override || 0)
				+ bonuses.reduce((acc, bonus) =>
					acc + bonusToParts(actorData, bonus)
						.reduce((acc, part) => acc + part.mod, 0), 0);
		} else {
			delete flags.attributes.speed[speed].derived;
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

	if (initBonuses.length && OBSIDIAN.notDefinedOrEmpty(flags.attributes.init.override)) {
		flags.attributes.init.rollParts.push(
			...initBonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
		data.attributes.init.mod +=
			flags.attributes.init.rollParts.reduce((acc, part) => acc + part.mod, 0);
	}

	const acBonuses =
		toggleable.filter(effect => partition(effect, FILTERS.isAC))
			.flatMap(effect => effect.bonuses);

	if (acBonuses.length && OBSIDIAN.notDefinedOrEmpty(flags.attributes.ac.override)) {
		data.attributes.ac.min +=
			acBonuses.reduce((acc, bonus) =>
				acc + bonusToParts(actorData, bonus).reduce((acc, part) => acc + part.mod, 0), 0);
	}

	const hpBonuses =
		toggleable.filter(effect => partition(effect, FILTERS.isHP))
			.flatMap(effect => effect.bonuses);

	if (hpBonuses.length) {
		data.attributes.hp.maxAdjusted +=
			hpBonuses.reduce((acc, bonus) =>
				acc + bonusToParts(actorData, bonus).reduce((acc, part) => acc + part.mod, 0), 0);
	}

	const spellAttackBonuses =
		toggleable.filter(effect =>
			partition(effect, filter =>
				FILTERS.isAttack(filter)
				&& filter.multi === 'some'
				&& filter.collection.every(item => item.key[1] === 's')))
			.flatMap(effect => effect.bonuses);

	if (spellAttackBonuses.length) {
		const total =
			spellAttackBonuses
				.flatMap(bonus => bonusToParts(actorData, bonus))
				.reduce((acc, part) => acc + part.mod, 0);

		flags.attributes.spellcasting.attacks =
			flags.attributes.spellcasting.attacks.map(attack => attack + total);
	}

	const spellDCBonuses =
		toggleable.filter(effect =>
			partition(effect, filter =>
				FILTERS.isDC(filter) && FILTERS.inCollection(filter, 'spell')))
			.flatMap(effect => effect.bonuses);

	if (spellDCBonuses.length) {
		const total =
			spellDCBonuses
				.flatMap(bonus => bonusToParts(actorData, bonus))
				.reduce((acc, part) => acc + part.mod, 0);

		flags.attributes.spellcasting.saves =
			flags.attributes.spellcasting.saves.map(save => save + total);
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
