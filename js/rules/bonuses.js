import {Filters} from './filters.js';
import {OBSIDIAN} from '../global.js';
import {Effect} from '../module/effect.js';

export function applyBonuses (actorData, data, flags, derived) {
	applySpeedBonuses(actorData, data, derived);
	applyInitBonuses(actorData, data, flags, derived);
	applyACBonuses(actorData, flags, derived);
	applyHPBonuses(actorData, data, derived);
	applySpellBonuses(actorData, derived);
}

function applyInitBonuses (actorData, data, flags, derived) {
	const bonuses =
		derived.filters.bonuses(Filters.appliesTo.initiative(flags.attributes.init.ability));

	if (bonuses.length && OBSIDIAN.notDefinedOrEmpty(flags.attributes.init.override)) {
		derived.attributes.init.rollParts.push(
			...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
		data.attributes.init.mod +=
			derived.attributes.init.rollParts.reduce((acc, part) => acc + part.mod, 0);
		data.attributes.init.mod = Math.floor(data.attributes.init.mod);
	}
}

function applyACBonuses (actorData, flags, derived) {
	const bonuses = derived.filters.bonuses(Filters.isAC);
	if (bonuses.length && OBSIDIAN.notDefinedOrEmpty(flags.attributes.ac.override)) {
		derived.attributes.ac +=
			bonuses.reduce((acc, bonus) =>
				acc + bonusToParts(actorData, bonus).reduce((acc, part) => acc + part.mod, 0), 0);

		derived.attributes.ac = Math.floor(derived.attributes.ac);
	}

	const multipliers = derived.filters.multipliers(Filters.isAC);
	if (multipliers.length) {
		derived.attributes.ac =
			Math.floor(
				derived.attributes.ac
				* multipliers.reduce((acc, mult) => acc * (mult.multiplier ?? 1), 1));
	}

	const setters = derived.filters.setters(Filters.isAC);
	if (setters.length && OBSIDIAN.notDefinedOrEmpty(flags.attributes.ac.override)) {
		const setter = Effect.combineSetters(setters);
		if (!setter.min || setter.score > derived.attributes.ac) {
			derived.attributes.ac = setter.score;
		}
	}
}

function applyHPBonuses (actorData, data, derived) {
	const bonuses = derived.filters.bonuses(Filters.isHP);
	if (bonuses.length) {
		data.attributes.hp.max +=
			bonuses.reduce((acc, bonus) =>
				acc + bonusToParts(actorData, bonus).reduce((acc, part) => acc + part.mod, 0), 0);

		data.attributes.hp.max = Math.floor(data.attributes.hp.max);
	}

	const multipliers = derived.filters.multipliers(Filters.isHP);
	if (multipliers.length) {
		data.attributes.hp.max =
			Math.floor(
				data.attributes.hp.max
				* multipliers.reduce((acc, mult) => acc * (mult.multiplier ?? 1), 1));
	}

	const setters = derived.filters.setters(Filters.isHP);
	if (setters.length) {
		const setter = Effect.combineSetters(setters);
		if (!setter.min || setter.score > data.attributes.hp.max) {
			data.attributes.hp.max = setter.score;
		}
	}
}

function applySpellBonuses (actorData, derived) {
	[['spellAttacks', 'attacks'], ['spellDCs', 'saves']].forEach(([filter, key]) => {
		const bonuses = derived.filters.bonuses(Filters.appliesTo[filter]);
		if (bonuses.length) {
			let total =
				bonuses.flatMap(bonus => bonusToParts(actorData, bonus))
					.reduce((acc, part) => acc + part.mod, 0);

			total = Math.floor(total);
			derived.spellcasting[key] = derived.spellcasting[key].map(val => val + total);
		}
	});

	const multipliers = derived.filters.multipliers(Filters.appliesTo.spellDCs);
	if (multipliers.length) {
		const total = multipliers.reduce((acc, mult) => acc * (mult.multiplier ?? 1), 1);
		derived.spellcasting.saves =
			derived.spellcasting.saves.map(save => Math.floor(save * total));
	}

	const setters = derived.filters.setters(Filters.appliesTo.spellDCs);
	if (setters.length) {
		const setter = Effect.combineSetters(setters);
		derived.spellcasting.saves = derived.spellcasting.saves.map(save => {
			if (!setter.min || setter.score > save) {
				return setter.score;
			}

			return save;
		});
	}
}

function applySpeedBonuses (actorData, data, derived) {
	if (actorData.type === 'vehicle') {
		return;
	}

	const inventory = derived.inventory;
	const encumbrance = game.settings.get('obsidian', 'encumbrance');

	for (const speed of OBSIDIAN.Rules.SPEEDS) {
		derived.attributes.speed[speed] = data.attributes.movement[speed];
		const bonuses = derived.filters.bonuses(Filters.appliesTo.speedScores(speed));

		if (bonuses.length) {
			derived.attributes.speed[speed] +=
				bonuses.reduce((acc, bonus) =>
					acc + bonusToParts(actorData, bonus)
						.reduce((acc, part) => acc + part.mod, 0), 0);

			derived.attributes.speed[speed] = Math.floor(derived.attributes.speed[speed]);
		}

		const multipliers = derived.filters.multipliers(Filters.appliesTo.speedScores(speed));
		if (multipliers.length) {
			derived.attributes.speed[speed] =
				Math.floor(
					derived.attributes.speed[speed]
					* multipliers.reduce((acc, mult) => acc * (mult.multiplier ?? 1), 1));
		}

		const setters = derived.filters.setters(Filters.appliesTo.speedScores(speed));
		if (setters.length) {
			const setter = Effect.combineSetters(setters);
			const spd = derived.attributes.speed;

			if (!setter.min || setter.score > spd[speed]) {
				spd[speed] = setter.score;
			}
		}

		if (encumbrance < 2 && inventory.overCapacity) {
			derived.attributes.speed[speed] = 0;
			continue;
		}

		if (encumbrance === 1) {
			if (inventory.heavilyEncumbered) {
				derived.attributes.speed[speed] -= 20;
			} else if (inventory.encumbered) {
				derived.attributes.speed[speed] -= 10;
			}
		}
	}
}

export function applyProfBonus (actorData) {
	const attr = actorData.data.attributes;
	const bonuses = actorData.obsidian.filters.bonuses(Filters.isProf);
	const setters = actorData.obsidian.filters.setters(Filters.isProf);
	const multipliers = actorData.obsidian.filters.multipliers(Filters.isProf);

	if (bonuses.length) {
		attr.prof =
			Math.floor(
				attr.prof +
				bonuses
					.flatMap(bonus => bonusToParts(actorData, bonus))
					.reduce((acc, part) => acc + part.mod, 0));
	}

	if (multipliers.length) {
		attr.prof =
			Math.floor(
				attr.prof * multipliers.reduce((acc, mult) => acc * (mult.multiplier ?? 1), 1));
	}

	if (setters.length) {
		const setter = Effect.combineSetters(setters);
		if (!setter.min || setter.score > attr.prof) {
			attr.prof = setter.score;
		}
	}
}

function bonusName (actorData, bonus) {
	if (bonus.name.length) {
		return bonus.name;
	}

	const effect = actorData.obsidian.effects.get(bonus.parentEffect);
	if (!effect) {
		return '';
	}

	if (effect.name.length) {
		return effect.name;
	}

	const item = actorData.obsidian.itemsByID.get(effect.parentItem);
	return item.name;
}

function getTokenActorDataSafe (ids) {
	// Try to avoid causing an infinite recursion loop of Actor.prepareData().
	if (ids.actor) {
		const actor = game.actors?.get(ids.actor);
		if (actor) {
			return actor.data;
		}
	} else {
		const scene = game.scenes.get(ids.scene);
		if (!scene) {
			return;
		}

		const tokenData = scene.getEmbeddedEntity('Token', ids.token);
		if (!tokenData) {
			return;
		}

		const actor = game.actors.get(tokenData.actorId);
		if (!actor) {
			return;
		}

		if (tokenData.actorLink) {
			return actor.data;
		}

		const cached = game.actors.tokens.get(tokenData._id);
		if (cached) {
			return cached.data;
		}

		return mergeObject(actor._data, tokenData.actorData, {inplace: false});
	}
}

export function bonusToParts (actorData, bonus) {
	let summoningItem;
	const effect = actorData.obsidian.effects.get(bonus.parentEffect);

	if (effect?.activeEffect) {
		const item = actorData.obsidian.itemsByID.get(effect.parentItem);
		if (item?.flags.obsidian?.duration) {
			const tokenActorData = getTokenActorDataSafe(item.flags.obsidian.duration);
			if (tokenActorData) {
				actorData = tokenActorData;
			}
		}
	}

	if ((!bonus.formula || bonus.method === 'formula')
		&& bonus.summoner && actorData.flags.obsidian?.summon)
	{
		const tokenActorData = getTokenActorDataSafe(actorData.flags.obsidian.summon);
		if (tokenActorData) {
			const component =
				tokenActorData.obsidian.components.get(
					actorData.flags.obsidian.summon.parentComponent);

			if (component) {
				const effect = tokenActorData.obsidian.effects.get(component.parentEffect);
				if (effect) {
					summoningItem = tokenActorData.obsidian.itemsByID.get(effect.parentItem);
				}
			}

			actorData = tokenActorData;
		}
	}

	let constant = 0;
	const parts = [];

	if (bonus.ndice !== 0 && (!bonus.formula || bonus.method === 'dice')) {
		const part = {mod: 0, ndice: bonus.ndice, die: bonus.die};
		parts.push(part);

		if (bonus.dmg?.enabled && bonus.dmg?.type !== 'wpn') {
			part.damage = bonus.dmg.type;
		}
	}

	if (bonus.formula && bonus.method === 'dice') {
		constant = bonus.bonus;
	}

	if (bonus.formula
		&& bonus.method === 'formula'
		&& bonus.constant !== 0
		&& bonus.operator === 'plus')
	{
		constant = bonus.constant;
	}

	if (constant !== 0) {
		parts.push({mod: constant, name: bonusName(actorData, bonus)});
	}

	let multiplier = 1;
	if (bonus.formula && bonus.method === 'formula' && bonus.operator === 'mult') {
		multiplier = bonus.constant || 0;
	}

	if (!bonus.formula && !OBSIDIAN.notDefinedOrEmpty(bonus.prof)) {
		parts.push({
			mod: Math.floor(bonus.prof * actorData.data.attributes.prof),
			name: game.i18n.localize('OBSIDIAN.ProfAbbr'),
			proficiency: true,
			value: Number(bonus.prof)
		});
	}

	if (bonus.formula && bonus.method === 'formula' && bonus.value === 'prof') {
		parts.push({
			mod: Math.floor(multiplier * actorData.data.attributes.prof),
			name: game.i18n.localize('OBSIDIAN.ProfAbbr'),
			proficiency: true,
			value: multiplier
		});
	}

	if (bonus.formula && bonus.method === 'formula' && bonus.value === 'abl') {
		let mod = 0;
		if (bonus.ability === 'spell' && summoningItem?.flags.obsidian?.source?.type === 'class') {
			const cls = actorData.obsidian.itemsByID.get(summoningItem.flags.obsidian.source.class);
			if (cls?.obsidian?.spellcasting?.enabled) {
				mod = cls.obsidian.spellcasting.mod;
			}
		} else if (bonus.ability !== 'spell') {
			mod = actorData.data.abilities[bonus.ability].mod;
		}

		parts.push({
			mod: Math.floor(multiplier * mod),
			name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${bonus.ability}`)
		});
	}

	if (!bonus.formula || bonus.method === 'formula') {
		const levelKey = bonus.formula ? bonus.value : bonus.level;
		if (['chr', 'cls'].includes(levelKey)) {
			let level;
			if (levelKey === 'chr') {
				level = actorData.data.details.level;
			} else if (levelKey === 'cls') {
				const cls = actorData.obsidian.itemsByID.get(bonus.class);
				if (cls) {
					level = cls.data.levels;
				}
			}

			if (level !== undefined) {
				parts.push({
					mod: Math.floor(multiplier * level),
					name: bonusName(actorData, bonus)
				});
			}
		}
	}

	return parts;
}

export function highestProficiency (parts) {
	const highest = parts.reduce((acc, part) =>
		part.proficiency && part.mod > acc.mod ? part : acc, {mod: -Infinity});

	const newParts = [];
	let hasProficiency = false;

	for (const part of parts) {
		if (!part.proficiency) {
			newParts.push(part);
			continue;
		}

		if (part.mod >= highest.mod && !hasProficiency) {
			newParts.push(part);
			hasProficiency = true;
		}
	}

	return newParts;
}
