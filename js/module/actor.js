import {Actor5e} from '../../../../systems/dnd5e/module/actor/entity.js';
import {OBSIDIAN} from '../rules/rules.js';
import {Prepare} from '../rules/prepare.js';
import {prepareInventory} from '../rules/inventory.js';
import {prepareSpells} from '../rules/spells.js';
import {prepareSpellcasting} from '../rules/spellcasting.js';

export class ObsidianActor extends Actor5e {
	prepareData (actorData) {
		actorData = super.prepareData(actorData);
		if (actorData.type === 'npc') {
			return actorData;
		}

		ObsidianActor._enrichFlags(actorData.flags);

		const data = actorData.data;
		const flags = actorData.flags.obsidian;
		actorData.obsidian = {};

		actorData.obsidian.classes = actorData.items.filter(item => item.type === 'class');
		data.attributes.hp.maxAdjusted = data.attributes.hp.max + flags.attributes.hpMaxMod;

		data.details.level.value = 0;
		for (const cls of Object.values(actorData.obsidian.classes)) {
			if (!cls.flags.obsidian) {
				continue;
			}

			cls.flags.obsidian.label =
				cls.name === 'custom'
					? cls.flags.obsidian.custom
					: game.i18n.localize(`OBSIDIAN.Class-${cls.name}`);
			cls.data.levels = Number(cls.data.levels);
			data.details.level.value += cls.data.levels;
		}

		actorData.obsidian.classFormat = ObsidianActor._classFormat(actorData.obsidian.classes);
		data.attributes.prof = Math.floor((data.details.level.value + 7) / 4);
		data.attributes.init.mod =
			data.abilities[flags.attributes.init.ability].mod
			+ data.attributes.init;

		if (flags.skills.joat) {
			data.attributes.init.mod += Math.floor(data.attributes.prof / 2);
		}

		if (!OBSIDIAN.notDefinedOrEmpty(flags.attributes.init.override)) {
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

		Prepare.defenses(flags);
		Prepare.skills(actorData, data, flags);
		Prepare.tools(actorData, data, flags);
		Prepare.saves(actorData, data, flags);
		prepareSpellcasting(actorData, flags);
		Prepare.features(actorData);
		prepareInventory(actorData);
		Prepare.consumables(actorData);
		Prepare.weapons(actorData);
		Prepare.armour(actorData);
		prepareSpells(actorData);

		return actorData;
	}

	async createOwnedItem (itemData, options) {
		await super.createOwnedItem(itemData, options);
		if (itemData.type === 'class') {
			const update = {};
			await this.updateClasses(update);
			if (Object.keys(update).length > 0) {
				this.update(update);
			}
		}
	}

	async deleteOwnedItem (itemId, options = {}) {
		const item = this.data.items.find(itm => itm.id === itemId);
		const isClass = item.type === 'class';
		await super.deleteOwnedItem(itemId, options);
		if (isClass) {
			const update = {};
			await this.updateClasses(update);
			if (Object.keys(update).length > 0) {
				this.update(update);
			}
		}
	}

	linkClasses (item) {
		if (!item.flags || !item.flags.obsidian || !item.flags.obsidian.source
			|| item.flags.obsidian.source.type !== 'class')
		{
			return;
		}

		if (item.flags.obsidian.source.class === 'custom') {
			const needle = item.flags.obsidian.source.custom.toLowerCase();
			const cls = this.data.obsidian.classes.find(cls =>
				cls.name === 'custom' && cls.flags.obsidian.custom.toLowerCase() === needle);

			if (cls === undefined) {
				item.flags.obsidian.source.type = 'other';
				item.flags.obsidian.source.other = item.flags.obsidian.source.custom;
			} else {
				item.flags.obsidian.source.class = cls.flags.obsidian.uuid;
			}
		} else {
			const needle = item.flags.obsidian.source.class;
			const cls = this.data.obsidian.classes.find(cls => cls.name === needle);

			if (cls === undefined) {
				item.flags.obsidian.source.type = 'other';
				item.flags.obsidian.source.other = game.i18n.localize(`OBSIDIAN.Class-${needle}`);
			} else {
				item.flags.obsidian.source.class = cls.flags.obsidian.uuid;
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

		return classes.sort((a, b) => b.data.levels - a.data.levels).map(cls => {
			if (!cls.flags.obsidian) {
				return '';
			}

			return (cls.data.subclass && cls.data.subclass.length
					? `${cls.data.subclass} ` : '')
				+ `${cls.flags.obsidian.label} ${cls.data.levels}`;
		}).join(' / ');
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

		walk(duplicate(OBSIDIAN.Schema.Actor), flags);
	}

	getItemParent (item) {
		return this.data.items.find(other => other.id === item.flags.obsidian.parent);
	}

	async shortRest () {
		if (this.data.data.spells.pact) {
			await this.update({'data.spells.pact.uses': 0});
		}

		const items = [];
		const feats = this.data.items.filter(item => item.type === 'feat');

		for (const feat of feats) {
			const flags = feat.flags.obsidian;
			if (flags.uses && flags.uses.enabled && flags.uses.recharge === 'short') {
				items.push({
					id: feat.id,
					flags: {obsidian: {uses: {remaining: flags.uses.max}}}
				});
			}
		}

		if (items.length > 0) {
			return this.updateManyOwnedItem(items);
		}

		return Promise.resolve();
	}

	async longRest () {
		await this.shortRest();
		const data = this.data.data;
		const flags = this.data.flags.obsidian;
		const update = {};

		update['data.attributes.hp.value'] = data.attributes.hp.maxAdjusted;

		for (const [die, hd] of Object.entries(flags.attributes.hd)) {
			if (hd.max > 0) {
				update[`flags.obsidian.attributes.hd.${die}.value`] =
					hd.value + Math.floor(hd.max / 2);
			}
		}

		for (const level of Object.keys(data.spells)) {
			if (level.startsWith('spell')) {
				update[`data.spells.${level}`] = 0;
			}
		}

		await this.update(update);
		const items = [];

		for (const item of this.data.items) {
			const itemFlags = item.flags.obsidian;
			if (item.type === 'feat'
				&& itemFlags.uses
				&& itemFlags.uses.enabled
				&& itemFlags.uses.recharge === 'long')
			{
				items.push({
					id: item.id,
					flags: {obsidian: {uses: {remaining: itemFlags.uses.max}}}
				});
			}

			if (item.type === 'weapon' && itemFlags.charges && itemFlags.charges.enabled) {
				if (itemFlags.charges.rechargeType === 'formula') {
					const recharge = OBSIDIAN.Rolls.recharge(item);
					let remaining =
						itemFlags.charges.remaining + recharge.flags.obsidian.results[0][0].total;

					if (remaining > itemFlags.charges.max) {
						remaining = itemFlags.charges.max;
					}

					OBSIDIAN.Rolls.toChat(this, recharge);
					items.push({id: item.id, flags: {obsidian: {charges: {remaining: remaining}}}});
				} else {
					items.push({
						id: item.id,
						flags: {obsidian: {charges: {remaining: itemFlags.charges.max}}}
					});
				}
			}
		}

		if (items.length > 0) {
			return this.updateManyOwnedItem(items);
		}

		return Promise.resolve();
	}

	async updateClasses (update) {
		const clsMap =
			new Map(this.data.obsidian.classes.map(cls => [cls.flags.obsidian.uuid, cls]));
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

		update['flags.obsidian.attributes.hd'] = this.updateHD(this.data.obsidian.classes);
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
			if (totals[cls.flags.obsidian.hd] === undefined) {
				totals[cls.flags.obsidian.hd] = 0;
			}

			totals[cls.flags.obsidian.hd] += cls.data.levels;
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
