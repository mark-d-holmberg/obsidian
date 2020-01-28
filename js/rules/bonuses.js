import {FILTERS} from './filters.js';
import {OBSIDIAN} from './rules.js';
import {Prepare} from './prepare.js';

export function applyBonuses (actorData) {
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
