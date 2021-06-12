import {OBSIDIAN} from '../global.js';
import {Filters} from './filters.js';
import {bonusToParts, highestProficiency} from './bonuses.js';
import {Effect} from '../module/effect.js';
import {Config} from './config.js';
import {conditionsRollMod} from '../module/conditions.js';

const ops = {
	plus: (a, b) => a + b,
	mult: (a, b) => a * b
};

/**
 * Determines whether a given roll has advantage, disadvantage, or neither,
 * depending on all the modifiers applied to the roll.
 * @param mods An array of strings with values of 'adv', 'dis', or 'reg'.
 * @return {number} Returns 1 for advantage, -1 for disadvantage, and 0 for
 *                  neither.
 */
export function determineAdvantage (...mods) {
	let hasAdvantage = mods.some(mod => mod === 'adv');
	let hasDisadvantage = mods.some(mod => mod === 'dis');

	if (hasAdvantage && hasDisadvantage) {
		return 0;
	}

	if (hasAdvantage) {
		return 1;
	}

	if (hasDisadvantage) {
		return -1;
	}

	return 0;
}

export function determineMode (...mods) {
	const adv = determineAdvantage(...mods);
	return adv > 0 ? 'adv' : adv === 0 ? 'reg' : 'dis';
}

export const Prepare = {
	spellPart: function (component, data, cls) {
		if (!OBSIDIAN.notDefinedOrEmpty(component.ability) && data) {
			let mod;
			let i18n;

			if (component.ability === 'spell') {
				component.spellMod = 0;
				if (cls?.obsidian?.spellcasting != null) {
					component.spellMod = cls.obsidian.spellcasting.mod;
				} else if (!OBSIDIAN.notDefinedOrEmpty(data.attributes.spellcasting)) {
					component.spellMod = data.abilities[data.attributes.spellcasting].mod;
				}

				mod = component.spellMod;
				i18n = 'OBSIDIAN.Spell';
			} else {
				mod = data.abilities[component.ability].mod;
				i18n = `OBSIDIAN.AbilityAbbr.${component.ability}`;
			}

			component.rollParts.push({mod: mod, name: game.i18n.localize(i18n)});
		}
	},

	calculateDC: function (actor, item, component, cls, pred) {
		const actorData = actor?.data;
		const data = actorData?.data;

		if (component.calc === 'fixed') {
			component.value = component.fixed;
			return;
		}

		let bonus = 8;
		if (!OBSIDIAN.notDefinedOrEmpty(component.bonus)) {
			bonus = Number(component.bonus);
		}

		component.rollParts = [{
			mod: component.prof * (data?.attributes.prof || 0),
			name: game.i18n.localize('OBSIDIAN.ProfAbbr'),
			proficiency: true,
			value: Number(component.prof)
		}];

		component.spellMod = 0;
		if (item.getFlag('obsidian', 'parentComponent')) {
			const provider =
				actorData?.obsidian?.components.get(item.data.flags.obsidian.parentComponent);

			if (provider && provider.method === 'innate') {
				component.spellMod = data.abilities[provider.ability].mod;
				component.rollParts.push({
					mod: component.spellMod,
					name: game.i18n.localize('OBSIDIAN.Spell')
				});
			} else {
				Prepare.spellPart(component, data, cls);
			}
		} else {
			Prepare.spellPart(component, data, cls);
		}

		const bonuses = actorData?.obsidian?.filters.bonuses(pred(component)) || [];
		if (bonuses.length) {
			component.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actor, bonus)));
		}

		component.value =
			Math.floor(bonus + component.rollParts.reduce((acc, part) => acc + part.mod, 0));

		const multipliers = actorData?.obsidian?.filters.multipliers(pred(component)) || [];
		if (multipliers.length) {
			component.value =
				Math.floor(
					component.value
					* multipliers.reduce((acc, mult) => acc * (mult.multiplier ?? 1), 1));
		}

		const setters = actorData?.obsidian?.filters.setters(pred(component)) || [];
		if (setters.length) {
			const setter = Effect.combineSetters(setters);
			if (!setter.min || setter.score > component.value) {
				component.value = setter.score;
			}
		}
	},

	calculateHit: function (actor, item, hit, cls) {
		const actorData = actor?.data;
		const data = actorData?.data;

		hit.rollParts = [{
			mod: (hit.bonus || 0) + weaponBonus(actor, item),
			name: game.i18n.localize('OBSIDIAN.Bonus')
		}];

		hit.spellMod = 0;
		hit.targets = 1;
		Prepare.spellPart(hit, data, cls);

		if (hit.proficient) {
			hit.rollParts.push({
				mod: data?.attributes.prof || 0,
				name: game.i18n.localize('OBSIDIAN.ProfAbbr'),
				proficiency: true,
				value: 1
			});
		}

		const bonuses = actor?.obsidian?.filters.bonuses(Filters.appliesTo.attackRolls(hit)) || [];
		if (bonuses.length) {
			hit.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actor, bonus)));
		}

		if (hit.extraBonus) {
			hit.rollParts.push(...bonusToParts(actor, hit.extraBonus));
		}

		hit.rollParts = highestProficiency(hit.rollParts);
		hit.value = hit.rollParts.reduce((acc, part) => acc + part.mod, 0);
		hit.attackType =
			game.i18n.localize(
				`OBSIDIAN.${hit.attack.capitalize()}${hit.category.capitalize()}Attack`);
	},

	calculateDamage: function (actor, item, dmg, cls) {
		const actorData = actor?.data;
		const data = actorData?.data;

		dmg.rollParts = [{
			mod: dmg.bonus || 0,
			name: game.i18n.localize('OBSIDIAN.Bonus'),
			constant: true
		}, {
			mod: weaponBonus(actor, item),
			name: game.i18n.localize('OBSIDIAN.Magic')
		}];

		Prepare.spellPart(dmg, data, cls);

		if (actor?.obsidian) {
			const bonuses = Effect.filterDamage(actorData, actorData.obsidian.filters.bonuses, dmg);
			if (bonuses.length) {
				dmg.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actor, bonus)));
			}
		}

		if (dmg.extraBonus) {
			dmg.rollParts.push(...bonusToParts(actor, dmg.extraBonus));
		}

		dmg.mod = dmg.rollParts.reduce((acc, part) => acc + part.mod, 0);
		dmg.derived = {ncrit: dmg.ndice, ndice: dmg.ndice};
		dmg.display = Prepare.damageFormat(dmg);

		if (!OBSIDIAN.notDefinedOrEmpty(dmg.ncrit)) {
			dmg.derived.ncrit = Number(dmg.ncrit);
		}
	},

	calculateResources: function (actor, item, effect, resource) {
		const actorData = actor?.data;
		const data = actorData?.data;

		if (resource.calc === 'fixed') {
			resource.max = resource.fixed;
		} else if (actorData) {
			const op = ops[resource.operator];
			if (resource.key === 'abl') {
				resource.max = op(resource.bonus, data.abilities[resource.ability].mod);
			} else if (resource.key === 'chr') {
				resource.max = op(resource.bonus, data.details.level);
			} else if (resource.key === 'cls' && actorData.obsidian) {
				const cls = actor.items.get(resource.class);
				if (cls) {
					resource.max = op(resource.bonus, cls.data.data.levels);
				}
			} else if (resource.key === 'prof') {
				resource.max = op(resource.bonus, data.attributes.prof);
			}

			resource.max = Math.max(resource.min, resource.max);
		}

		if (resource.remaining === undefined) {
			resource.remaining = resource.max;
		} else if (resource.remaining < 0) {
			resource.remaining = 0;
		}

		resource.display = Prepare.usesFormat(item, effect, resource, 6);
	},

	calculateAttackType: function (flags, atk) {
		if (atk.category === 'spell' || flags.category === undefined) {
			atk.attackType =
				`OBSIDIAN.${atk.attack.capitalize()}${atk.category.capitalize()}Attack`;
			return;
		}

		atk.attackType = 'OBSIDIAN.MeleeWeaponAttack';
		if (flags.category === 'unarmed') {
			atk.mode = 'unarmed';
		} else if (flags.type === 'ranged') {
			atk.mode = 'ranged';
		} else if (!atk.mode
			|| (atk.mode === 'versatile' && !flags.tags.versatile)
			|| (atk.mode === 'ranged' && !flags.tags.thrown))
		{
			atk.mode = 'melee'
		}

		if (atk.mode === 'ranged') {
			atk.attackType = 'OBSIDIAN.RangedWeaponAttack';
		}
	},

	calculateSkill: function (data, flags, skill, original) {
		let prof = skill.value;
		if (prof === 0 && flags.skills.joat) {
			prof = .5;
		}

		if (prof > 0.5 && original && original.value > prof) {
			prof = original.value;
		}

		if (OBSIDIAN.notDefinedOrEmpty(skill.override)) {
			skill.rollParts = [{
				mod: Math.floor(data.attributes.prof * prof),
				name: game.i18n.localize('OBSIDIAN.ProfAbbr'),
				proficiency: true,
				value: Number(prof)
			}, {
				mod: data.abilities[skill.ability].mod,
				name: game.i18n.localize(`OBSIDIAN.AbilityAbbr.${skill.ability}`)
			}, {
				mod: (flags.skills.bonus || 0) + (skill.bonus || 0),
				name: game.i18n.localize('OBSIDIAN.Bonus')
			}];
		} else {
			skill.rollParts = [{
				mod: Number(skill.override),
				name: game.i18n.localize('OBSIDIAN.Override')
			}];
		}
	},

	damageFormat: function (dmg, mod = true) {
		if (dmg === undefined) {
			return;
		}

		let out = '';
		const ndice = dmg.derived.ndice;

		if (ndice > 0 && dmg.calc === 'formula') {
			out += `${ndice}d${dmg.die}`;
		}

		if (dmg.mod !== 0 && mod) {
			if (ndice > 0 && dmg.calc === 'formula' && dmg.mod > 0) {
				out += '+';
			}

			out += dmg.mod;
		}

		if (out.length < 1) {
			out = '0';
		}

		return out;
	},

	ac: function (data, flags, derived) {
		derived.attributes.ac =
			flags.attributes.ac.base
			+ data.abilities[flags.attributes.ac.ability1].mod
			+ (flags.attributes.ac.ability2 ? data.abilities[flags.attributes.ac.ability2].mod : 0);

		if (!OBSIDIAN.notDefinedOrEmpty(flags.attributes.ac.override)) {
			derived.attributes.ac = Number(flags.attributes.ac.override);
		}
	},

	abilities: function (actor, data, flags, derived) {
		derived.abilities = {};
		for (const [id, ability] of Object.entries(data.abilities)) {
			derived.abilities[id] = {rollParts: [], value: ability.value};
			const abilityBonuses = derived.filters.bonuses(Filters.appliesTo.abilityChecks(id));

			if (abilityBonuses.length) {
				derived.abilities[id].rollParts.push(
					...abilityBonuses.flatMap(bonus => bonusToParts(actor, bonus)));
			}

			const scoreBonuses = derived.filters.bonuses(Filters.appliesTo.abilityScores(id));
			if (scoreBonuses.length) {
				derived.abilities[id].value +=
					scoreBonuses.reduce((acc, bonus) =>
						acc + bonusToParts(actor, bonus)
							.reduce((acc, part) => acc + part.mod, 0), 0);

				derived.abilities[id].value = Math.floor(derived.abilities[id].value);
			}

			const multipliers = derived.filters.multipliers(Filters.appliesTo.abilityScores(id));
			if (multipliers.length) {
				derived.abilities[id].value =
					Math.floor(
						derived.abilities[id].value
						* multipliers.reduce((acc, mult) => acc * (mult.multiplier ?? 1), 1));
			}

			const abilitySetters = derived.filters.setters(Filters.appliesTo.abilityScores(id));
			if (abilitySetters.length) {
				const setter = Effect.combineSetters(abilitySetters);
				if (!setter.min || setter.score > ability.value) {
					derived.abilities[id].value = setter.score;
				}
			}

			ability.mod = Math.floor((derived.abilities[id].value - 10) / 2);
		}
	},

	armour: function (data, flags, derived) {
		derived.rules.heavyArmour = false;
		derived.rules.noisyArmour = false;
		derived.armour =
			derived.itemsByType.get('equipment').filter(item => item.data.flags.obsidian?.armour);

		let bestArmour;
		let bestShield;

		for (const armour of derived.armour) {
			const armourData = armour.data.data;
			const baseAC = armourData.armor.value;

			if (armourData.armor.type === 'shield') {
				if (armourData.equipped
					&& (!bestShield || bestShield.data.data.armor.value < baseAC))
				{
					bestShield = armour;
				}
			} else {
				if (armourData.equipped
					&& (!bestArmour || bestArmour.data.data.armor.value < baseAC))
				{
					bestArmour = armour;
				}
			}
		}

		const acOverride = flags.attributes.ac.override;
		const armourDisplay = [];

		if (bestArmour) {
			if (!OBSIDIAN.notDefinedOrEmpty(bestArmour.data.data.strength)) {
				derived.rules.heavyArmour =
					derived.abilities.str.value < bestArmour.data.data.strength;
			}

			derived.rules.noisyArmour = bestArmour.data.data.stealth;
		}

		if (OBSIDIAN.notDefinedOrEmpty(acOverride)) {
			if (bestArmour) {
				armourDisplay.push(bestArmour.name.toLocaleLowerCase());
				derived.attributes.ac = bestArmour.data.data.armor.value;

				if (bestArmour.data.flags.obsidian.addDex) {
					let maxDex = bestArmour.data.data.armor.dex;
					if (OBSIDIAN.notDefinedOrEmpty(maxDex)) {
						maxDex = Infinity;
					} else {
						maxDex = Number(maxDex);
					}

					derived.attributes.ac += Math.min(data.abilities.dex.mod, maxDex);
				}
			}

			if (bestShield) {
				armourDisplay.push(bestShield.name.toLocaleLowerCase());
				derived.attributes.ac += bestShield.data.data.armor.value;
			}
		}

		derived.armourDisplay = armourDisplay.join(', ');
		data.attributes.ac.value = derived.attributes.ac;
	},

	conditions: function (actor, data, flags, derived) {
		const actorData = actor.data;
		const conditionImmunities = new Set(derived.defenses.parts.conditions.imm);
		derived.conditions = {exhaustion: 0};
		actor.effects.forEach(effect => {
			const id = effect.getFlag('core', 'statusId');
			if (!id) {
				return;
			}

			if (id.startsWith('exhaust')) {
				const level = Number(id.substr(7));
				if (level > derived.conditions.exhaustion) {
					derived.conditions.exhaustion = level;
				}

				return;
			}

			derived.conditions[id] = !conditionImmunities.has(id);
		});

		derived.filters.conditions.filter(component => component.temp).forEach(component => {
			if (component.condition === 'exhaustion') {
				derived.conditions.exhaustion++;
				if (derived.conditions.exhaustion > 6) {
					derived.conditions.exhaustion = 6;
				}
			} else {
				derived.conditions[component.condition] =
					!conditionImmunities.has(component.condition);
			}
		});

		if (conditionImmunities.has('exhaustion')) {
			derived.conditions.exhaustion = 0;
		}

		const conditionDefense = derived.defenses.parts.conditions;
		const damageDefense = derived.defenses.parts.damage;

		if (derived.conditions.petrified) {
			conditionDefense.imm.push('disease');
			conditionDefense.imm.push('poisoned');
			damageDefense.res.push(...Config.DAMAGE_TYPES.map(dmg => {
				return {dmg, level: 'res', magic: '', material: ''};
			}));
		}

		derived.conditions.concentrating =
			actorData.effects
				.filter(item => getProperty(item, 'flags.obsidian.ref'))
				.map(duration => derived.effects.get(duration.flags.obsidian.ref))
				.some(effect => effect && Effect.isConcentration(actor, effect));
	},

	encumbrance: function (actor, data, derived) {
		const rules = derived.rules;
		const inventory = derived.inventory;
		const str = derived.abilities.str.value;
		const thresholds = Config.ENCUMBRANCE_THRESHOLDS;
		const encumbrance = game.settings.get('obsidian', 'encumbrance');
		const sizeMod = Config.ENCUMBRANCE_SIZE_MOD[data.traits.size] || 1;
		const bonuses = derived.filters.bonuses(Filters.isCarry);
		const setters = derived.filters.setters(Filters.isCarry);
		const multipliers = derived.filters.multipliers(Filters.isCarry);
		inventory.max = str * sizeMod * CONFIG.DND5E.encumbrance.strMultiplier;

		if (bonuses.length) {
			inventory.max +=
				bonuses.flatMap(bonus => bonusToParts(actor, bonus))
					.reduce((acc, part) => acc + part.mod, 0);
		}

		if (multipliers.length) {
			inventory.max *= multipliers.reduce((acc, mult) => acc * (mult.multiplier ?? 1), 1);
		}

		if (setters.length) {
			const setter = Effect.combineSetters(setters);
			if (!setter.min || setter.score > inventory.max) {
				inventory.max = setter.score;
			}
		}

		rules.encumbered = false;
		rules.heavilyEncumbered = false;
		rules.overCapacity = encumbrance < 2 && inventory.weight >= inventory.max;

		if (encumbrance === 1) {
			rules.encumbered = inventory.weight >= str * thresholds.encumbered;
			rules.heavilyEncumbered = inventory.weight >= str * thresholds.heavy;
		}
	},

	hd: function (flags, derived) {
		const classHD = {};
		const existingHD = flags.attributes.hd;

		for (const cls of derived.classes) {
			const die = cls.data.data.hitDice;
			let hd = classHD[die] || 0;
			hd += cls.data.data.levels;
			classHD[die] = hd;
		}

		for (const [die, hd] of Object.entries(existingHD)) {
			if (!OBSIDIAN.notDefinedOrEmpty(hd.override)) {
				hd.override = Number(hd.override);
			}

			if (!classHD[die]) {
				hd.max = 0;
			}
		}

		for (const [die, hd] of Object.entries(classHD)) {
			let existing = existingHD[die];
			if (existing === undefined) {
				existing = {value: hd, max: hd};
				existingHD[die] = existing;
			} else {
				existing.max = hd;
			}
		}
	},

	init: function (data, flags, derived) {
		derived.attributes.init.rollParts = [];
		data.attributes.init.mod =
			data.abilities[flags.attributes.init.ability].mod
			+ data.attributes.init.value;

		if (flags.skills.joat) {
			data.attributes.init.mod += Math.floor(data.attributes.prof / 2);
		}

		if (!OBSIDIAN.notDefinedOrEmpty(flags.attributes.init.override)) {
			data.attributes.init.mod = Number(flags.attributes.init.override);
		}
	},

	saves: function (actor, data, flags, derived, originalSaves) {
		derived.saves = {};
		for (const [id, ability] of Object.entries(data.abilities)) {
			const save = {};
			derived.saves[id] = save;

			if (!flags.saves[id]) {
				flags.saves[id] = {};
			}

			let original;
			if (originalSaves) {
				original = originalSaves[id];
			}

			if (OBSIDIAN.notDefinedOrEmpty(flags.saves[id].override)) {
				save.rollParts = [{
					mod: ability.proficient * data.attributes.prof,
					name: game.i18n.localize('OBSIDIAN.ProfAbbr'),
					proficiency: true,
					value: Number(ability.proficient)
				}, {
					mod: data.abilities[id].mod,
					name: game.i18n.localize(`OBSIDIAN.AbilityAbbr.${id}`)
				}, {
					mod: (flags.saves.bonus || 0) + (flags.saves[id].bonus || 0),
					name: game.i18n.localize('OBSIDIAN.Bonus')
				}];

				const saveBonuses = derived.filters.bonuses(Filters.appliesTo.savingThrows(id));
				if (saveBonuses.length) {
					save.rollParts.push(
						...saveBonuses.flatMap(bonus => bonusToParts(actor, bonus)));
					save.rollParts = highestProficiency(save.rollParts);
				}

				save.proficiency = save.rollParts.find(part => part.proficiency);
			} else {
				save.rollParts = [{
					mod: Number(flags.saves[id].override),
					name: game.i18n.localize('OBSIDIAN.Override')
				}];
			}

			save.proficient = save.proficiency?.value || 0;
			save.save = Math.floor(save.rollParts.reduce((acc, part) => acc + part.mod, 0));

			if (save.proficient > 0 && original && original.save > save.save) {
				save.save = original.save;
			}
		}
	},

	skills: function (actor, data, flags, derived, originalSkills) {
		derived.skills = {};
		for (let [id, skill] of
			Object.entries(data.skills).concat(Object.entries(flags.skills.custom)))
		{
			const custom = !isNaN(Number(id));
			if (!custom) {
				flags.skills[id] = mergeObject(skill, flags.skills[id] || {}, {inplace: false});
				skill = flags.skills[id];
				skill.label = game.i18n.localize(`OBSIDIAN.Skill.${id}`);
			}

			let original;
			const key = custom ? `custom.${id}` : id;

			if (originalSkills) {
				original = originalSkills[key];
			}

			derived.skills[key] = duplicate(skill);
			skill = derived.skills[key];
			Prepare.calculateSkill(data, flags, skill, original);

			if (OBSIDIAN.notDefinedOrEmpty(skill.override)) {
				const bonuses =
					derived.filters.bonuses(Filters.appliesTo.skillChecks(key, skill.ability));

				if (bonuses.length) {
					skill.rollParts.push(
						...bonuses.flatMap(bonus => bonusToParts(actor, bonus)));
					skill.rollParts = highestProficiency(skill.rollParts);
				}
			}

			const rollMods =
				derived.filters.mods(Filters.appliesTo.skillChecks(key, skill.ability));

			const rollMod =
				Effect.combineRollMods(
					rollMods.concat(
						conditionsRollMod(actor, {ability: skill.ability, skill: key})));

			skill.mod = Math.floor(skill.rollParts.reduce((acc, part) => acc + part.mod, 0));
			if (skill.rollParts.find(p => p.proficiency)?.value > 0.5
				&& original && original.mod > skill.mod)
			{
				skill.mod = original.mod;
			}

			skill.key = key;
			skill.passive = 10 + skill.mod + (skill.passiveBonus || 0);
			skill.passive += 5 * determineAdvantage(skill.roll, flags.skills.roll, ...rollMod.mode);
			skill.proficiency = skill.rollParts.find(part => part.proficiency);

			const passiveBonuses = derived.filters.bonuses(Filters.appliesTo.passiveScores(key));
			if (passiveBonuses.length) {
				skill.passive +=
					passiveBonuses.reduce((acc, bonus) =>
						acc + bonusToParts(actor, bonus)
							.reduce((acc, part) => acc + part.mod, 0), 0);

				skill.passive = Math.floor(skill.passive);
			}

			const multipliers = derived.filters.multipliers(Filters.appliesTo.passiveScores(key));
			if (multipliers.length) {
				skill.passive =
					Math.floor(
						skill.passive
						* multipliers.reduce((acc, mult) => acc * (mult.multiplier ?? 1), 1));
			}

			const passiveSetters = derived.filters.setters(Filters.appliesTo.passiveScores(key));
			if (passiveSetters.length) {
				const setter = Effect.combineSetters(passiveSetters);
				if (!setter.min || setter.score > skill.passive) {
					skill.passive = setter.score;
				}
			}
		}
	},

	tools: function (actor, data, flags, derived) {
		derived.tools = {};
		const tools = Config.ALL_TOOLS.map(t => {
			const tool = mergeObject(
				{ability: 'str', bonus: 0, value: 0, label: '', enabled: false},
				flags.tools[t] || {});

			flags.tools[t] = tool;
			return [t, tool];
		});

		for (let [id, tool] of tools.concat(Object.entries(flags.tools.custom))) {
			const custom = !isNaN(Number(id));
			const key = custom ? `custom.${id}` : id;

			derived.tools[key] = duplicate(tool);
			tool = derived.tools[key];

			if (custom) {
				tool.enabled = true;
			} else {
				tool.label = game.i18n.localize(`OBSIDIAN.ToolProf.${id}`);
			}

			Prepare.calculateSkill(data, flags, tool);

			if (OBSIDIAN.notDefinedOrEmpty(tool.override)) {
				const bonuses =
					derived.filters.bonuses(Filters.appliesTo.toolChecks(key, tool.ability));

				if (bonuses.length) {
					tool.rollParts.push(
						...bonuses.flatMap(bonus => bonusToParts(actor, bonus)));
					tool.rollParts = highestProficiency(tool.rollParts);
				}
			}

			tool.key = key;
			tool.mod = tool.rollParts.reduce((acc, part) => acc + part.mod, 0);
			tool.proficiency = tool.rollParts.find(part => part.proficiency);
		}
	},

	usesFormat: function (item, effect, resource, threshold = 10) {
		if (resource.max === undefined || resource.max < 0) {
			return '';
		}

		const max = Math.max(resource.max, resource.remaining);
		let used = max - resource.remaining;

		if (used < 0) {
			used = 0;
		}

		let out = `<div class="obsidian-feature-uses" data-uuid="${resource.uuid}">`;
		if (max <= threshold) {
			for (let i = 0; i < max; i++) {
				out += `
					<div class="obsidian-feature-use
                         ${i < used ? 'obsidian-feature-used' : ''}
                         ${max - i > resource.max ? 'obsidian-feature-positive' : ''}"
					     data-n="${i + 1}">&times;</div>
				`;
			}
		} else {
			out += `
				<input type="number" class="obsidian-input-sheet" value="${resource.remaining}"
				       data-name="items.${item.idx}.flags.obsidian.effects.${effect.idx}.components.${resource.idx}.remaining"
				       data-dtype="Number">
				<span class="obsidian-binary-operator">&sol;</span>
				<span class="obsidian-feature-max">${resource.max}</span>
			`;
		}

		out += '</div>';
		return out;
	}
};

function weaponBonus (actor, item) {
	let bonus = 0;
	if (item.type !== 'weapon') {
		return bonus;
	}

	const flags = item.data.flags.obsidian;
	if (flags.magical && flags.magicBonus) {
		bonus += flags.magicBonus;
	}

	if (flags.tags.ammunition && !OBSIDIAN.notDefinedOrEmpty(flags.ammo)) {
		const ammo = actor?.items.get(flags.ammo);
		const ammoFlags = ammo.data.flags.obsidian;

		if (ammoFlags.magical && ammoFlags.magicBonus) {
			bonus += ammoFlags.magicBonus;
		}
	}

	return bonus;
}
