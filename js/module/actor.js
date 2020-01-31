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
import {prepareToggleableEffects} from '../rules/effects.js';
import {applyBonuses} from '../rules/bonuses.js';
import {Filters} from '../rules/filters.js';
import {filterToggleable} from '../rules/toggleable.js';

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

		data.attributes.ac.min =
			flags.attributes.ac.base
			+ data.abilities[flags.attributes.ac.ability1].mod
			+ (flags.attributes.ac.ability2 ? data.abilities[flags.attributes.ac.ability2].mod : 0)
			+ flags.attributes.ac.mod;

		if (!OBSIDIAN.notDefinedOrEmpty(flags.attributes.ac.override)) {
			data.attributes.ac.min = Number(flags.attributes.ac.override);
		}

		this.data.obsidian.magicalItems =
			this.data.items.filter(item =>
				(item.type === 'weapon' || item.type === 'equipment')
				&& getProperty(item, 'flags.obsidian.magical'));

		this.data.obsidian.attacks = [];
		this.data.obsidian.effects = new Map();
		this.data.obsidian.components = new Map();

		// Convert it to an array here so it doesn't get nuked when duplicated.
		this.data.obsidian.toggleable = Array.from(new Set(filterToggleable(this.data)).values());
		this.data.obsidian.filters = {
			mods: Filters.mods(this.data.obsidian.toggleable),
			bonuses: Filters.bonuses(this.data.obsidian.toggleable)
		};

		prepareInventory(this.data);
		Prepare.abilities(this.data);
		Prepare.defenses(flags);
		Prepare.hd(this.data);
		Prepare.skills(this.data, data, flags);
		Prepare.tools(this.data, data, flags);
		Prepare.saves(this.data, data, flags);
		prepareSpellcasting(this.data, flags);
		Prepare.features(this.data);
		Prepare.consumables(this.data);
		Prepare.weapons(this.data);
		Prepare.armour(this.data);
		prepareSpells(this.data);

		for (const item of this.data.items) {
			prepareEffects(
				this, item, this.data.obsidian.attacks, this.data.obsidian.effects,
				this.data.obsidian.components);
		}

		prepareToggleableEffects(this.data);
		applyBonuses(this.data);
		return this.data;
	}

	/**
	 * @private
	 */
	_onDeleteEmbeddedEntity ({embeddedName, deleted, options, userId}) {
		super._onDeleteEmbeddedEntity({embeddedName, deleted, options, userId});
		if (!getProperty(deleted, 'flags.obsidian.effects.length')) {
			return;
		}

		const orphaned =
			deleted.flags.obsidian.effects
				.flatMap(e => e.components)
				.filter(c => c.type === 'spells')
				.flatMap(c => c.spells);

		if (orphaned.length) {
			this.deleteManyEmbeddedEntities(embeddedName, orphaned);
		}
	}

	async importSpells (item) {
		if (!getProperty(item, 'flags.obsidian.effects.length')) {
			return;
		}

		const effects = duplicate(item.flags.obsidian.effects);
		const pending =
			effects.flatMap(e => e.components)
				.filter(c =>
					c.type === 'spells'
					&& c.source === 'individual'
					&& c.spells.length
					&& typeof c.spells[0] === 'object')
				.map(async c => {
					const ownedSpells =
						await this.createManyEmbeddedEntities('OwnedItem', c.spells);
					c.spells = ownedSpells.map(spell => spell._id);
				});

		if (pending.length) {
			await Promise.all(pending);
			this.updateEmbeddedEntity(
				'OwnedItem', {_id: item._id, 'flags.obsidian.effects': effects});
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

		const itemUpdates = this._resourceUpdates(['short']);
		if (itemUpdates.length > 0) {
			return this.updateManyEmbeddedEntities('OwnedItem', itemUpdates);
		}

		return Promise.resolve();
	}

	async longRest () {
		await this.shortRest();
		const data = this.data.data;
		const flags = this.data.flags.obsidian;
		const update = {};

		update['data.attributes.hp.value'] = data.attributes.hp.maxAdjusted;

		const hds = duplicate(flags.attributes.hd);
		Object.values(hds)
			.filter(hd => !OBSIDIAN.notDefinedOrEmpty(hd.override))
			.forEach(hd => hd.max = Number(hd.override));

		const totalHD = Object.values(hds).reduce((acc, hd) => acc + hd.max, 0);
		const hdToRecover = Math.max(1, Math.floor(totalHD / 2));
		let recoveredHD = 0;

		// Recover largest HD first.
		for (const [die, hd] of
			Object.entries(hds)
				.filter(([, hd]) => hd.max > 0 && hd.value < hd.max)
				.sort((a, b) => b[0] - a[0]))
		{
			const diff = hd.max - hd.value;
			const recovered = Math.clamped(diff, 1, hdToRecover - recoveredHD);
			recoveredHD += recovered;
			update[`flags.obsidian.attributes.hd.${die}.value`] = hd.value + recovered;

			if (recoveredHD >= hdToRecover) {
				break;
			}
		}

		for (const level of Object.keys(data.spells)) {
			if (level.startsWith('spell')) {
				update[`data.spells.${level}.value`] = 0;
			}
		}

		await this.update(update);
		const itemUpdates = this._resourceUpdates(['long', 'dawn', 'dusk']);

		if (itemUpdates.length > 0) {
			return this.updateManyEmbeddedEntities('OwnedItem', itemUpdates);
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

	/**
	 * @private
	 */
	_recharge (item, effect, component, updates) {
		const updateKey =
			`flags.obsidian.effects.${effect.idx}.components.${component.idx}.remaining`;

		if (component.recharge.calc === 'all') {
			updates[updateKey] = component.max;
		} else {
			const recharge = Rolls.recharge(item, effect, component);
			const remaining =
				Math.clamped(
					component.remaining + recharge.flags.obsidian.results[0][0].total,
					0, component.max);

			Rolls.toChat(this, recharge);
			updates[updateKey] = remaining;
		}
	}

	/**
	 * @private
	 */
	_resourceUpdates (validTimes) {
		const itemUpdates = [];
		for (const item of this.data.items) {
			if (!getProperty(item, 'flags.obsidian.effects.length')) {
				continue;
			}

			const updates = {_id: item._id};
			for (const effect of item.flags.obsidian.effects) {
				for (const component of effect.components) {
					if (component.type !== 'resource'
						|| !validTimes.includes(component.recharge.time)
						|| component.remaining === component.max)
					{
						continue;
					}

					this._recharge(item, effect, component, updates);
				}
			}

			if (Object.keys(updates).length > 1) {
				itemUpdates.push(OBSIDIAN.updateArrays(item, updates));
			}
		}

		return itemUpdates;
	}
}
