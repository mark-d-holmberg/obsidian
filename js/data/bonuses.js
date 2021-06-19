import {Filters} from './filters.js';
import {OBSIDIAN} from '../global.js';
import {Effect} from '../module/effect.js';
import {ObsidianActor} from '../module/actor.js';

export function applyBonuses (actor, data, flags, derived) {
	applySpeedBonuses(actor, data, derived);
	applyInitBonuses(actor, data, flags, derived);
	applyACBonuses(actor, flags, data);
	applyHPBonuses(actor, data, derived);
	applySpellBonuses(actor, derived);
}

function applyInitBonuses (actor, data, flags, derived) {
	if (!OBSIDIAN.notDefinedOrEmpty(flags.attributes.init.override)) {
		return;
	}

	const bonuses =
		derived.filters.bonuses(Filters.appliesTo.initiative(flags.attributes.init.ability));

	if (bonuses.length) {
		derived.attributes.init.rollParts.push(
			...bonuses.flatMap(bonus => bonusToParts(actor, bonus)));
		data.attributes.init.mod +=
			derived.attributes.init.rollParts.reduce((acc, part) => acc + part.mod, 0);
		data.attributes.init.mod = Math.floor(data.attributes.init.mod);
	}
}

function applyACBonuses (actor, data, flags) {
	if (!OBSIDIAN.notDefinedOrEmpty(flags.attributes.ac.override)) {
		return;
	}

	const ac = data.attributes.ac;
	ac.value += Effect.applyBonuses(actor, Filters.isAC);
	ac.value = Effect.applyMultipliers(actor, Filters.isAC, ac.value);
	ac.value = Effect.applySetters(actor, Filters.isAC, ac.value);
}

function applyHPBonuses (actor, data, derived) {
	const hp = data.attributes.hp;
	hp.max += Effect.applyBonuses(actor, Filters.isHP);
	hp.max = Effect.applyMultipliers(actor, Filters.isHP, hp.max);
	hp.max = Effect.applySetters(actor, Filters.isHP, hp.max);

	if (derived.conditions.exhaustion > 3) {
		data.attributes.hp.max = Math.floor(data.attributes.hp.max / 2);
	}
}

