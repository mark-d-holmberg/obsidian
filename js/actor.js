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
			if (skill.adv) {
				skill.passive += 5;
			}
		}

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

		actorData.obsidian.profs = {
			armour: flags.traits.profs.custom.armour,
			weapons: flags.traits.profs.custom.weapons,
			langs: flags.traits.profs.custom.langs
		};

		actorData.obsidian.attacks = flags.attacks.custom;
		for (const attack of Object.values(actorData.obsidian.attacks)) {
			attack.hit = data.abilities[attack.stat].mod;
			if (attack.proficient) {
				attack.hit += data.attributes.prof.value;
			}

			if (['melee', 'unarmed'].includes(attack.type)) {
				attack.reach = 5;
				if (attack.tags.reach) {
					attack.reach +=5;
				}
			}

			if (attack.crit === undefined || attack.crit === '') {
				attack.crit = 20;
			} else {
				attack.crit = parseInt(attack.crit);
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

		actorData.obsidian.features = flags.features.custom;
		for (const feat of Object.values(actorData.obsidian.features)) {
			if (feat.uses.enabled) {
				feat.uses.value = feat.uses.bonus;
				if (feat.uses.key === 'abl') {
					feat.uses.value += data.abilities[feat.uses.ability].mod;
				} else if (feat.uses.key === 'chr') {
					feat.uses.value += data.details.level.value;
				} else if (feat.uses.key === 'cls') {
					const cls = flags.classes.find(cls => cls.id === feat.uses.class);
					if (cls) {
						feat.uses.value += cls.levels;
					}
				}

				feat.uses.value = Math.max(feat.uses.min, feat.uses.value);
				if (feat.uses.fixed !== undefined && feat.uses.fixed !== '') {
					feat.uses.value = Number(feat.uses.fixed);
				}
			}

			if (feat.dc.enabled) {
				feat.dc.value = (feat.dc.bonus || 8) + feat.dc.prof * data.attributes.prof.value;
				if (feat.dc.ability !== '') {
					feat.dc.value += data.abilities[feat.dc.ability].mod;
				}

				if (feat.dc.fixed !== undefined && feat.dc.fixed !== '') {
					feat.dc.value = Number(feat.dc.fixed);
				}
			}
		}

		return actorData;
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

			feature.id = features.length;
			features.push(feature);
		}

		update['flags.obsidian.attributes.hd'] = this.updateHD(after);
		update['flags.obsidian.features.custom'] = features;
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
