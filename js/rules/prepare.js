import {OBSIDIAN} from './rules.js';
import {Parse} from '../module/parse.js';

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
	calculateSave: function (dc, data, cls) {
		if (dc.calc === 'fixed') {
			dc.value = dc.fixed;
			return;
		}

		let bonus = 8;
		if (!OBSIDIAN.notDefinedOrEmpty(dc.bonus)) {
			bonus = Number(dc.bonus);
		}

		dc.value = bonus + dc.prof * data.attributes.prof;

		if (!OBSIDIAN.notDefinedOrEmpty(dc.ability)) {
			if (dc.ability === 'spell') {
				dc.spellMod = cls ? cls.flags.obsidian.spellcasting.mod : 0;
				dc.value += cls ? cls.flags.obsidian.spellcasting.mod : 0;
			} else {
				dc.value += data.abilities[dc.ability].mod;
			}
		}
	},

	calculateHit: function (hit, data, cls) {
		hit.value = hit.bonus || 0;
		hit.spellMod = 0;
		hit.targets = 1;

		if (!OBSIDIAN.notDefinedOrEmpty(hit.ability)) {
			if (hit.ability === 'spell') {
				hit.spellMod = cls ? cls.flags.obsidian.spellcasting.mod : 0;
				hit.value += cls ? cls.flags.obsidian.spellcasting.mod : 0;
			} else {
				hit.value += data.abilities[hit.ability].mod;
			}
		}

		if (hit.proficient || hit.ability === 'spell') {
			hit.value += data.attributes.prof;
		}

		hit.attackType =
			game.i18n.localize(
				`OBSIDIAN.${hit.attack.capitalise()}${hit.category.capitalise()}Attack`);
	},

	calculateDamage: function (data, cls, ...dmgs) {
		for (const dmg of dmgs.reduce((acc, entry) => acc.concat(entry), [])) {
			if (!dmg) {
				continue;
			}

			const ability = dmg.ability || dmg.stat;
			dmg.mod = dmg.bonus || 0;

			if (ability && ability.length > 0) {
				if (ability === 'spell') {
					dmg.spellMod = cls ? cls.flags.obsidian.spellcasting.mod : 0;
					dmg.mod += cls ? cls.flags.obsidian.spellcasting.mod : 0;
				} else {
					dmg.mod += data.abilities[ability].mod;
				}
			}

			if (dmg.ncrit === undefined || dmg.ncrit === '') {
				dmg.ncrit = 1;
			} else {
				dmg.ncrit = Number(dmg.ncrit);
			}

			dmg.display = Prepare.damageFormat(dmg);
		}
	},

	calculateResources: function (data, item, effect, resource, classes) {
		if (resource.calc === 'fixed') {
			resource.max = resource.fixed;
		} else {
			const op = ops[resource.operator];
			if (resource.key === 'abl') {
				resource.max = op(resource.bonus, data.abilities[resource.ability].mod);
			} else if (resource.key === 'chr') {
				resource.max = op(resource.bonus, data.details.level.value);
			} else if (resource.key === 'cls') {
				const cls = classes.find(cls => cls._id === resource.class);
				if (cls) {
					resource.max = op(resource.bonus, cls.data.levels);
				}
			}

			resource.max = Math.max(resource.min, resource.max);
		}

		if (resource.remaining === undefined || resource.remaining > resource.max) {
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

	damageFormat: function (dmg, mod = true) {
		if (dmg === undefined) {
			return;
		}

		let out = '';
		let ndice = dmg.ndice;

		if (dmg.scaledDice !== undefined) {
			ndice *= dmg.scaledDice;
		}

		if (ndice > 0) {
			out += `${ndice}d${dmg.die}`;
		}

		if (dmg.mod !== 0 && mod) {
			if (ndice > 0 && dmg.mod > 0) {
				out += '+';
			}

			out += dmg.mod;
		}

		if (out.length < 1) {
			out = '0';
		}

		return out;
	},

	armour: function (actorData) {
		const data = actorData.data;
		actorData.obsidian.armour =
			actorData.items.filter(item =>
				item.type === 'equipment'
				&& item.flags.obsidian
				&& item.flags.obsidian.subtype === 'armour');

		let bestArmour;
		let bestShield;

		for (const armour of actorData.obsidian.armour) {
			const flags = armour.flags.obsidian;
			flags.notes = [];
			flags.baseAC = armour.data.armor.value;

			if (armour.data.armor.type === 'shield') {
				if (armour.data.equipped
					&& (!bestShield || bestShield.flags.obsidian.baseAC < flags.baseAC))
				{
					bestShield = armour;
				}

				flags.notes.push(
					`${flags.baseAC < 0 ? '-' : '+'}${flags.baseAC} `
					+ game.i18n.localize('OBSIDIAN.ACAbbr'));
			} else {
				if (armour.data.equipped
					&& (!bestArmour || bestArmour.flags.obsidian.baseAC < flags.baseAC))
				{
					bestArmour = armour;
				}

				flags.notes.push(`${game.i18n.localize('OBSIDIAN.ACAbbr')} ${flags.baseAC}`);
				if (armour.data.strength !== undefined && armour.data.strength !== '') {
					flags.notes.push(
						`${game.i18n.localize('OBSIDIAN.AbilityAbbr-str')} `
						+ armour.data.strength);
				}

				if (armour.data.stealth) {
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
		}

		const acOverride = actorData.flags.obsidian.attributes.ac.override;
		if (OBSIDIAN.notDefinedOrEmpty(acOverride)) {
			if (bestArmour) {
				data.attributes.ac.min =
					bestArmour.flags.obsidian.baseAC
					+ actorData.flags.obsidian.attributes.ac.mod;

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
				data.attributes.ac.min += bestShield.flags.obsidian.baseAC;
			}
		}
	},

	consumables: function (actorData) {
		actorData.obsidian.consumables =
			actorData.items.filter(item => item.type === 'consumable' && item.flags.obsidian);
		actorData.obsidian.ammo = [];

		for (const consumable of actorData.obsidian.consumables) {
			const flags = consumable.flags.obsidian;
			flags.notes = [];

			if (flags.subtype === 'ammo') {
				actorData.obsidian.ammo.push(consumable);
			}
		}
	},

	defenses: function (flags) {
		flags.defenses.res = [];
		flags.defenses.imm =
			flags.defenses.conditions.map(cond => game.i18n.localize(`OBSIDIAN.Condition-${cond}`));
		flags.defenses.vuln = [];

		for (const def of flags.defenses.damage) {
			flags.defenses[def.level].push(game.i18n.localize(`OBSIDIAN.Damage-${def.dmg}`));
		}

		if (flags.defenses.disease) {
			flags.defenses.imm.push(game.i18n.localize('OBSIDIAN.Disease'));
		}

		if (flags.defenses.sleep) {
			flags.defenses.imm.push(game.i18n.localize('OBSIDIAN.NonMagicalSleep'));
		}
	},

	weapons: function (actorData) {
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
					flags.reach +=5;
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
							`<option value="${ammo.id}" ${ammo.id == flags.ammo.id ? 'selected': ''}>
								${ammo.name}
							</option>`)}
					</select>`;
			}

			flags.notes = [];

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
							if (tag === 'ammunition') {
								return flags.ammo.display;
							}

							return game.i18n.localize(`OBSIDIAN.AtkTag-${tag}`);
						}

						return null;
					}).filter(tag => tag != null));
		}
	},

	features: function (actorData) {
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

			flags.notes = [];
			if (flags.source.type === 'class') {
				const cls = actorData.obsidian.classes.find(cls => cls._id === flags.source.class);
				if (cls) {
					flags.source.className = cls.flags.obsidian.label;
				}
			}

			flags.display = Parse.parse(actorData, feat.data.description.value);
		}
	},

	hd: function (actorData) {
		const classHD = {};
		const existingHD = actorData.flags.obsidian.attributes.hd;

		for (const cls of actorData.obsidian.classes) {
			const die = String(cls.flags.obsidian.hd);
			let hd = classHD[die] || 0;
			hd += cls.data.levels;
			classHD[die] = hd;
		}

		for (const hd of Object.values(existingHD)) {
			if (!OBSIDIAN.notDefinedOrEmpty(hd.override)) {
				hd.override = Number(hd.override);
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

	saves: function (actorData, data, flags) {
		for (const [id, save] of Object.entries(data.abilities)) {
			save.save =
				(flags.saves.bonus || 0)
				+ data.abilities[id].mod
				+ save.proficient * data.attributes.prof;

			if (flags.saves.hasOwnProperty(id)) {
				save.save += flags.saves[id].bonus;
				const override = flags.saves[id].override;
				if (!OBSIDIAN.notDefinedOrEmpty(override)) {
					save.save = Number(override);
				}
			}
		}
	},

	skills: function (actorData, data, flags) {
		actorData.obsidian.skills = {};
		for (let [id, skill] of
			Object.entries(data.skills).concat(Object.entries(flags.skills.custom)))
		{
			const custom = !isNaN(Number(id));
			if (!custom && flags.skills[id] === undefined) {
				flags.skills[id] = duplicate(skill);
			} else if (!custom) {
				flags.skills[id] = mergeObject(skill, flags.skills[id]);
			}

			if (!custom) {
				skill = flags.skills[id];
				skill.label = game.i18n.localize(`OBSIDIAN.Skill-${id}`);
			}

			actorData.obsidian.skills[custom ? `custom.${id}` : id] = skill;

			skill.mod =
				data.abilities[skill.ability].mod
				+ Math.floor(skill.value * data.attributes.prof)
				+ flags.skills.bonus
				+ (skill.bonus || 0);

			if (flags.skills.joat && skill.value === 0) {
				skill.mod += Math.floor(data.attributes.prof / 2);
			}

			if (skill.override !== undefined && skill.override !== '') {
				skill.mod = Number(skill.override);
			}

			skill.passive = 10 + skill.mod + (skill.passiveBonus || 0);
			skill.passive += 5 * determineAdvantage(skill.roll, flags.skills.roll);
		}
	},

	tools: function (actorData, data, flags) {
		for (const tool of flags.skills.tools) {
			if (tool.override !== undefined && tool.override !== '') {
				tool.mod = Number(tool.override);
				continue;
			}

			tool.mod =
				data.abilities[tool.ability].mod
				+ tool.bonus
				+ flags.skills.bonus
				+ Math.floor(tool.value * data.attributes.prof);

			if (flags.skills.joat && tool.value === 0) {
				tool.mod += Math.floor(data.attributes.prof / 2);
			}
		}
	},

	usesFormat: function (item, effect, resource, threshold = 10) {
		if (resource.max === undefined || resource.max < 0) {
			return '';
		}

		let used = resource.max - resource.remaining;
		if (used < 0) {
			used = 0;
		}

		let out = `<div class="obsidian-feature-uses" data-uuid="${resource.uuid}">`;
		if (resource.max <= threshold) {
			for (let i = 0; i < resource.max; i++) {
				out += `
					<div class="obsidian-feature-use${i < used ? ' obsidian-feature-used' : ''}"
					     data-n="${i + 1}"></div>
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
