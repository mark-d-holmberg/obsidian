/**
 * Determines whether a given roll has advantage, disadvantage, or neither,
 * depending on all the modifiers applied to the roll.
 * @param mods An array of strings with values of 'adv', 'dis', or 'reg'.
 * @return {number} Returns 1 for advantage, -1 for disadvantage, and 0 for
 *                  neither.
 */

Obsidian.Rules.determineAdvantage = function (...mods) {
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
};

Obsidian.Rules.Prepare = {
	calculateSave: function (dc, data, cls) {
		let bonus = 8;
		if (dc.bonus !== undefined && dc.bonus !== '') {
			bonus = Number(dc.bonus);
		}

		dc.value = bonus + dc.prof * data.attributes.prof.value;

		if (dc.ability !== undefined && dc.ability !== '') {
			if (dc.ability === 'spell') {
				dc.value += cls ? cls.spellcasting.mod : 0;
			} else {
				dc.value += data.abilities[dc.ability].mod;
			}
		}

		if (dc.fixed !== undefined && dc.fixed !== '') {
			dc.value = Number(dc.fixed);
		}
	},

	calculateHit: function (hit, data, cls) {
		hit.value = hit.bonus || 0;
		if (cls && hit.stat === 'spell') {
			hit.value += cls.spellcasting.mod;
		} else if (hit.stat !== 'spell') {
			hit.value += data.abilities[hit.stat].mod;
		}

		if (hit.proficient || hit.stat === 'spell') {
			hit.value += data.attributes.prof.value;
		}

		if (hit.crit === undefined || hit.crit === '') {
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
					dmg.mod += cls ? cls.spellcasting.mod : 0;
				} else {
					dmg.mod += data.abilities[dmg.stat].mod;
				}
			}

			if (dmg.ncrit === undefined || dmg.ncrit === '') {
				dmg.ncrit = 1;
			} else {
				dmg.ncrit = Number(dmg.ncrit);
			}

			dmg.display = ObsidianActor.damageFormat(dmg);
		}
	},

	prepareCharges: function (charges) {
		if (charges.remaining === undefined || charges.remaining > charges.max) {
			charges.remaining = charges.max;
		}

		if (charges.remaining < 0) {
			charges.remaining = 0;
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
			actorData.obsidian.weapons.push(weapon);

			if (flags.hit.enabled) {
				Obsidian.Rules.Prepare.calculateHit(flags.hit, data);
			}

			if (flags.dc.enabled) {
				Obsidian.Rules.Prepare.calculateSave(flags.dc, data);
			}

			if (flags.charges && flags.charges.enabled) {
				Obsidian.Rules.Prepare.prepareCharges(flags.charges, data);
				flags.charges.display =
					`${game.i18n.localize('OBSIDIAN.Charges')}: `
					+ ObsidianActor.usesFormat(
						weapon.id, i, flags.charges.max, flags.charges.remaining, 6, 'charges');
			}

			if (['melee', 'unarmed'].includes(flags.type)) {
				flags.reach = 5;
				if (flags.tags.reach) {
					flags.reach +=5;
				}
			}

			Obsidian.Rules.Prepare.calculateDamage(data, null, flags.damage, flags.versatile);

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
		}
	},

	features: function (actorData) {
		const ops = {
			plus: (a, b) => a + b,
			mult: (a, b) => a * b
		};

		const data = actorData.data;
		for (const feat of actorData.items.filter(item => item.type === 'feat')) {
			const flags = feat.flags.obsidian;
			if (flags.uses.enabled) {
				const op = ops[flags.uses.operator];
				if (flags.uses.key === 'abl') {
					flags.uses.max = op(flags.uses.bonus, data.abilities[flags.uses.ability].mod);
				} else if (flags.uses.key === 'chr') {
					flags.uses.max = op(flags.uses.bonus, data.details.level.value);
				} else if (flags.uses.key === 'cls') {
					const cls =
						actorData.flags.obsidian.classes.find(cls => cls.id === flags.uses.class);

					if (cls) {
						flags.uses.max = op(flags.uses.bonus, cls.levels);
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
			}

			if (flags.dc.enabled) {
				Obsidian.Rules.Prepare.calculateSave(flags.dc, data);
			}
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
				flags.skills[id] = mergeObject(flags.skills[id], skill);
			}

			if (!custom) {
				skill = flags.skills[id];
				skill.label = game.i18n.localize(`OBSIDIAN.Skill-${id}`);
			}

			actorData.obsidian.skills[custom ? `custom.${id}` : id] = skill;

			skill.mod =
				data.abilities[skill.ability].mod
				+ Math.floor(skill.value * data.attributes.prof.value)
				+ flags.skills.bonus
				+ (skill.bonus || 0);

			if (flags.skills.joat && skill.value === 0) {
				skill.mod += Math.floor(data.attributes.prof.value / 2);
			}

			if (skill.override !== undefined && skill.override !== '') {
				skill.mod = Number(skill.override);
			}

			skill.passive = 10 + skill.mod + (skill.passiveBonus || 0);
			skill.passive += 5 * Obsidian.Rules.determineAdvantage(skill.roll, flags.skills.roll);
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
				+ Math.floor(tool.value * data.attributes.prof.value);

			if (flags.skills.joat && tool.value === 0) {
				tool.mod += Math.floor(data.attributes.prof.value / 2);
			}
		}
	}
};
