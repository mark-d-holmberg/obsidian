import {OBSIDIAN} from '../global.js';
import {Filters} from './filters.js';
import {bonusToParts, highestProficiency} from './bonuses.js';
import {Effect} from '../module/effect.js';
import {Rules} from './rules.js';

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

export const Prepare = {
	spellPart: function (component, data, cls) {
		if (!OBSIDIAN.notDefinedOrEmpty(component.ability) && data) {
			let mod;
			let i18n;

			if (component.ability === 'spell') {
				component.spellMod =
					cls?.obsidian.spellcasting.mod || data.attributes.spellMod || 0;

				mod = component.spellMod;
				i18n = 'OBSIDIAN.Spell';
			} else {
				mod = data.abilities[component.ability].mod;
				i18n = `OBSIDIAN.AbilityAbbr-${component.ability}`;
			}

			component.rollParts.push({mod: mod, name: game.i18n.localize(i18n)});
		}
	},

	calculateDC: function (actorData, item, component, cls, pred) {
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
		if (getProperty(item, 'flags.obsidian.parentComponent')) {
			const provider =
				actorData?.obsidian?.components.get(item.flags.obsidian.parentComponent);

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
			component.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
		}

		component.value =
			Math.floor(bonus + component.rollParts.reduce((acc, part) => acc + part.mod, 0));

		const setters = actorData?.obsidian?.filters.setters(pred(component)) || [];
		if (setters.length) {
			const setter = Effect.combineSetters(setters);
			if (!setter.min || setter.score > component.value) {
				component.value = setter.score;
			}
		}
	},

	calculateHit: function (actorData, item, hit, cls) {
		const data = actorData?.data;
		hit.rollParts = [{
			mod: (hit.bonus || 0) + weaponBonus(actorData, item),
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

		const bonuses =
			actorData?.obsidian?.filters.bonuses(Filters.appliesTo.attackRolls(hit)) || [];

		if (bonuses.length) {
			hit.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
		}

		if (hit.extraBonus) {
			hit.rollParts.push(...bonusToParts(actorData, hit.extraBonus));
		}

		hit.rollParts = highestProficiency(hit.rollParts);
		hit.value = hit.rollParts.reduce((acc, part) => acc + part.mod, 0);
		hit.attackType =
			game.i18n.localize(
				`OBSIDIAN.${hit.attack.capitalise()}${hit.category.capitalise()}Attack`);
	},

	calculateDamage: function (actorData, item, dmg, cls) {
		const data = actorData?.data;
		dmg.rollParts = [{
			mod: dmg.bonus || 0,
			name: game.i18n.localize('OBSIDIAN.Bonus'),
			constant: true
		}, {
			mod: weaponBonus(actorData, item),
			name: game.i18n.localize('OBSIDIAN.Magic')
		}];

		Prepare.spellPart(dmg, data, cls);

		if (actorData?.obsidian) {
			const bonuses = Effect.filterDamage(actorData, actorData.obsidian.filters.bonuses, dmg);
			if (bonuses.length) {
				dmg.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
			}
		}

		if (dmg.extraBonus) {
			dmg.rollParts.push(...bonusToParts(actorData, dmg.extraBonus));
		}

		dmg.mod = dmg.rollParts.reduce((acc, part) => acc + part.mod, 0);
		dmg.display = Prepare.damageFormat(dmg);
		dmg.derived = {ncrit: dmg.ndice};

		if (!OBSIDIAN.notDefinedOrEmpty(dmg.ncrit)) {
			dmg.derived.ncrit = Number(dmg.ncrit);
		}
	},

	calculateResources: function (actorData, item, effect, resource) {
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
				const cls = actorData.obsidian.itemsByID.get(resource.class);
				if (cls) {
					resource.max = op(resource.bonus, cls.data.levels);
				}
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
				`OBSIDIAN.${atk.attack.capitalise()}${atk.category.capitalise()}Attack`;
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
				name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${skill.ability}`)
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
		let ndice = dmg.ndice;

		if (dmg.scaledDice !== undefined) {
			ndice = dmg.scaledDice;
		}

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

	abilities: function (actorData, data, flags, derived) {
		derived.abilities = {};
		for (const [id, ability] of Object.entries(data.abilities)) {
			derived.abilities[id] = {rollParts: [], value: ability.value};
			const abilityBonuses = derived.filters.bonuses(Filters.appliesTo.abilityChecks(id));

			if (abilityBonuses.length) {
				derived.abilities[id].rollParts.push(
					...abilityBonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
			}

			const scoreBonuses = derived.filters.bonuses(Filters.appliesTo.abilityScores(id));
			if (scoreBonuses.length) {
				derived.abilities[id].value +=
					scoreBonuses.reduce((acc, bonus) =>
						acc + bonusToParts(actorData, bonus)
							.reduce((acc, part) => acc + part.mod, 0), 0);

				derived.abilities[id].value = Math.floor(derived.abilities[id].value);
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
		derived.armour =
			derived.itemsByType.get('equipment').filter(item => item.flags.obsidian?.armour);

		let bestArmour;
		let bestShield;

		for (const armour of derived.armour) {
			const baseAC = armour.data.armor.value;

			if (armour.data.armor.type === 'shield') {
				if (armour.data.equipped && (!bestShield || bestShield.data.armor.value < baseAC)) {
					bestShield = armour;
				}
			} else {
				if (armour.data.equipped && (!bestArmour || bestArmour.data.armor.value < baseAC)) {
					bestArmour = armour;
				}
			}
		}

		const acOverride = flags.attributes.ac.override;
		const armourDisplay = [];

		if (OBSIDIAN.notDefinedOrEmpty(acOverride)) {
			if (bestArmour) {
				armourDisplay.push(bestArmour.name.toLocaleLowerCase());
				derived.attributes.ac = bestArmour.data.armor.value;

				if (bestArmour.flags.obsidian.addDex) {
					let maxDex = bestArmour.data.armor.dex;
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
				derived.attributes.ac += bestShield.data.armor.value;
			}
		}

		derived.armourDisplay = armourDisplay.join(', ');
	},

	conditions: function (actorData, data, flags, derived) {
		derived.conditions = {exhaustion: data.attributes.exhaustion};
		Object.entries(flags.attributes.conditions)
			.forEach(([condition, enabled]) => derived.conditions[condition] = enabled);

		derived.conditions.concentrating =
			actorData.effects
				.filter(item => getProperty(item, 'flags.obsidian.ref'))
				.map(duration => derived.effects.get(duration.flags.obsidian.ref))
				.some(effect => effect && Effect.isConcentration(derived, effect));
	},

	hd: function (flags, derived) {
		const classHD = {};
		const existingHD = flags.attributes.hd;

		for (const cls of derived.classes) {
			const die = cls.data.hitDice;
			let hd = classHD[die] || 0;
			hd += cls.data.levels;
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

	saves: function (actorData, data, flags, derived, originalSaves) {
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
					name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${id}`)
				}, {
					mod: (flags.saves.bonus || 0) + (flags.saves[id].bonus || 0),
					name: game.i18n.localize('OBSIDIAN.Bonus')
				}];

				const saveBonuses = derived.filters.bonuses(Filters.appliesTo.savingThrows(id));
				if (saveBonuses.length) {
					save.rollParts.push(
						...saveBonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
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

	skills: function (actorData, data, flags, derived, originalSkills) {
		derived.skills = {};
		for (let [id, skill] of
			Object.entries(data.skills).concat(Object.entries(flags.skills.custom)))
		{
			const custom = !isNaN(Number(id));
			if (!custom) {
				flags.skills[id] = mergeObject(skill, flags.skills[id] || {}, {inplace: false});
				skill = flags.skills[id];
				skill.label = game.i18n.localize(`OBSIDIAN.Skill-${id}`);
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
						...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
					skill.rollParts = highestProficiency(skill.rollParts);
				}
			}

			const rollMods =
				derived.filters.mods(Filters.appliesTo.skillChecks(key, skill.ability));

			let rollMod = {mode: ['reg']};
			if (rollMods.length) {
				rollMod = Effect.combineRollMods(rollMods);
			}

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
						acc + bonusToParts(actorData, bonus)
							.reduce((acc, part) => acc + part.mod, 0), 0);

				skill.passive = Math.floor(skill.passive);
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

	tools: function (actorData, data, flags, derived) {
		derived.tools = {};
		const tools = Rules.ALL_TOOLS.map(t => {
			const tool = mergeObject(
				{ability: 'str', bonus: 0, value: 0, label: '', enabled: false},
				flags.tools[t] || {});

			flags.tools[t] = tool;
			return [t, tool];
		});

		for (let [id, tool] of tools.concat(Object.entries(flags.tools.custom))) {
			const custom = !isNaN(Number(id));
			if (!custom) {
				tool.label = game.i18n.localize(`OBSIDIAN.ToolProf-${id}`);
			}

			const key = custom ? `custom.${id}` : id;
			derived.tools[key] = duplicate(tool);
			tool = derived.tools[key];
			Prepare.calculateSkill(data, flags, tool);

			if (OBSIDIAN.notDefinedOrEmpty(tool.override)) {
				const bonuses =
					derived.filters.bonuses(Filters.appliesTo.toolChecks(key, tool.ability));

				if (bonuses.length) {
					tool.rollParts.push(
						...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
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

function weaponBonus (actorData, item) {
	let bonus = 0;
	if (item.type !== 'weapon') {
		return bonus;
	}

	if (item.flags.obsidian.magical && item.flags.obsidian.magicBonus) {
		bonus += item.flags.obsidian.magicBonus;
	}

	if (item.flags.obsidian.tags?.ammunition
		&& !OBSIDIAN.notDefinedOrEmpty(item.flags.obsidian.ammo))
	{
		const ammo = actorData?.obsidian?.itemsByID.get(item.flags.obsidian.ammo);
		if (ammo && ammo.flags.obsidian.magical && ammo.flags.obsidian.magicBonus) {
			bonus += ammo.flags.obsidian.magicBonus;
		}
	}

	return bonus;
}
