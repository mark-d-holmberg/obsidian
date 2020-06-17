import {OBSIDIAN} from '../global.js';
import {Filters} from './filters.js';
import {bonusToParts, highestProficiency} from './bonuses.js';
import {Effect} from '../module/effect.js';

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
		if (!OBSIDIAN.notDefinedOrEmpty(component.ability)) {
			let mod;
			let i18n;

			if (component.ability === 'spell') {
				component.spellMod =
					cls ? cls.flags.obsidian.spellcasting.mod
						: data.attributes.spellMod ? data.attributes.spellMod : 0;

				mod = component.spellMod;
				i18n = 'OBSIDIAN.Spell';
			} else {
				mod = data.abilities[component.ability].mod;
				i18n = `OBSIDIAN.AbilityAbbr-${component.ability}`;
			}

			component.rollParts.push({mod: mod, name: game.i18n.localize(i18n)});
		}
	},

	calculateSave: function (actorData, item, dc, cls) {
		const data = actorData.data;
		if (dc.calc === 'fixed') {
			dc.value = dc.fixed;
			return;
		}

		let bonus = 8;
		if (!OBSIDIAN.notDefinedOrEmpty(dc.bonus)) {
			bonus = Number(dc.bonus);
		}

		dc.rollParts = [{
			mod: dc.prof * data.attributes.prof,
			name: game.i18n.localize('OBSIDIAN.ProfAbbr'),
			proficiency: true,
			value: Number(dc.prof)
		}];

		dc.spellMod = 0;
		if (getProperty(item, 'flags.obsidian.parentComponent')) {
			const provider = actorData.obsidian.components.get(item.flags.obsidian.parentComponent);
			if (provider && provider.method === 'innate') {
				dc.spellMod = data.abilities[provider.ability].mod;
				dc.rollParts.push({mod: dc.spellMod, name: game.i18n.localize('OBSIDIAN.Spell')});
			} else {
				Prepare.spellPart(dc, data, cls);
			}
		} else {
			Prepare.spellPart(dc, data, cls);
		}

		const bonuses = actorData.obsidian.filters.bonuses(Filters.appliesTo.saveDCs(dc));
		if (bonuses.length) {
			dc.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
		}

		dc.value = bonus + dc.rollParts.reduce((acc, part) => acc + part.mod, 0);
	},

	calculateHit: function (actorData, item, hit, cls) {
		const data = actorData.data;
		hit.rollParts = [{
			mod: weaponBonus(actorData, item, hit),
			name: game.i18n.localize('OBSIDIAN.Bonus')
		}];

		hit.spellMod = 0;
		hit.targets = 1;
		Prepare.spellPart(hit, data, cls);

		if (hit.proficient) {
			hit.rollParts.push({
				mod: data.attributes.prof,
				name: game.i18n.localize('OBSIDIAN.ProfAbbr'),
				proficiency: true,
				value: 1
			});
		}

		const bonuses = actorData.obsidian.filters.bonuses(Filters.appliesTo.attackRolls(hit));
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
		const data = actorData.data;
		dmg.rollParts = [{
			mod: weaponBonus(actorData, item, dmg),
			name: game.i18n.localize('OBSIDIAN.Bonus'),
			constant: true
		}];

		Prepare.spellPart(dmg, data, cls);
		const bonuses = Effect.filterDamage(actorData, actorData.obsidian.filters.bonuses, dmg);

		if (bonuses.length) {
			dmg.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
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
		const data = actorData.data;
		const classes = actorData.obsidian.classes;

		if (resource.calc === 'fixed') {
			resource.max = resource.fixed;
		} else {
			const op = ops[resource.operator];
			if (resource.key === 'abl') {
				resource.max = op(resource.bonus, data.abilities[resource.ability].mod);
			} else if (resource.key === 'chr') {
				resource.max = op(resource.bonus, data.details.level);
			} else if (resource.key === 'cls') {
				const cls = classes.find(cls => cls._id === resource.class);
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
			ndice *= dmg.scaledDice;
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

	abilities: function (actorData) {
		const data = actorData.data;
		const flags = actorData.flags.obsidian;
		flags.abilities = {};

		for (const [id, ability] of Object.entries(data.abilities)) {
			flags.abilities[id] = {rollParts: [], value: ability.value};
			const abilityBonuses =
				actorData.obsidian.filters.bonuses(Filters.appliesTo.abilityChecks(id));

			if (abilityBonuses.length) {
				flags.abilities[id].rollParts.push(
					...abilityBonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
			}

			const scoreBonuses =
				actorData.obsidian.filters.bonuses(Filters.appliesTo.abilityScores(id));

			if (scoreBonuses.length) {
				flags.abilities[id].value +=
					scoreBonuses.reduce((acc, bonus) =>
						acc + bonusToParts(actorData, bonus)
							.reduce((acc, part) => acc + part.mod, 0), 0);

				flags.abilities[id].value = Math.floor(flags.abilities[id].value);
				ability.mod = Math.floor((flags.abilities[id].value - 10) / 2);
			}
		}
	},

	armour: function (actorData) {
		const data = actorData.data;
		actorData.obsidian.armour =
			actorData.items.filter(item =>
				item.type === 'equipment' && item.flags.obsidian && item.flags.obsidian.armour);

		let bestArmour;
		let bestShield;

		for (const armour of actorData.obsidian.armour) {
			const flags = armour.flags.obsidian;
			flags.baseAC = armour.data.armor.value;

			if (armour.data.armor.type === 'shield') {
				if (armour.data.equipped
					&& (!bestShield || bestShield.flags.obsidian.baseAC < flags.baseAC))
				{
					bestShield = armour;
				}
			} else {
				if (armour.data.equipped
					&& (!bestArmour || bestArmour.flags.obsidian.baseAC < flags.baseAC))
				{
					bestArmour = armour;
				}
			}
		}

		const acOverride = actorData.flags.obsidian.attributes.ac.override;
		const armourDisplay = [];

		if (OBSIDIAN.notDefinedOrEmpty(acOverride)) {
			if (bestArmour) {
				armourDisplay.push(bestArmour.name.toLocaleLowerCase());
				data.attributes.ac.min = bestArmour.flags.obsidian.baseAC;
				if (bestArmour.flags.obsidian.addDex) {
					let maxDex = bestArmour.data.armor.dex;
					if (OBSIDIAN.notDefinedOrEmpty(maxDex)) {
						maxDex = Infinity;
					} else {
						maxDex = Number(maxDex);
					}

					data.attributes.ac.min += Math.min(data.abilities.dex.mod, maxDex);
				}
			}

			if (bestShield) {
				armourDisplay.push(bestShield.name.toLocaleLowerCase());
				data.attributes.ac.min += bestShield.flags.obsidian.baseAC;
			}
		}

		actorData.obsidian.armourDisplay = armourDisplay.join(', ');
	},

	armourNotes: function (item) {
		const flags = item.flags.obsidian;
		if (item.data.armor.type === 'shield') {
			flags.notes.push(
				`${flags.baseAC < 0 ? '-' : '+'}${flags.baseAC} `
				+ game.i18n.localize('OBSIDIAN.ACAbbr'));
		} else {
			flags.notes.push(`${game.i18n.localize('OBSIDIAN.ACAbbr')} ${flags.baseAC}`);
			if (!OBSIDIAN.notDefinedOrEmpty(item.data.strength)) {
				flags.notes.push(
					`${game.i18n.localize('OBSIDIAN.AbilityAbbr-str')} `
					+ item.data.strength);
			}

			if (item.data.stealth) {
				flags.notes.push(
					'<div class="obsidian-table-note-flex">'
						+ game.i18n.localize('OBSIDIAN.Skill-ste')
						+ '<div class="obsidian-css-icon obsidian-css-icon-sm '
						+ 'obsidian-css-icon-hexagon obsidian-css-icon-negative">'
							+ '<div class="obsidian-css-icon-shape"></div>'
							+ '<div class="obsidian-css-icon-label">'
								+ game.i18n.localize('OBSIDIAN.DisadvantageAbbr')
							+ '</div>'
						+ '</div>'
					+ '</div>');
			}
		}
	},

	conditions: function (actor) {
		const actorData = actor.data;
		actorData.obsidian.conditions = {exhaustion: actorData.data.attributes.exhaustion};
		Object.entries(actorData.flags.obsidian.attributes.conditions)
			.forEach(([condition, enabled]) => actorData.obsidian.conditions[condition] = enabled);

		actorData.obsidian.conditions.concentrating =
			actorData.items
				.filter(item =>
					item.type === 'feat' && getProperty(item, 'flags.obsidian.duration'))
				.map(duration => actorData.obsidian.effects.get(duration.flags.obsidian.ref))
				.some(effect => effect && Effect.isConcentration(actorData, effect))
	},

	consumables: function (actorData) {
		actorData.obsidian.consumables =
			actorData.items.filter(item => item.type === 'consumable' && item.flags.obsidian);
		actorData.obsidian.ammo =
			actorData.obsidian.consumables.filter(consumable =>
				consumable.flags.obsidian.subtype === 'ammo');
	},

	weapons: function (actor) {
		const actorData = actor.data;
		for (let i = 0; i < actorData.items.length; i++) {
			if (actorData.items[i].type !== 'weapon') {
				continue;
			}

			const weapon = actorData.items[i];
			const flags = weapon.flags.obsidian;

			if (!flags) {
				continue;
			}

			if (flags.type === 'melee') {
				flags.reach = 5;
				if (flags.tags.reach) {
					flags.reach += 5;
				}
			}

			if (flags.tags.ammunition) {
				if (!flags.ammo) {
					flags.ammo = {};
				}

				flags.ammo.display =
					`<select data-name="items.${i}.flags.obsidian.ammo.id">
						<option value="" ${OBSIDIAN.notDefinedOrEmpty(flags.ammo.id) ? 'selected' : ''}>
							${game.i18n.localize('OBSIDIAN.AtkTag-ammunition')}
						</option>
						${actorData.obsidian.ammo.map(ammo =>
							`<option value="${ammo._id}" ${ammo._id === flags.ammo.id ? 'selected': ''}>
								${ammo.name}
							</option>`)}
					</select>`;
			}

			flags.display = TextEditor.enrichHTML(weapon.data.description.value, {
				entities: false,
				links: false,
				rollData: actor.getRollData()
			});
		}
	},

	weaponNotes: function (item) {
		const flags = item.flags.obsidian;
		if (flags.category) {
			flags.notes.push(game.i18n.localize(`OBSIDIAN.WeaponCat-${flags.category}`));
		}

		flags.notes =
			flags.notes.concat(
				Object.entries(flags.tags).map(([tag, val]) => {
					if (tag === 'custom' && val.length) {
						return val;
					}

					if (val) {
						if (tag === 'ammunition' && flags.ammo) {
							return flags.ammo.display;
						}

						return game.i18n.localize(`OBSIDIAN.AtkTag-${tag}`);
					}

					return null;
				}).filter(tag => tag != null));

		if (flags.magical) {
			flags.notes.push(game.i18n.localize('OBSIDIAN.Magical'));
		}
	},

	features: function (actor) {
		const actorData = actor.data;
		actorData.obsidian.feats = [];

		for (let i = 0; i < actorData.items.length; i++) {
			if (actorData.items[i].type !== 'feat') {
				continue;
			}

			const feat = actorData.items[i];
			const flags = feat.flags.obsidian;
			actorData.obsidian.feats.push(feat);

			if (!flags) {
				continue;
			}

			if (flags.source.type === 'class') {
				const cls = actorData.obsidian.classes.find(cls => cls._id === flags.source.class);
				if (cls) {
					flags.source.className = cls.flags.obsidian.label;
				}
			}

			// Check CONFIG is ready first.
			try {
				CONFIG.JournalEntry.entityClass.collection;
			} catch {
				return;
			}

			flags.display = TextEditor.enrichHTML(feat.data.description.value, {
				entities: true,
				links: true,
				rollData: actor.getRollData()
			});
		}
	},

	hd: function (actorData) {
		const classHD = {};
		const existingHD = actorData.flags.obsidian.attributes.hd;

		for (const cls of actorData.obsidian.classes) {
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

	init: function (data, flags) {
		flags.attributes.init.rollParts = [];
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

	saves: function (actorData, data, flags, originalSaves) {
		for (const [id, save] of Object.entries(data.abilities)) {
			if (!flags.saves[id]) {
				flags.saves[id] = {};
			}

			let original;
			if (originalSaves) {
				original = originalSaves[id];
			}

			if (OBSIDIAN.notDefinedOrEmpty(flags.saves[id].override)) {
				flags.saves[id].rollParts = [{
					mod: save.proficient * data.attributes.prof,
					name: game.i18n.localize('OBSIDIAN.ProfAbbr'),
					proficiency: true,
					value: Number(save.proficient)
				}, {
					mod: data.abilities[id].mod,
					name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${id}`)
				}, {
					mod: (flags.saves.bonus || 0) + (flags.saves[id].bonus || 0),
					name: game.i18n.localize('OBSIDIAN.Bonus')
				}];

				const saveBonuses =
					actorData.obsidian.filters.bonuses(Filters.appliesTo.savingThrows(id));

				if (saveBonuses.length) {
					flags.saves[id].rollParts.push(
						...saveBonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
					flags.saves[id].rollParts = highestProficiency(flags.saves[id].rollParts);
				}

				flags.saves[id].proficiency =
					flags.saves[id].rollParts.find(part => part.proficiency);
			} else {
				flags.saves[id].rollParts = [{
					mod: Number(flags.saves[id].override),
					name: game.i18n.localize('OBSIDIAN.Override')
				}];
			}

			save.save =
				Math.floor(flags.saves[id].rollParts.reduce((acc, part) => acc + part.mod, 0));

			if (flags.saves[id].rollParts.find(p => p.proficiency).value > 0
				&& original && original.save > save.save)
			{
				save.save = original.save;
			}
		}
	},

	skills: function (actorData, data, flags, originalSkills) {
		actorData.obsidian.skills = {};
		for (let [id, skill] of
			Object.entries(data.skills).concat(Object.entries(flags.skills.custom)))
		{
			const custom = !isNaN(Number(id));
			if (!custom && flags.skills[id] === undefined) {
				flags.skills[id] = duplicate(skill);
			} else if (!custom) {
				flags.skills[id] = mergeObject(skill, flags.skills[id], {inplace: false});
			}

			if (!custom) {
				skill = flags.skills[id];
				skill.label = game.i18n.localize(`OBSIDIAN.Skill-${id}`);
			}

			let original;
			const key = custom ? `custom.${id}` : id;

			if (originalSkills) {
				original = originalSkills[key];
			}

			actorData.obsidian.skills[key] = skill;
			Prepare.calculateSkill(data, flags, skill, original);

			if (OBSIDIAN.notDefinedOrEmpty(skill.override)) {
				const bonuses =
					actorData.obsidian.filters.bonuses(
						Filters.appliesTo.skillChecks(false, key, skill.ability));

				if (bonuses.length) {
					skill.rollParts.push(
						...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
					skill.rollParts = highestProficiency(skill.rollParts);
				}
			}

			const rollMods =
				actorData.obsidian.filters.mods(
					Filters.appliesTo.skillChecks(false, key, skill.ability));

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

			skill.passive = 10 + skill.mod + (skill.passiveBonus || 0);
			skill.passive += 5 * determineAdvantage(skill.roll, flags.skills.roll, ...rollMod.mode);
			skill.proficiency = skill.rollParts.find(part => part.proficiency);

			const passiveBonuses =
				actorData.obsidian.filters.bonuses(Filters.appliesTo.passiveScores(key));

			if (passiveBonuses.length) {
				skill.passive +=
					passiveBonuses.reduce((acc, bonus) =>
						acc + bonusToParts(actorData, bonus)
							.reduce((acc, part) => acc + part.mod, 0), 0);

				skill.passive = Math.floor(skill.passive);
			}
		}
	},

	tools: function (actorData, data, flags) {
		for (const tool of flags.skills.tools) {
			Prepare.calculateSkill(data, flags, tool);
			if (OBSIDIAN.notDefinedOrEmpty(tool.override)) {
				const bonuses =
					actorData.obsidian.filters.bonuses(
						Filters.appliesTo.skillChecks(true, `tools.${tool.id}`, tool.ability));

				if (bonuses.length) {
					tool.rollParts.push(...bonuses.flatMap(bonus => bonusToParts(actorData, bonus)));
					tool.mod = tool.rollParts.reduce((acc, part) => acc + part.mod, 0);
					tool.rollParts = highestProficiency(tool.rollParts);
				}
			}

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

function weaponBonus (actorData, item, component) {
	let bonus = component.bonus || 0;
	if (item.type !== 'weapon') {
		return bonus;
	}

	if (item.flags.obsidian.magical && item.flags.obsidian.magicBonus) {
		bonus += item.flags.obsidian.magicBonus;
	}

	if (item.flags.obsidian.tags?.ammunition
		&& !OBSIDIAN.notDefinedOrEmpty(item.flags.obsidian.ammo?.id))
	{
		const ammo = actorData.obsidian.itemsByID.get(item.flags.obsidian.ammo.id);
		if (ammo && ammo.flags.obsidian.magical && ammo.flags.obsidian.magicBonus) {
			bonus += ammo.flags.obsidian.magicBonus;
		}
	}

	return bonus;
}
