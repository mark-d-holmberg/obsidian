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
		ObsidianActor._prepareSpellcasting(data, flags);
		ObsidianActor._prepareAttacks(actorData);
		ObsidianActor._prepareFeatures(actorData);
		ObsidianActor._prepareSpells(actorData);

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

	linkClasses (item) {
		if (item.flags.obsidian.source.type !== 'class') {
			return;
		}

		if (item.flags.obsidian.source.class === 'custom') {
			const needle = item.flags.obsidian.source.custom.toLowerCase();
			const cls = this.data.flags.obsidian.classes.find(cls =>
				cls.name === 'custom' && cls.custom.toLowerCase() === needle);

			if (cls === undefined) {
				item.flags.obsidian.source.type = 'other';
				item.flags.obsidian.source.other = item.flags.obsidian.source.custom;
			} else {
				item.flags.obsidian.source.class = cls.id;
			}
		} else {
			const needle = item.flags.obsidian.source.class;
			const cls = this.data.flags.obsidian.classes.find(cls => cls.name === needle);

			if (cls === undefined) {
				item.flags.obsidian.source.type = 'other';
				item.flags.obsidian.source.other = game.i18n.localize(`OBSIDIAN.Class-${needle}`);
			} else {
				item.flags.obsidian.source.class = cls.id;
			}
		}
	}

	/**
	 * @private
	 */
	static _calculateSave (dc, data) {
		let bonus = 8;
		if (dc.bonus !== undefined && dc.bonus !== '') {
			bonus = Number(dc.bonus);
		}

		dc.value = bonus + dc.prof * data.attributes.prof.value;

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
	static _prepareAttacks (actorData) {
		const data = actorData.data;
		actorData.obsidian.attacks =
			actorData.items.filter(item =>
				item.type === 'weapon' && item.flags.obsidian && item.flags.obsidian.custom);

		for (const attack of Object.values(actorData.obsidian.attacks)) {
			const flags = attack.flags.obsidian;
			if (flags.hit.enabled) {
				flags.hit.value = data.abilities[flags.hit.stat].mod;
				if (flags.hit.proficient) {
					flags.hit.value += data.attributes.prof.value;
				}

				if (flags.hit.crit === undefined || flags.hit.crit === '') {
					flags.hit.crit = 20;
				} else {
					flags.hit.crit = parseInt(flags.hit.crit);
				}
			}

			if (flags.dc.enabled) {
				ObsidianActor._calculateSave(flags.dc, data);
			}

			if (['melee', 'unarmed'].includes(flags.type)) {
				flags.reach = 5;
				if (flags.tags.reach) {
					flags.reach +=5;
				}
			}

			for (const dmg of flags.damage.concat(flags.versatile || [])) {
				dmg.mod = dmg.bonus || 0;
				if (dmg.stat.length > 0) {
					dmg.mod += data.abilities[dmg.stat].mod;
				}

				if (dmg.ncrit === undefined || dmg.ncrit === '') {
					dmg.ncrit = 1;
				} else {
					dmg.ncrit = Number(dmg.ncrit);
				}

				dmg.display = ObsidianActor._damageFormat(dmg);
			}

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
	}

	/**
	 * @private
	 */
	static _prepareFeatures (actorData) {
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
				ObsidianActor._calculateSave(flags.dc, data);
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
	static _prepareSpellcasting (data, flags) {
		const mods = [];
		const attacks = [];
		const saves = [];
		const existing = {};
		let slotLevel = 0;
		let pactLevel = 0;
		let nonFullCasters = 0;
		let totalCasters = 0;

		flags.attributes.spellcasting = {mods: mods, attacks: attacks, saves: saves};
		for (const cls of flags.classes) {
			if (cls.spell === undefined) {
				cls.spell = Obsidian.Rules.CLASS_SPELL_MODS[cls.name];
			}

			if (cls.spell !== undefined && cls.spell !== '') {
				const val = data.abilities[cls.spell].mod;
				cls.spellcasting = {
					mod: val,
					attack: val + data.attributes.prof.value,
					save: val + data.attributes.prof.value + 8
				};

				if (!existing[cls.spell]) {
					mods.push(cls.spellcasting.mod);
					attacks.push(cls.spellcasting.attack);
					saves.push(cls.spellcasting.save);
					existing[cls.spell] = true;
				}
			}

			if (cls.progression === undefined) {
				cls.progression = Obsidian.Rules.CLASS_SPELL_PROGRESSION[cls.name];
			}

			if (cls.progression !== undefined && cls.progression !== '') {
				if (cls.progression !== 'pact') {
					totalCasters++;
				}

				switch (cls.progression) {
					case 'third': slotLevel += Math.floor(cls.levels / 3); nonFullCasters++; break;
					case 'half': slotLevel += Math.floor(cls.levels / 2); nonFullCasters++; break;
					case 'full': slotLevel += cls.levels; break;
					case 'artificer': slotLevel += Math.ceil(cls.levels / 2); break;
					case 'pact': pactLevel += cls.levels; break;
				}
			}

			if (cls.preparation === undefined) {
				cls.preparation = Obsidian.Rules.CLASS_SPELL_PREP[cls.name];
			}

			if (cls.rituals === undefined) {
				cls.rituals = Obsidian.Rules.CLASS_RITUALS[cls.name];
			}

			const spellsKnown = Obsidian.Rules.SPELLS_KNOWN_TABLE[cls.name];
			if (spellsKnown !== undefined) {
				cls.maxKnown = spellsKnown.known[cls.levels - 1];
				cls.maxCantrips = spellsKnown.cantrips[cls.levels - 1];
				if (cls.maxCantrips === undefined) {
					cls.maxCantrips = spellsKnown.cantrips[spellsKnown.cantrips.length - 1];
				}
			}

			if (cls.preparation === 'prep') {
				cls.maxPrepared = data.abilities[cls.spell].mod;
				switch (cls.progression) {
					case 'third': cls.maxPrepared += Math.floor(cls.levels / 3); break;
					case 'half': case 'artificer': cls.maxPrepared += Math.floor(cls.levels / 2); break;
					case 'full': cls.maxPrepared += cls.levels; break;
				}

				cls.maxPrepared = Math.max(1, cls.maxPrepared);
			}
		}

		if (slotLevel > 0) {
			if (totalCasters === 1 && nonFullCasters === 1) {
				// Single-classed non-half-caster.
				slotLevel++;
			}

			const slots = Obsidian.Rules.SPELL_SLOT_TABLE[slotLevel - 1];
			slots.forEach((n, i) => {
				const spell = data.spells[`spell${i + 1}`];
				spell.max = n;
			});

			for (let i = 1; i < 10; i++) {
				const spell = data.spells[`spell${i}`];
				const override = flags.spells.slots[i];

				if (override !== undefined && override !== '') {
					spell.max = Number(override);
				} else if (slots[i - 1] === undefined) {
					spell.max = 0;
				}

				spell.value = Number(spell.value);
				if (isNaN(spell.value) || spell.value < 0) {
					spell.value = 0;
				}

				if (spell.value > spell.max) {
					spell.value = spell.max;
				}
			}
		}

		if (pactLevel > 0) {
			if (data.spells.pact === undefined) {
				data.spells.pact = {};
			}

			data.spells.pact.level = Math.ceil(Math.min(10, pactLevel) / 2);
			data.spells.pact.slots =
				Math.max(1, Math.min(pactLevel, 2), Math.min(pactLevel - 8, 3),
					Math.min(pactLevel - 13, 4));

			const slotOverride = flags.spells.slots.pact;
			const levelOverride = flags.spells.slots.pactLevel;

			if (slotOverride !== undefined && slotOverride !== '') {
				data.spells.pact.slots = Number(slotOverride);
			}

			if (levelOverride !== undefined && levelOverride !== '') {
				data.spells.pact.level = Number(levelOverride);
			}

			if (data.spells.pact.uses === undefined || data.spells.pact.uses < 0) {
				data.spells.pact.uses = 0;
			}

			if (data.spells.pact.uses > data.spells.pact.slots) {
				data.spells.pact.uses = data.spells.pact.slots;
			}
		}
	}

	/**
	 * @private
	 */
	static _prepareSpells (actorData) {
		for (const spell of Object.values(actorData.items.filter(item => item.type === 'spell'))) {
			const flags = spell.flags.obsidian;
			flags.notes = [];
			let cls;

			if (flags.time.n === undefined || flags.time.n === '') {
				flags.time.n = 1;
			} else {
				flags.time.n = Number(flags.time.n);
			}

			if (flags.source === undefined) {
				flags.source = {display: game.i18n.localize('OBSIDIAN.Class-custom')};
			} else if (flags.source.type === 'custom') {
				flags.source.display = flags.source.custom;
			} else if (flags.source.type === 'class') {
				cls = actorData.flags.obsidian.classes.find(x => x.id === flags.source.class);
				flags.source.display = cls.label;
			}

			flags.components.display =
				Object.entries(flags.components)
					.filter(([, val]) => val)
					.map(([key,]) => Obsidian.Rules.SPELL_COMPONENT_MAP[key])
					.filter(s => s !== undefined)
					.map(s => game.i18n.localize(`OBSIDIAN.${s}Abbr`))
					.join(', ');

			if (flags.hit.enabled) {
				if (flags.hit.n === undefined || flags.hit.n === '') {
					flags.hit.n = 1;
				} else {
					flags.hit.n = Number(flags.hit.n);
				}

				flags.hit.count = flags.hit.n;
				if (spell.data.level.value < 1) {
					flags.hit.count +=
						Math.round((actorData.data.details.level.value + 1) / 6 + .5) - 1;
				}

				flags.notes.push(`${game.i18n.localize('OBSIDIAN.Count')}: ${flags.hit.count}`);
				flags.hit.value =
					cls ? cls.spellcasting.attack : actorData.data.attributes.prof.value;
			}

			if (flags.dc.enabled) {
				if (flags.dc.bonus === undefined || flags.dc.bonus === '') {
					flags.dc.bonus = 8
				} else {
					flags.dc.bonus = Number(flags.dc.bonus);
				}

				flags.dc.value = flags.dc.bonus + flags.dc.prof * actorData.data.attributes.prof.value;
				if (flags.dc.ability !== undefined && flags.dc.ability !== '') {
					if (flags.dc.ability === 'spell') {
						if (cls) {
							flags.dc.value += cls.spellcasting.mod;
						}
					} else {
						flags.dc.value += actorData.data.abilities[flags.dc.ability].mod;
					}
				}

				if (flags.dc.fixed !== undefined && flags.dc.fixed !== '') {
					flags.dc.value = Number(flags.dc.fixed);
				}
			}

			for (const dmg of flags.damage) {
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

				dmg.display = ObsidianActor._damageFormat(dmg);
			}

			if (flags.components.m && spell.data.materials.value.length > 0) {
				flags.notes.push(
					`${game.i18n.localize('OBSIDIAN.MaterialAbbr')}: `
					+ spell.data.materials.value);
			}

			if (flags.time.type === 'react' && flags.time.react.length > 0) {
				flags.notes.push(
					`${game.i18n.localize('OBSIDIAN.CastTimeAbbr-react')}: `
					+ flags.time.react);
			}

			if (cls) {
				if (spell.data.level.value === 0) {
					flags.known = true;
					flags.visible = true;
				} else if (cls.preparation === 'known') {
					if (flags.known === undefined) {
						flags.known = true;
					}

					flags.visible = flags.known;
				} else if (cls.preparation === 'prep') {
					if (flags.prepared === undefined) {
						flags.prepared = true;
					}

					flags.visible = flags.prepared;
				} else if (cls.preparation === 'book') {
					if (flags.book === undefined) {
						flags.book = true;
					}

					if (flags.prepared === undefined) {
						flags.prepared = false;
					}

					flags.visible = flags.book && flags.prepared;
				}

				if (spell.data.ritual.value) {
					flags.visible =
						(cls.rituals === 'prep' && flags.prepared)
						|| (cls.rituals === 'book' && flags.book);
				}
			} else {
				flags.visible = true;
			}
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

	async updateClasses (before, after, update) {
		const clsMap = new Map(after.map(cls => [cls.id, cls]));
		const spells = this.items.filter(item => item.type === 'spell');
		const features =
			this.items.filter(item =>
				item.type === 'feat' && item.flags.obsidian && item.flags.obsidian.custom);

		for (const feature of features) {
			const flags = feature.flags.obsidian;
			if (flags.source.type === 'class' && !clsMap.has(flags.source.class)) {
				await this.deleteOwnedItem(feature.id);
			}

			if (flags.uses.key === 'cls' && !clsMap.has(flags.uses.class)) {
				await this.deleteOwnedItem(feature.id);
			}
		}

		for (const spell of spells) {
			const flags = spell.flags.obsidian;
			if (flags.source && flags.source.type === 'class' && !clsMap.has(flags.source.class)) {
				await this.deleteOwnedItem(spell.id);
			}
		}

		update['flags.obsidian.attributes.hd'] = this.updateHD(after);
	}

	async updateFeatures (update) {
		const features =
			this.items.filter(item =>
				item.type === 'feat' && item.flags.obsidian && item.flags.obsidian.custom);

		const featMap = new Map(features.map(feat => [feat.id, feat]));

		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i];
			if (item.type === 'spell') {
				const flags = item.flags.obsidian;
				if (flags.source && flags.source.type === 'feat'
					&& !featMap.has(flags.source.feat))
				{
					await this.deleteOwnedItem(item.id);
				}
			}

			if (item.type !== 'feat' || !item.flags.obsidian || !item.flags.obsidian.custom) {
				continue;
			}

			const feature = item.flags.obsidian;
			if (feature.uses.type === 'shared' && !featMap.has(feature.uses.shared)) {
				update[`items.${i}.flags.obsidian.uses.type`] = 'formula';
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
