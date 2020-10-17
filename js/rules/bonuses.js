import {Filters} from './filters.js';
import {OBSIDIAN} from '../global.js';
import {Effect} from '../module/effect.js';

export function applyBonuses (actorData, data, flags, derived) {
	for (const speed of OBSIDIAN.Rules.SPEEDS) {
		if (!flags.attributes.speed[speed]) {
			flags.attributes.speed[speed] = {};
		}

		const bonuses = derived.filters.bonuses(Filters.appliesTo.speedScores(speed));
		if (bonuses.length) {
			flags.attributes.speed[speed].derived =
				(flags.attributes.speed[speed].override || 0)
				+ bonuses.reduce((acc, bonus) =>
					acc + bonusToParts(actorData, bonus)
						.reduce((acc, part) => acc + part.mod, 0), 0);

			flags.attributes.speed[speed].derived =
				Math.floor(flags.attributes.speed[speed].derived);
		} else {
			delete flags.attributes.speed[speed].derived;
		}

		const setters = derived.filters.setters(Filters.appliesTo.speedScores(speed));
		if (setters.length) {
			const setter = Effect.combineSetters(setters);
			const spd = flags.attributes.speed[speed];
			const value = spd.derived || spd.override;

			if (!setter.min || setter.score > value) {
				spd.derived = setter.score;
			}
		}
	}

	const initBonuses =
		derived.filters.bonuses(Filters.appliesTo.initiative(flags.attributes.init.ability));

	if (initBonuses.length && OBSIDIAN.notDefinedOrEmpty(flags.attributes.init.override)) {
		derived.attributes.init.rollParts.push(
			...initBonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
		data.attributes.init.mod +=
			derived.attributes.init.rollParts.reduce((acc, part) => acc + part.mod, 0);
		data.attributes.init.mod = Math.floor(data.attributes.init.mod);
	}

	const acBonuses = derived.filters.bonuses(Filters.isAC);
	if (acBonuses.length && OBSIDIAN.notDefinedOrEmpty(flags.attributes.ac.override)) {
		derived.attributes.ac +=
			acBonuses.reduce((acc, bonus) =>
				acc + bonusToParts(actorData, bonus).reduce((acc, part) => acc + part.mod, 0), 0);

		derived.attributes.ac = Math.floor(derived.attributes.ac);
	}

	const acSetters = derived.filters.setters(Filters.isAC);
	if (acSetters.length && OBSIDIAN.notDefinedOrEmpty(flags.attributes.ac.override)) {
		const setter = Effect.combineSetters(acSetters);
		if (!setter.min || setter.score > derived.attributes.ac) {
			derived.attributes.ac = setter.score;
		}
	}

	const hpBonuses = derived.filters.bonuses(Filters.isHP);
	if (hpBonuses.length) {
		data.attributes.hp.max +=
			hpBonuses.reduce((acc, bonus) =>
				acc + bonusToParts(actorData, bonus).reduce((acc, part) => acc + part.mod, 0), 0);

		data.attributes.hp.max = Math.floor(data.attributes.hp.max);
	}

	const hpSetters = actorData.obsidian.filters.setters(Filters.isHP);
	if (hpSetters.length) {
		const setter = Effect.combineSetters(hpSetters);
		if (!setter.min || setter.score > data.attributes.hp.max) {
			data.attributes.hp.max = setter.score;
		}
	}

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

	const spellDCSetters = derived.filters.setters(Filters.appliesTo.spellDCs);
	if (spellDCSetters.length) {
		const setter = Effect.combineSetters(spellDCSetters);
		derived.spellcasting.saves = derived.spellcasting.saves.map(save => {
			if (!setter.min || setter.score > save) {
				return setter.score;
			}

			return save;
		});
	}
}

export function applyProfBonus (actorData) {
	const attr = actorData.data.attributes;
	const bonuses = actorData.obsidian.filters.bonuses(Filters.isProf);
	const setters = actorData.obsidian.filters.setters(Filters.isProf);

	if (bonuses.length) {
		attr.prof =
			Math.floor(
				attr.prof +
				bonuses
					.flatMap(bonus => bonusToParts(actorData, bonus))
					.reduce((acc, part) => acc + part.mod, 0));
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

function getTokenActorDataSafe (activeEffect) {
	// Try to avoid causing an infinite recursion loop of Actor.prepareData().
	const duration = activeEffect.flags.obsidian.duration;
	if (duration.actor) {
		const actor = game.actors?.get(duration.actor);
		if (actor) {
			return actor.data;
		}
	} else {
		const scene = game.scenes.get(duration.scene);
		if (!scene) {
			return;
		}

		const tokenData = scene.getEmbeddedEntity('Token', duration.token);
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

		return mergeObject(actor.data, tokenData.actorData, {inplace: false});
	}
}

export function bonusToParts (actorData, bonus) {
	const effect = actorData.obsidian.effects.get(bonus.parentEffect);
	if (effect && effect.activeEffect) {
		const item = actorData.obsidian.itemsByID.get(effect.parentItem);
		if (item) {
			const tokenActorData = getTokenActorDataSafe(item);
			if (tokenActorData) {
				actorData = tokenActorData;
			}
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
	if (bonus.operator === 'mult') {
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
		parts.push({
			mod: Math.floor(multiplier * actorData.data.abilities[bonus.ability].mod),
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
