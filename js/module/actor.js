import {Actor5e} from '../../../../systems/dnd5e/module/actor/entity.js';
import {OBSIDIAN} from '../rules/rules.js';
import {Prepare} from '../rules/prepare.js';
import {prepareInventory} from '../rules/inventory.js';
import {prepareSpells} from '../rules/spells.js';
import {prepareSpellcasting} from '../rules/spellcasting.js';
import {Rolls} from '../rules/rolls.js';
import {DND5E} from '../../../../systems/dnd5e/module/config.js';
import {Schema} from './schema.js';
import {prepareEffects} from './item.js';

export class ObsidianActor extends Actor5e {
	prepareData () {
		super.prepareData();
		if (this.data.type === 'npc') {
			return this.data;
		}

		if (!this.data.flags
			|| !this.data.flags.obsidian
			|| (this.data.flags.obsidian.version || 0) < Schema.VERSION)
		{
			// This actor needs migrating.
			return this.data;
		}

		const data = this.data.data;
		const flags = this.data.flags.obsidian;

		this.data.obsidian = {};
		this.data.obsidian.classes =
			this.data.items.filter(item => item.type === 'class' && item.flags.obsidian);

		data.attributes.hp.maxAdjusted = data.attributes.hp.max + flags.attributes.hpMaxMod;
		data.details.level.value = 0;

		for (const cls of Object.values(this.data.obsidian.classes)) {
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

		if (flags.details.milestone) {
			data.details.level.max = data.details.level.value;
		} else {
			let i = 0;
			for (; i < DND5E.CHARACTER_EXP_LEVELS.length; i++) {
				if (data.details.xp.value < DND5E.CHARACTER_EXP_LEVELS[i]) {
					break;
				}
			}

			const lowerBound = DND5E.CHARACTER_EXP_LEVELS[i - 1];
			data.details.level.max = i;
			data.details.xp.max = DND5E.CHARACTER_EXP_LEVELS[i];
			data.details.xp.pct =
				Math.floor(
					((data.details.xp.value - lowerBound) / (data.details.xp.max - lowerBound))
					* 100);
		}

		this.data.obsidian.classFormat = ObsidianActor._classFormat(this.data.obsidian.classes);
		data.attributes.prof = Math.floor((data.details.level.value + 7) / 4);
		data.attributes.init.mod =
			data.abilities[flags.attributes.init.ability].mod
			+ data.attributes.init.value;

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

		this.data.obsidian.profs = {
			armour: flags.traits.profs.custom.armour,
			weapons: flags.traits.profs.custom.weapons,
			langs: flags.traits.profs.custom.langs
		};

		this.data.obsidian.magicalItems =
			this.data.items.filter(item =>
				(item.type === 'weapon' || item.type === 'equipment')
				&& getProperty(item, 'flags.obsidian.magical'));

		Prepare.defenses(flags);
		Prepare.hd(this.data);
		Prepare.skills(this.data, data, flags);
		Prepare.tools(this.data, data, flags);
		Prepare.saves(this.data, data, flags);
		prepareSpellcasting(this.data, flags);
		prepareInventory(this.data);
		Prepare.features(this.data);
		Prepare.consumables(this.data);
		Prepare.weapons(this.data);
		Prepare.armour(this.data);
		prepareSpells(this.data);

		this.data.obsidian.attacks = [];
		this.data.obsidian.effects = new Map();
		this.data.obsidian.components = new Map();

		for (const item of this.data.items) {
			prepareEffects(
				this, item, this.data.obsidian.attacks, this.data.obsidian.effects,
				this.data.obsidian.components);
		}

		return this.data;
	}

	importSpells (item) {
		if (!item.flags || !item.flags.obsidian || !item.flags.obsidian.effects) {
			return;
		}

		const newSpells = [];
		item.flags.obsidian.effects
			.flatMap(e => e.components)
			.filter(c => c.type === 'spells' && c.source === 'individual')
			.forEach(c => {
				c.spells = c.spells.map(spell => {
					if (typeof spell === 'object') {
						newSpells.push(spell);
						return spell._id;
					}

					return spell;
				});
			});

		if (newSpells.length) {
			this.createManyEmbeddedEntities('OwnedItem', newSpells);
		}
	}

	linkClasses (item) {
		if (!item.flags || !item.flags.obsidian) {
			return;
		}

		item.flags.obsidian.effects
			.flatMap(e => e.components)
			.filter(c => !OBSIDIAN.notDefinedOrEmpty(c.text))
			.forEach(c => {
				const needle = c.text.toLowerCase();
				const cls =
					this.data.obsidian.classes.find(cls =>
						cls.flags.obsidian.label.toLowerCase() === needle);

				c.class = cls ? cls._id : '';
			});

		if (!item.flags.obsidian.source || item.flags.obsidian.source.type !== 'class') {
			return;
		}

		if (!OBSIDIAN.notDefinedOrEmpty(item.flags.obsidian.source.text)) {
			const needle = item.flags.obsidian.source.text.toLowerCase();
			const cls =
				this.data.obsidian.classes.find(cls =>
					cls.flags.obsidian.label.toLowerCase() === needle);

			if (cls === undefined) {
				item.flags.obsidian.source.type = 'other';
				item.flags.obsidian.source.other = item.flags.obsidian.source.custom;
			} else {
				item.flags.obsidian.source.class = cls._id;
			}
		} else {
			const needle = item.flags.obsidian.source.class;
			const cls = this.data.obsidian.classes.find(cls => cls._id === needle);

			if (cls === undefined) {
				const byName = this.data.obsidian.classes.find(cls => cls.name === needle);
				if (byName === undefined) {
					item.flags.obsidian.source.type = 'other';
					item.flags.obsidian.source.other =
						game.i18n.localize(`OBSIDIAN.Class-${needle}`);
				} else {
					item.flags.obsidian.source.class = byName._id;
				}
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

	getItemParent (item) {
		return this.data.items.find(other => other._id === item.flags.obsidian.parent);
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
					_id: feat._id,
					flags: {obsidian: {uses: {remaining: flags.uses.max}}}
				});
			}
		}

		if (items.length > 0) {
			return this.updateManyEmbeddedEntities('OwnedItem', items);
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
				let newValue = hd.value + Math.floor(hd.max / 2);
				if (newValue <= hd.max) {
					update[`flags.obsidian.attributes.hd.${die}.value`] = newValue;
				}
			}
		}

