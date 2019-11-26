import {OBSIDIAN} from './rules.js';
import {Parse} from '../module/parse.js';

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

		if (!OBSIDIAN.notDefinedOrEmpty(dc.fixed)) {
			dc.value = Number(dc.fixed);
		}
	},

	calculateHit: function (hit, data, cls) {
		hit.value = hit.bonus || 0;
		hit.spellMod = 0;

		if (cls && hit.stat === 'spell') {
			hit.spellMod = cls.flags.obsidian.spellcasting.mod;
			hit.value += cls.flags.obsidian.spellcasting.mod;
		} else if (hit.stat !== 'spell') {
			hit.value += data.abilities[hit.stat].mod;
		}

		if (hit.proficient || hit.stat === 'spell') {
			hit.value += data.attributes.prof;
		}

		if (OBSIDIAN.notDefinedOrEmpty(hit.crit)) {
			hit.crit = 20;
		} else {
			hit.crit = parseInt(hit.crit);
		}
	},

	calculateDamage: function (data, cls, ...dmgs) {
		for (const dmg of dmgs.reduce((acc, entry) => acc.concat(entry), [])) {
			dmg.mod = dmg.bonus || 0;
			if (dmg.stat && dmg.stat.length > 0) {
				if (dmg.stat === 'spell') {
					dmg.spellMod = cls ? cls.flags.obsidian.spellcasting.mod : 0;
					dmg.mod += cls ? cls.flags.obsidian.spellcasting.mod : 0;
				} else {
					dmg.mod += data.abilities[dmg.stat].mod;
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

	calculateUses: function (id, idx, data, cls, uses) {
		uses.max = uses.bonus || 0;
		if (!OBSIDIAN.notDefinedOrEmpty(uses.ability)) {
			if (uses.ability === 'spell') {
				uses.max += cls ? cls.flags.obsidian.spellcasting.mod : 0;
			} else {
				uses.max += data.abilities[uses.ability].mod;
			}
		}

		if (uses.remaining === undefined || uses.remaining > uses.max) {
			uses.remaining = uses.max;
		}

		if (uses.remaining < 0) {
			uses.remaining = 0;
		}

		uses.display = Prepare.usesFormat(id, idx, uses.max, uses.remaining, 6);
	},

	damageFormat: function (dmg, mod = true) {
		if (dmg === undefined) {
			return;
		}

		let out = '';

		if (dmg.ndice > 0) {
			out += `${dmg.ndice}d${dmg.die}`;
		}

		if (dmg.mod !== 0 && mod) {
			if (dmg.ndice > 0 && dmg.mod > 0) {
				out += '+';
			}

			out += dmg.mod;
		}

		if (out.length < 1) {
			out = '0';
		}

		return out;
	},

	prepareCharges: function (charges) {
		if (charges.remaining === undefined || charges.remaining > charges.max) {
			charges.remaining = charges.max;
		}

		if (charges.remaining < 0) {
			charges.remaining = 0;
		}
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

			if (flags.magic !== undefined && flags.magic !== '') {
				flags.baseAC += Number(flags.magic);
			}

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
		if (acOverride === undefined || acOverride === '') {
			if (bestArmour) {
				data.attributes.ac.min =
					bestArmour.flags.obsidian.baseAC
					+ actorData.flags.obsidian.attributes.ac.mod
					+ bestArmour.flags.obsidian.magic;

				if (bestArmour.flags.obsidian.addDex) {
					let maxDex = bestArmour.flags.obsidian.maxDex;
					if (maxDex === undefined || maxDex === '') {
						maxDex = Infinity;
					} else {
						maxDex = Number(maxDex);
					}

					data.attributes.ac.min += Math.min(data.abilities.dex.mod, maxDex);
				}
			}

			if (bestShield) {
				data.attributes.ac.min +=
					bestShield.flags.obsidian.baseAC + bestShield.flags.obsidian.magic;
			}
		}
	},

	consumables: function (actorData) {
		const data = actorData.data;
		actorData.obsidian.consumables =
			actorData.items.filter(item => item.type === 'consumable' && item.flags.obsidian);
		actorData.obsidian.ammo = [];

		for (const consumable of actorData.obsidian.consumables) {
			const flags = consumable.flags.obsidian;
			flags.notes = [];

			if (flags.uses && flags.uses.enabled && flags.uses.limit === 'limited') {
				Prepare.calculateUses(consumable.id, consumable.idx, data, null, flags.uses);
				flags.notes.push(
					'<div class="obsidian-table-note-flex">'
						+ `${game.i18n.localize('OBSIDIAN.Uses')}: ${flags.uses.display}`
					+ '</div>');
			}

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
		const data = actorData.data;
		actorData.obsidian.weapons = [];

		for (let i = 0; i < actorData.items.length; i++) {
			if (actorData.items[i].type !== 'weapon') {
				continue;
			}

			const weapon = actorData.items[i];
			const flags = weapon.flags.obsidian;

			if (!flags) {
				continue;
			}

			if (weapon.data.equipped || flags.type === 'unarmed') {
				actorData.obsidian.weapons.push(weapon);
			}

			if (flags.hit.enabled) {
				Prepare.calculateHit(flags.hit, data);
			}

			if (flags.dc.enabled) {
				Prepare.calculateSave(flags.dc, data);
			}

			if (flags.charges && flags.charges.enabled) {
				Prepare.prepareCharges(flags.charges, data);
				flags.charges.display =
					Prepare.usesFormat(
						weapon.id, i, flags.charges.max, flags.charges.remaining, 6, 'charges');
			}

			for (let j = 0; j < getProperty(flags, 'special.length') || 0; j++) {
				const special = flags.special[j];
				if (special.uses.remaining === undefined
					|| special.uses.remaining > special.uses.max)
				{
					special.uses.remaining = special.uses.max;
				}

				if (special.uses.remaining < 0) {
					special.uses.remaining = 0;
				}

				special.display =
					Prepare.usesFormat(
						weapon.id, i, special.uses.max, special.uses.remaining, 6,
						`special.${j}.uses`);
			}

			if (['melee', 'unarmed'].includes(flags.type)) {
				flags.reach = 5;
				if (flags.tags.reach) {
					flags.reach +=5;
				}
			}

			Prepare.calculateDamage(data, null, flags.damage, flags.versatile);
			flags.dmgPair = flags.damage.map((dmg, i) => {
				return {
					fst: Prepare.damageFormat(dmg, false),
					snd: Prepare.damageFormat(flags.versatile[i], false),
					type: dmg.type
				};
			});

			flags.attackType = 'OBSIDIAN.MeleeWeapon';
			if (flags.mode === 'ranged') {
				if (flags.type === 'melee') {
					flags.attackType = 'OBSIDIAN.RangedAttack';
				} else {
					flags.attackType = 'OBSIDIAN.RangedWeapon';
				}
			} else if (flags.mode === 'unarmed') {
				flags.attackType = 'OBSIDIAN.MeleeAttack';
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
		}
	},

	features: function (actorData) {
		const ops = {
			plus: (a, b) => a + b,
			mult: (a, b) => a * b
		};

		const data = actorData.data;

		for (let i = 0; i < actorData.items.length; i++) {
			if (actorData.items[i].type !== 'feat') {
				continue;
			}

			const feat = actorData.items[i];
			const flags = feat.flags.obsidian;

			if (!flags) {
				continue;
			}

			if (flags.source.type === 'class') {
				const cls = actorData.obsidian.classes.find(cls =>
					cls.flags.obsidian.uuid === flags.source.class);

				if (cls) {
					flags.source.className = cls.flags.obsidian.label;
				}
			}

			if (flags.uses.enabled) {
				const op = ops[flags.uses.operator];
				if (flags.uses.key === 'abl') {
					flags.uses.max = op(flags.uses.bonus, data.abilities[flags.uses.ability].mod);
				} else if (flags.uses.key === 'chr') {
					flags.uses.max = op(flags.uses.bonus, data.details.level.value);
				} else if (flags.uses.key === 'cls') {
					const cls =
						actorData.obsidian.classes.find(cls =>
							cls.flags.obsidian.uuid === flags.uses.class);

					if (cls) {
						flags.uses.max = op(flags.uses.bonus, cls.data.levels);
					}
				}

				flags.uses.max = Math.max(flags.uses.min, flags.uses.max);
				if (flags.uses.fixed !== undefined && flags.uses.fixed !== '') {
					flags.uses.max = Number(flags.uses.fixed);
				}

				if (isNaN(flags.uses.max)) {
					flags.uses.max = 0;
				}

				if (flags.uses.remaining === undefined || flags.uses.remaining > flags.uses.max) {
					flags.uses.remaining = flags.uses.max;
				} else if (flags.uses.remaining < 0) {
					flags.uses.remaining = 0;
				}

				flags.uses.display =
					Prepare.usesFormat(feat.id, i, flags.uses.max, flags.uses.remaining);
			}

			if (flags.dc.enabled) {
				Prepare.calculateSave(flags.dc, data);
			}

			if (flags.hit.enabled) {
				Prepare.calculateHit(flags.hit, data);
			}

			Prepare.calculateDamage(data, null, flags.damage);
			flags.display = Parse.parse(actorData, feat.data.description.value);
		}
	},

	saves: function (actorData, data, flags) {
		for (const [id, save] of Object.entries(data.abilities)) {
			save.save += flags.saves.bonus;
			if (flags.saves.hasOwnProperty(id)) {
				save.save += flags.saves[id].bonus;
				const override = flags.saves[id].override;
				if (override !== undefined && override !== '') {
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

	usesFormat: function (id, idx, max, remaining, threshold = 10, prop = 'uses') {
		if (max === undefined || max < 0) {
			return '';
		}

		let used = max - remaining;
		if (used < 0) {
			used = 0;
		}

		let out = `<div class="obsidian-feature-uses" data-feat-id="${id}" data-prop="${prop}">`;
		if (max <= threshold) {
			for (let i = 0; i < max; i++) {
				out += `
						<div class="obsidian-feature-use${i < used ? ' obsidian-feature-used' : ''}"
						     data-n="${i + 1}"></div>
					`;
			}
		} else {
			out += `
					<input type="number" data-name="items.${idx}.flags.obsidian.${prop}.remaining"
					       class="obsidian-input-sheet" value="${remaining}" data-dtype="Number">
					<span class="obsidian-binary-operator">&sol;</span>
					<span class="obsidian-feature-max">${max}</span>
				`;
		}

		out += '</div>';
		return out;
	}
};
