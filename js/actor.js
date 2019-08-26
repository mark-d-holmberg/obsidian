class ObsidianActor extends Actor5e {
	prepareData (actorData) {
		actorData = super.prepareData(actorData);
		ObsidianActor._enrichFlags(actorData.flags);

		const data = actorData.data;
		const flags = actorData.flags.obsidian;
		actorData.obsidian = {};

		actorData.obsidian.classFormat = ObsidianActor._classFormat(flags.classes);
		data.attributes.hp.maxAdjusted = data.attributes.hp.max + flags.attributes.hpMaxMod;

		data.details.level.value = 0;
		for (const cls of Object.values(flags.classes)) {
			cls.label =
				cls.name === 'custom' ? cls.name : game.i18n.localize(`OBSIDIAN.Class-${cls.name}`);
			data.details.level.value += cls.levels;
		}

		data.attributes.prof.value = Math.floor((data.details.level.value + 7) / 4);
		data.attributes.init.mod =
			data.abilities[flags.attributes.init.ability].mod
			+ data.attributes.init.value;

		if (flags.skills.joat) {
			data.attributes.init.mod += Math.floor(data.attributes.prof.value / 2);
		}

		if (flags.attributes.init.override !== undefined && flags.attributes.init.override !== '') {
			data.attributes.init.mod = Number(flags.attributes.init.override);
		}

		data.attributes.ac.min =
			flags.attributes.ac.base
			+ data.abilities[flags.attributes.ac.ability1].mod
			+ (flags.attributes.ac.ability2 ? data.abilities[flags.attributes.ac.ability2].mod : 0)
			+ flags.attributes.ac.mod;

		if (flags.attributes.ac.override !== undefined && flags.attributes.ac.override !== '') {
			data.attributes.ac.min = flags.attributes.ac.override;
		}

		actorData.obsidian.profs = {
			armour: flags.traits.profs.custom.armour,
			weapons: flags.traits.profs.custom.weapons,
			langs: flags.traits.profs.custom.langs
		};

		ObsidianActor._prepareSkills(actorData, data, flags);
		ObsidianActor._prepareTools(actorData, data, flags);
		ObsidianActor._prepareSaves(actorData, data, flags);
		ObsidianActor._prepareAttacks(actorData, data, flags);
		ObsidianActor._prepareFeatures(actorData, data, flags);

		return actorData;
	}

	/**
	 * Determines whether a given roll has advantage, disadvantage, or neither,
	 * depending on all the modifiers applied to the roll.
	 * @param mods An array of strings with values of 'adv', 'dis', or 'reg'.
	 * @return {number} Returns 1 for advantage, -1 for disadvantage, and 0 for
	 *                  neither.
	 */

	static determineAdvantage (...mods) {
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

	/**
	 * @private
	 */
	static _calculateSave (dc, data) {
		dc.value = (dc.bonus || 8) + dc.prof * data.attributes.prof.value;

		if (dc.ability !== '') {
			dc.value += data.abilities[dc.ability].mod;
		}

		if (dc.fixed !== undefined && dc.fixed !== '') {
			dc.value = Number(dc.fixed);
		}
	}

	/**
	 * @private
	 */
	static _classFormat (classes) {
		if (classes.length < 1) {
			return game.i18n.localize('OBSIDIAN.Class');
		}

		return classes.sort((a, b) => b.levels - a.levels).map(cls => {
			let result = '';
			if (cls.subclass) {
				result += `${cls.subclass} `;
			}

			if (cls.name === 'custom') {
				result += `${cls.custom} `;
			} else {
				result += `${game.i18n.localize(`OBSIDIAN.Class-${cls.name}`)} `;
			}

			return result + cls.levels;
		}).join(' / ');
	}

	/**
	 * @private
	 */
	static _damageFormat (dmg) {
		let out = '';

		if (dmg.ndice > 0) {
			out += `${dmg.ndice}d${dmg.die}`;
		}

		if (dmg.mod !== 0) {
			if (dmg.ndice > 0) {
				out += dmg.mod > 0 ? '+' : '-';
			}

			out += dmg.mod;
		}

		if (out.length < 1) {
			out = '0';
		}

		return out;
	}

	/**
	 * @private
	 */
	static _enrichFlags (flags) {
		const walk = (master, target) => {
			for (const [key, val] of Object.entries(master)) {
				if (target[key] === undefined) {
					target[key] = val;
				} else if ($.isPlainObject(val)) {
					walk(val, target[key]);
				}
			}
		};

		walk(duplicate(Obsidian.SCHEMA), flags);
	}

	/**
	 * @private
	 */
	static _prepareAttacks (actorData, data, flags) {
		actorData.obsidian.attacks = flags.attacks.custom;
		for (const attack of Object.values(actorData.obsidian.attacks)) {
			if (attack.hit.enabled) {
				attack.hit.value = data.abilities[attack.hit.stat].mod;
				if (attack.hit.proficient) {
					attack.hit.value += data.attributes.prof.value;
				}

				if (attack.hit.crit === undefined || attack.hit.crit === '') {
					attack.hit.crit = 20;
				} else {
					attack.hit.crit = parseInt(attack.hit.crit);
				}
			}

			if (attack.dc.enabled) {
				ObsidianActor._calculateSave(attack.dc, data);
			}

			if (['melee', 'unarmed'].includes(attack.type)) {
				attack.reach = 5;
				if (attack.tags.reach) {
					attack.reach +=5;
				}
			}

			for (const dmg of attack.damage.concat(attack.versatile ? attack.versatile : [])) {
				dmg.mod = dmg.bonus || 0;
				if (dmg.stat.length > 0) {
					dmg.mod += data.abilities[dmg.stat].mod;
				}

				dmg.display = ObsidianActor._damageFormat(dmg);
			}

			attack.attackType = 'OBSIDIAN.MeleeWeapon';
			if (attack.mode === 'ranged') {
				if (attack.type === 'melee') {
					attack.attackType = 'OBSIDIAN.RangedAttack';
				} else {
					attack.attackType = 'OBSIDIAN.RangedWeapon';
				}
			} else if (attack.mode === 'unarmed') {
				attack.attackType = 'OBSIDIAN.MeleeAttack';
			}
		}
	}

	/**
	 * @private
	 */
	static _prepareFeatures (actorData, data, flags) {
		const ops = {
			plus: (a, b) => a + b,
			mult: (a, b) => a * b
		};

		actorData.obsidian.features = flags.features.custom;
		for (const feat of Object.values(actorData.obsidian.features)) {
			if (feat.uses.enabled) {
				const op = ops[feat.uses.operator];
				if (feat.uses.key === 'abl') {
					feat.uses.max = op(feat.uses.bonus, data.abilities[feat.uses.ability].mod);
				} else if (feat.uses.key === 'chr') {
					feat.uses.max = op(feat.uses.bonus, data.details.level.value);
				} else if (feat.uses.key === 'cls') {
					const cls = flags.classes.find(cls => cls.id === feat.uses.class);
					if (cls) {
						feat.uses.max = op(feat.uses.bonus, cls.levels);
					}
				}

				feat.uses.max = Math.max(feat.uses.min, feat.uses.max);
				if (feat.uses.fixed !== undefined && feat.uses.fixed !== '') {
					feat.uses.max = Number(feat.uses.fixed);
				}

				if (isNaN(feat.uses.max)) {
					feat.uses.max = 0;
				}

				if (feat.uses.remaining === undefined || feat.uses.remaining > feat.uses.max) {
					feat.uses.remaining = feat.uses.max;
				} else if (feat.uses.remaining < 0) {
					feat.uses.remaining = 0;
				}
			}

			if (feat.dc.enabled) {
				ObsidianActor._calculateSave(feat.dc, data);
			}
		}
	}

	/**
	 * @private
	 */
	static _prepareSaves (actorData, data, flags) {
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
	}

	/**
	 * @private
	 */
	static _prepareSkills (actorData, data, flags) {
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
			skill.passive += 5 * ObsidianActor.determineAdvantage(skill.roll, flags.skills.roll);
		}
	}

	/**
	 * @private
	 */
	static _prepareTools (actorData, data, flags) {
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

	updateClasses (before, after, update) {
		const existing = this.data.flags.obsidian.features.custom;
		const clsMap = new Map(after.map(cls => [cls.id, cls]));
		const features = [];

		for (const feature of existing) {
			if (feature.source.type === 'class' && !clsMap.has(feature.source.class)) {
				continue;
			}

			if (feature.uses.key === 'cls' && !clsMap.has(feature.uses.class)) {
				continue;
			}

			features.push(feature);
		}

		update['flags.obsidian.attributes.hd'] = this.updateHD(after);
		update['flags.obsidian.features.custom'] = features;
	}

	static updateFeatures (features, update) {
		const featMap = new Map(features.map(feat => [feat.id, feat]));
		for (let i = 0; i < features.length; i++) {
			const feature = features[i];
			if (feature.uses.type === 'shared' && !featMap.has(feature.uses.shared)) {
				update[`flags.obsidian.features.custom.${i}.uses.type`] = 'formula';
			}
		}
	}

	updateHD (classes) {
		const existing = this.data.flags.obsidian.attributes.hd;
		const newHD = {};
		const totals = {};

		for (const cls of classes) {
			if (totals[cls.hd] === undefined) {
				totals[cls.hd] = 0;
			}

			totals[cls.hd] += cls.levels;
		}

		for (const [hd, val] of Object.entries(existing)) {
			const updated = duplicate(val);
			const diff = (totals[hd] || 0) - val.max;
			updated.max = totals[hd] || 0;
			updated.value = val.value + diff;

			if (updated.max > 0 || updated.override !== undefined) {
				newHD[hd] = updated;
			}
		}

		for (const [hd, val] of Object.entries(totals)) {
			if (newHD[hd] === undefined) {
				newHD[hd] = {
					max: val,
					value: val
				};
			}
		}

		return newHD;
	}
}

CONFIG.Actor.entityClass = ObsidianActor;