		for (const level of Object.keys(data.spells)) {
			if (level.startsWith('spell')) {
				update[`data.spells.${level}.value`] = 0;
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
					_id: item._id,
					flags: {obsidian: {uses: {remaining: itemFlags.uses.max}}}
				});
			}

			if (item.type === 'weapon' && itemFlags.charges && itemFlags.charges.enabled) {
				if (itemFlags.charges.rechargeType === 'formula') {
					const recharge = Rolls.recharge(item);
					let remaining =
						itemFlags.charges.remaining + recharge.flags.obsidian.results[0][0].total;

					if (remaining > itemFlags.charges.max) {
						remaining = itemFlags.charges.max;
					}

					Rolls.toChat(this, recharge);
					items.push({
						_id: item._id,
						flags: {obsidian: {charges: {remaining: remaining}}}
					});
				} else {
					items.push({
						_id: item._id,
						flags: {obsidian: {charges: {remaining: itemFlags.charges.max}}}
					});
				}
			}
		}

		if (items.length > 0) {
			return this.updateManyEmbeddedEntities('OwnedItem', items);
		}

		return Promise.resolve();
	}

	async updateEquipment (deleted) {
		if (deleted) {
			const update = {};
			const parent = this.data.items.find(item => item._id === deleted.flags.obsidian.parent);

			if (deleted.type === 'backpack') {
				deleted.flags.obsidian.contents.forEach(item => {
					update[`items.${item.idx}.flags.obsidian.parent`] = null;
					this.data.flags.obsidian.order.equipment.root.push(item._id);
				});

				update['flags.obsidian.order.equipment.root'] =
					duplicate(this.data.flags.obsidian.order.equipment.root);
			}

			if (parent == null) {
				const bucket = deleted.type === 'backpack' ? 'containers' : 'root';
				const idx = this.data.flags.obsidian.order.equipment[bucket].indexOf(deleted._id);
				this.data.flags.obsidian.order.equipment[bucket].splice(idx, 1);
				update[`flags.obsidian.order.equipment.${bucket}`] =
					duplicate(this.data.flags.obsidian.order.equipment[bucket]);
			} else {
				const idx = parent.flags.obsidian.order.indexOf(deleted._id);
				parent.flags.obsidian.order.splice(idx, 1);
				update[`items.${parent.idx}.flags.obsidian.order`] =
					duplicate(parent.flags.obsidian.order);
			}

			await this.update(OBSIDIAN.updateArrays(this.data, update));
		}
	}
}
