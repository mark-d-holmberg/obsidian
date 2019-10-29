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

		actorData.obsidian.magicalItems =
			actorData.items.filter(item =>
				(item.type === 'weapon' || item.type === 'equipment')
				&& getProperty(item, 'flags.obsidian.magical'));

		Obsidian.Rules.Prepare.defenses(flags);
		Obsidian.Rules.Prepare.skills(actorData, data, flags);
		Obsidian.Rules.Prepare.tools(actorData, data, flags);
		Obsidian.Rules.Prepare.saves(actorData, data, flags);
		Obsidian.Rules.Prepare.spellcasting(actorData, flags);
		Obsidian.Rules.Prepare.features(actorData);
		Obsidian.Rules.Prepare.inventory(actorData);
		Obsidian.Rules.Prepare.consumables(actorData);
		Obsidian.Rules.Prepare.weapons(actorData);
		Obsidian.Rules.Prepare.armour(actorData);
		Obsidian.Rules.Prepare.spells(actorData);

		return actorData;
	}

	linkClasses (item) {
		if (!item.flags || !item.flags.obsidian || !item.flags.obsidian.source
			|| item.flags.obsidian.source.type !== 'class')
		{
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

	static damageFormat (dmg, mod = true) {
		if (dmg === undefined) {
			return;
		}

		let out = '';

		if (dmg.ndice > 0) {
			out += `${dmg.ndice}d${dmg.die}`;
		}

		if (dmg.mod !== 0 && mod) {
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

	static usesFormat (id, idx, max, remaining, threshold = 10, prop = 'uses', multiple = false) {
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
				<input type="number"
				       ${multiple ? 'data-' : ''}name="items.${idx}.flags.obsidian.${prop}.remaining"
				       class="obsidian-input-sheet" value="${remaining}" data-dtype="Number">
				<span class="obsidian-binary-operator">&sol;</span>
				<span class="obsidian-feature-max">${max}</span>
			`;
		}

		out += '</div>';
		return out;
	}

	getItemParent (item) {
		return this.data.items.find(other => other.id === item.flags.obsidian.parent);
	}

	async updateClasses (before, after, update) {
		const clsMap = new Map(after.map(cls => [cls.id, cls]));
		const spells = this.data.items.filter(item => item.type === 'spell');
		const features =
			this.data.items.filter(item =>
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

	async updateEquipment (deleted) {
		if (deleted) {
			const update = {};
			const parent = this.data.items.find(item => item.id === deleted.flags.obsidian.parent);

			if (deleted.type === 'backpack') {
				deleted.flags.obsidian.contents.forEach(item => {
					update[`items.${item.idx}.flags.obsidian.parent`] = null;
					this.data.flags.obsidian.order.equipment.root.push(item.id);
				});

				update['flags.obsidian.order.equipment.root'] =
					duplicate(this.data.flags.obsidian.order.equipment.root);
			}

			if (parent == null) {
				const bucket = deleted.type === 'backpack' ? 'containers' : 'root';
				const idx = this.data.flags.obsidian.order.equipment[bucket].indexOf(deleted.id);
				this.data.flags.obsidian.order.equipment[bucket].splice(idx, 1);
				update[`flags.obsidian.order.equipment.${bucket}`] =
					duplicate(this.data.flags.obsidian.order.equipment[bucket]);
			} else {
				const idx = parent.flags.obsidian.order.indexOf(deleted.id);
				parent.flags.obsidian.order.splice(idx, 1);
				update[`items.${parent.idx}.flags.obsidian.order`] =
					duplicate(parent.flags.obsidian.order);
			}

			await this.update(update);
		}

		const magicalItems =
			this.data.items.filter(item =>
				(item.type === 'weapon' || item.type === 'equipment')
				&& getProperty(item, 'flags.obsidian.magical'));

		const itemMap = new Map(magicalItems.map(item => [item.id, item]));
		const spells = this.data.items.filter(item => item.type === 'spell');

		for (const spell of spells) {
			const flags = spell.flags.obsidian;
			if (flags.source === 'item' && !itemMap.has(flags.source.item)) {
				await this.deleteOwnedItem(spell.id);
			}
		}
	}

	async updateFeatures (update) {
		const features =
			this.data.items.filter(item => item.type === 'feat' && item.flags.obsidian);
		const featMap = new Map(features.map(feat => [feat.id, feat]));

		for (let i = 0; i < this.data.items.length; i++) {
			const item = this.data.items[i];
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
			newHD[hd] = updated;
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