function applySpellBonuses (actor, derived) {
	[['spellAttacks', 'attacks'], ['spellDCs', 'saves']].forEach(([filter, key]) => {
		const total = Effect.applyBonuses(actor, Filters.appliesTo[filter]);
		derived.spellcasting[key] = derived.spellcasting[key].map(val => val + total);
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

function applySpeedBonuses (actor, data, derived) {
	if (actor.type === 'vehicle') {
		return;
	}

	const actorData = actor.data;
	const conditions = derived.conditions;
	const exhaustion = conditions.exhaustion;

	for (const key of OBSIDIAN.Config.SPEEDS) {
		const speeds = data.attributes.movement;
		if (speeds[key] === null) {
			continue;
		}

		const filter = Filters.appliesTo.speedScores(key);
		speeds[key] += Effect.applyBonuses(actor, filter);
		speeds[key] = Effect.applyMultipliers(actor, filter, speeds[key]);
		speeds[key] = Effect.applySetters(actor, filter, speeds[key]);

		if (exhaustion > 4 || conditions.grappled || conditions.paralysed || conditions.petrified
			|| conditions.restrained || conditions.stunned || conditions.unconscious
			|| ObsidianActor.isRuleActive(actorData, 'overCapacity'))
		{
			speeds[key] = 0;
			continue;
		}

		if (exhaustion > 1) {
			speeds[key] = Math.floor(speeds[key] / 2);
		}

		if (ObsidianActor.isRuleActive(actorData, 'heavyArmour')) {
			speeds[key] -= 10;
		}

		if (ObsidianActor.isRuleActive(actorData, 'heavilyEncumbered')) {
			speeds[key] -= 20;
		} else if (ObsidianActor.isRuleActive(actorData, 'encumbered')) {
			speeds[key] -= 10;
		}
	}
}

export function applyProfBonus (actor) {
	const actorData = actor.data;
	const attr = actorData.data.attributes;

	attr.prof += Effect.applyBonuses(actor, Filters.isProf);
	attr.prof = Effect.applyMultipliers(actor, Filters.isProf, attr.prof);
	attr.prof = Effect.applySetters(actor, Filters.isProf, attr.prof);
}

function bonusName (actorData, bonus) {
	if (bonus.name?.length) {
		return bonus.name;
	}

	const effect = actorData.obsidian.effects.get(bonus.parentEffect);
	if (!effect) {
		return '';
	}

	if (effect.name.length) {
		return effect.name;
	}

	const item = actorData.items.get(effect.parentItem);
	return item.name;
}

function getTokenActorDataSafe (uuid) {
	// Try to avoid causing an infinite recursion loop of Actor.prepareData().
	const parts = uuid.split('.');
	if (parts[0] === 'Actor') {
		const actor = game.actors?.get(parts[1]);
		if (actor) {
			return actor.data;
		}
	} else {
		const scene = game.scenes.get(parts[1]);
		if (!scene) {
			return;
		}

		const token = scene.tokens.get(parts[3]);
		if (!token) {
			return;
		}

		const actor = game.actors.get(token.data.actorId);
		if (!actor) {
			return;
		}

		if (token.data.actorLink) {
			return actor.data;
		}

		const cached = game.actors.tokens[token.id];
		if (cached) {
			return cached.data;
		}

		const merged = mergeObject(actor.toObject(false), token.toObject(false), {inplace: false});
		return new Actor.implementation.schema(merged);
	}
}

export function bonusToParts (actor, bonus) {
	let summoningItem;
	let actorData = actor.data;
	const effect = actor.obsidian.effects.get(bonus.parentEffect);

	if (effect?.activeEffect) {
		const item = actor.items.get(effect.parentItem);
		if (item?.data.flags.obsidian?.duration) {
			const tokenActorData = getTokenActorDataSafe(item.data.flags.obsidian.duration.uuid);
			if (tokenActorData) {
				actorData = tokenActorData;
			}
		}
	}

	if ((!bonus.formula || bonus.method === 'formula')
		&& bonus.summoner && actorData.flags.obsidian?.summon)
	{
		const tokenActorData = getTokenActorDataSafe(actorData.flags.obsidian.summon.summoner);
		if (tokenActorData) {
			const component =
				tokenActorData.obsidian.components.get(
					actorData.flags.obsidian.summon.parentComponent);

			if (component) {
				const effect = tokenActorData.obsidian.effects.get(component.parentEffect);
				if (effect) {
					summoningItem = tokenActorData.items.get(effect.parentItem);
				}
			}

			actorData = tokenActorData;
		}
	}

	// Is this an actual bonus component or has it been tacked onto a different
	// component?
	const isComponent = bonus.formula;
	const prof = actorData.data.attributes.prof;
	const summoningItemSource = summoningItem?.getFlag('obsidian', 'source');
	const parts = [];

	const createConstantPart = mod => parts.push({mod, name: bonusName(actorData, bonus)});

	const createAbilityPart = (multiplier, constant) => {
		let mod = 0;
		if (bonus.ability === 'spell' && summoningItemSource?.type === 'class') {
			const cls = actorData.items.get(summoningItemSource.class);
			if (cls?.obsidian?.spellcasting?.enabled) {
				mod = cls.obsidian.spellcasting.mod;
			}
		} else if (bonus.ability !== 'spell') {
			mod = actorData.data.abilities[bonus.ability].mod;
		}

		parts.push({
			mod: Math.floor(multiplier * mod + constant),
			name:
				bonus.name.length
					? bonus.name
					: game.i18n.localize(`OBSIDIAN.AbilityAbbr.${bonus.ability}`)
		});
	};

	const createProfPart = (mod, value, name) =>
		parts.push({
			value,
			proficiency: true,
			mod: Math.floor(mod),
			name: name?.length ? name : game.i18n.localize('OBSIDIAN.ProfAbbr')
		});

	const createDicePart = (mod = 0) => {
		const part = {mod, ndice: bonus.ndice, die: bonus.die, name: bonusName(actorData, bonus)};
		if (bonus.dmg?.enabled && bonus.dmg?.type !== 'wpn') {
			part.damage = bonus.dmg.type;
		}

		parts.push(part);
	};

	const createLevelPart = (key, multiplier = 1, constant = 0) => {
		let level;
		if (key === 'chr') {
			level = actorData.data.details.level;
		} else if (key === 'cls') {
			const cls = actor.items.get(bonus.class);
			level = cls?.data.data.levels;
		}

		if (level) {
			parts.push({
				mod: Math.floor(multiplier * level + constant),
				name: bonusName(actorData, bonus)
			});
		}
	};

	if (isComponent) {
		if (bonus.method === 'dice') {
			createDicePart(bonus.bonus || 0);
		} else if (bonus.method === 'formula') {
			let constant = 0;
			let multiplier = 1;

			if (bonus.operator === 'plus') {
				constant = bonus.constant || 0;
			} else if (bonus.operator === 'mult') {
				multiplier = bonus.constant || 0;
			}

			if (bonus.value === 'prof') {
				createProfPart(multiplier * prof + constant, multiplier, bonus.name);
			} else if (bonus.value === 'abl') {
				createAbilityPart(multiplier, constant);
			} else if (['chr', 'cls'].includes(bonus.value)) {
				createLevelPart(bonus.value, multiplier, constant);
			} else if (constant) {
				createConstantPart(constant);
			}
		}
	} else {
		if (bonus.ndice) {
			createDicePart();
		}

		if (!OBSIDIAN.notDefinedOrEmpty(bonus.prof)) {
			createProfPart(bonus.prof * prof, Number(bonus.prof));
		}

		if (!OBSIDIAN.notDefinedOrEmpty(bonus.level)) {
			createLevelPart(bonus.level);
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
