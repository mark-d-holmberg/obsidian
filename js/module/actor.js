import Actor5e from '../../../../systems/dnd5e/module/actor/entity.js';
import {OBSIDIAN} from '../global.js';
import {Prepare} from '../rules/prepare.js';
import {prepareSpellcasting} from '../rules/spellcasting.js';
import {Rolls} from '../rules/rolls.js';
import {DND5E} from '../../../../systems/dnd5e/module/config.js';
import {Schema} from './schema.js';
import {prepareToggleableEffects} from '../rules/effects.js';
import {applyBonuses, applyProfBonus} from '../rules/bonuses.js';
import {prepareNPC} from '../rules/npc.js';
import {prepareDefenses} from '../rules/defenses.js';
import {Rules} from '../rules/rules.js';
import {Migrate} from '../migration/migrate.js';
import {Obsidian} from './obsidian.js';
import {ObsidianNPC} from './npc.js';
import {Partitioner} from '../util/partition.js';
import {Effect} from './effect.js';
import {Filters} from '../rules/filters.js';

export class ObsidianActor extends Actor5e {
	static _deriveLevelFromXP (data, derived) {
		let i = 0;
		for (; i < DND5E.CHARACTER_EXP_LEVELS.length; i++) {
			if (data.details.xp.value < DND5E.CHARACTER_EXP_LEVELS[i]) {
				break;
			}
		}

		const lowerBound = DND5E.CHARACTER_EXP_LEVELS[i - 1];
		const xp = data.details.xp;
		derived.details.level = i;
		xp.max = DND5E.CHARACTER_EXP_LEVELS[i];
		xp.pct = Math.floor(((xp.value - lowerBound) / (xp.max - lowerBound)) * 100);
	}

	prepareBaseData () {
		super.prepareBaseData();
		if (!OBSIDIAN.isMigrated()) {
			return;
		}

		if (!this.data.flags?.obsidian
			|| (this.data.flags.obsidian.version || 0) < Schema.VERSION)
		{
			Migrate.convertActor(this.data);
		}

		this.data.obsidian = {
			attacks: [],
			attributes: {init: {}},
			classes: [],
			components: new Map(),
			details: {},
			effects: new Map(),
			itemsByType: new Partitioner(game.system.entityTypes.Item),
			spellbook: {concentration: [], rituals: []},
			toggleable: [],
			triggers: {}
		};

		const data = this.data.data;
		const flags = this.data.flags.obsidian;
		const derived = this.data.obsidian;
		Rules.FEAT_TRIGGERS.forEach(trigger => derived.triggers[trigger] = []);

		if (this.data.type === 'vehicle') {
			data.attributes.prof = 0;
		}

		if (this.data.type === 'character') {
			data.attributes.hp.max = data.attributes.hp.max + flags.attributes.hpMaxMod;
			if (flags.details.milestone) {
				derived.details.level = data.details.level;
			} else {
				ObsidianActor._deriveLevelFromXP(data, derived);
			}
		} else {
			prepareNPC(flags, derived);
		}
	}

	prepareDerivedData () {
		super.prepareDerivedData();
		if (!OBSIDIAN.isMigrated()) {
			return;
		}

		const data = this.data.data;
		const flags = this.data.flags.obsidian;
		const derived = this.data.obsidian;
		derived.filters = {
			mods: Filters.mods(derived.toggleable),
			bonuses: Filters.bonuses(derived.toggleable),
			setters: Filters.setters(derived.toggleable)
		};

		if (this.data.type === 'character') {
			derived.details.class = ObsidianActor._classFormat(derived.classes);
		}

		let originalSkills;
		let originalSaves;

		if (this.isPolymorphed) {
			const transformOptions = this.getFlag('dnd5e', 'transformOptions');
			const original = game.actors?.get(this.getFlag('dnd5e', 'originalActor'));

			if (original) {
				if (transformOptions.mergeSaves) {
					originalSaves = original.data.data.abilities;
				}

				if (transformOptions.mergeSkills) {
					originalSkills = original.data.obsidian.skills;
				}
			}
		}

		this._prepareInventory(data, derived.inventory, derived.itemsByID);
		applyProfBonus(this.data);
		Prepare.abilities(this.data, data, flags, derived);
		Prepare.ac(data, flags, derived);
		Prepare.init(data, flags, derived);
		Prepare.conditions(data, flags, derived);

		if (this.data.type !== 'vehicle') {
			Prepare.skills(this.data, data, flags, derived, originalSkills);
			prepareSpellcasting(this.data, data, flags, derived);
		}

		Prepare.saves(this.data, data, flags, derived, originalSaves);
		Prepare.armour(data, flags, derived);

		if (this.data.type === 'character') {
			Prepare.hd(flags, derived);
			Prepare.tools(this.data, data, flags, derived);
		}

		prepareDefenses(this.data, flags);
		prepareToggleableEffects(this.data);
		applyBonuses(this.data, data, flags, derived);

		if (this.isToken) {
			// If we are preparing data right after an update, this.token
			// points to the old token that has since been replaced on the
			// canvas. We need to make sure we get the new token.
			canvas.tokens.get(this.token.data._id)?.drawEffects();
		} else if (canvas) {
			this.getActiveTokens(true).forEach(token => token.drawEffects());
		}
	}

	prepareEmbeddedEntities () {
		const derived = this.data.obsidian;
		const items = this.data.items || [];
		derived.itemsByType.partition(items, item => item.type);
		derived.itemsByID = new Map();
		this._enrichOwnedItems(derived, items);
		super.prepareEmbeddedEntities();

		if (!OBSIDIAN.isMigrated()) {
			return;
		}

		if (this.data.type === 'character') {
			derived.classes = derived.itemsByType.get('class').filter(item => item.flags.obsidian);
		}

		this._prepareItems(derived, items);
	}

	_enrichOwnedItems (derived, items) {
		// Owned items need to know their own index and be able to cross-
		// reference other items before they can be prepared properly.
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			derived.itemsByID.set(item._id, item);
			items.idx = i;
		}
	}

	_prepareItems (derived, items) {
		derived.magicalItems = [];
		derived.ammo = [];
		derived.inventory = {
			weight: 0,
			encumbered: false,
			attunements: 0,
			items: [],
			root: [],
			containers: []
		};

		for (const item of items) {
			const flags = item.flags.obsidian;
			if (['weapon', 'equipment'].includes(item.type) && flags?.magical) {
				derived.magicalItems.push(item);
			}

			if (flags && Rules.INVENTORY_ITEMS.has(item.type)
				&& (item.type !== 'weapon' || flags.type !== 'unarmed'))
			{
				derived.inventory.items.push(item);
			}

			const effects = flags?.effects || [];
			for (const effect of effects) {
				derived.effects.set(effect.uuid, effect);
				for (const component of effect.components) {
					derived.components.set(component.uuid, component);
				}

				const isToggleable = Object.values(effect.active).some(list => list.length);
				if (isToggleable && Effect.isActive(item.data, effect)) {
					derived.toggleable.push(effect);
				}
			}

			if (item.obsidian.collection.attack.length
				&& (item.type !== 'weapon' || item.data.equipped)
				&& (item.type !== 'spell' || item.obsidian.visible))
			{
				derived.attacks.push(...item.obsidian.collection.attack);
			}

			if (item.type === 'feat'
				&& item.data.activation.type === 'special'
				&& !OBSIDIAN.notDefinedOrEmpty(flags.trigger))
			{
				derived.triggers[flags.trigger].push(item);
			}

			if (item.type === 'consumable' && flags.subtype === 'ammo') {
				derived.ammo.push(item);
			}

			if (item.type === 'spell' && item.obsidian.visible) {
				if (item.data.concentration) {
					derived.spellbook.concentration.push(item);
				}

				if (item.data.components.ritual) {
					derived.spellbook.rituals.push(item);
				}
			}
		}
	}

	_prepareInventory (actorData, inventory, itemsByID) {
		for (const item of inventory.items) {
			const data = item.data;
			const flags = item.flags.obsidian;
			const derived = item.obsidian;
			const totalWeight = data.weight * (data.quantity || 1);

			if (flags.attunement && data.attuned) {
				inventory.attunements++;
			}

			const container = itemsByID.get(flags.parent);
			if (container) {
				container.obsidian.carriedWeight += totalWeight;
				if (!container.data.capacity.weightless) {
					inventory.weight += totalWeight;
				}

				if (item.type === 'backpack') {
					flags.parent = null;
					inventory.root.push(item);
				} else {
					container.obsidian.contents.push(item);
				}
			} else {
				inventory.weight += totalWeight;
				if (item.type === 'backpack') {
					inventory.containers.push(item);
				} else {
					inventory.root.push(item);
				}
			}

			derived.consumable = item.type === 'consumable';
			derived.equippable =
				item.type === 'weapon'
				|| (item.type === 'equipment' && Schema.EquipTypes.includes(flags.subtype));
		}

		inventory.weight +=
			Object.values(actorData.currency).reduce((acc, currency) => acc + currency, 0)
			* Rules.COIN_WEIGHT;

		if (inventory.weight >= actorData.abilities.str.value * Rules.CARRY_MULTIPLIER) {
			inventory.encumbered = true;
		}

		const sort = (a, b) => a.sort - b.sort;
		inventory.root.sort(sort);
		inventory.containers.sort(sort);
		inventory.containers.forEach(container => container.obsidian.contents.sort(sort));
	}

	/**
	 * @private
	 */
	_onDeleteEmbeddedEntity (embeddedName, deleted, options, userId) {
		super._onDeleteEmbeddedEntity(embeddedName, deleted, options, userId);
		if (!getProperty(deleted, 'flags.obsidian.effects.length')) {
			return;
		}

		const orphaned =
			deleted.flags.obsidian.effects
				.flatMap(e => e.components)
				.filter(c => c.type === 'spells')
				.flatMap(c => c.spells);

		if (orphaned.length) {
			this.deleteEmbeddedEntity(embeddedName, orphaned);
		}
	}

	async importFromJSON (json) {
		const data = Migrate.convertActor(JSON.parse(json));
		delete data._id;
		data.flags.obsidian.skills = duplicate(data.data.skills);

		return this.update(data);
	}

	importSpells (item) {
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
					c.spells.filter(spell => spell.flags.obsidian.isEmbedded).forEach(spell => {
						spell.flags.obsidian.source.item = item._id;
						spell.flags.obsidian.parentComponent = c.uuid;
					});

					const ownedSpells =
						await this.createEmbeddedEntity('OwnedItem', c.spells);
					c.spells = [].concat(ownedSpells).map(spell => spell._id);
				});

		if (pending.length) {
			OBSIDIAN.Queue.runLater(
				Promise.all(pending).then(() =>
					this.updateEmbeddedEntity(
						'OwnedItem', {_id: item._id, 'flags.obsidian.effects': effects})));
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
				item.flags.obsidian.source.other = item.flags.obsidian.source.text;
			} else {
				item.flags.obsidian.source.class = cls._id;
			}
		} else {
			const needle = item.flags.obsidian.source.class;
			const cls = this.data.obsidian.classes.find(cls => cls._id === needle);

			if (cls === undefined) {
				const byName = this.data.obsidian.classes.find(cls => cls.name === needle);
				if (byName === undefined) {
					const i18n = `OBSIDIAN.Class-${needle}`;
					item.flags.obsidian.source.type = 'other';
					item.flags.obsidian.source.other =
						getProperty(game.i18n.translations, i18n)
						|| getProperty(game.i18n._fallback, i18n)
						|| needle;
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

		return classes.sort((a, b) => b.data.levels - a.data.levels).map(cls =>
			(cls.data.subclass?.length ? `${cls.data.subclass} ` : '')
			+ `${cls.obsidian.label} ${cls.data.levels}`
		).join(' / ');
	}

	getItemParent (item) {
		return this.data.items.find(other => other._id === item?.flags.obsidian.parent);
	}

	rollHD (rolls) {
		const totalDice = rolls.reduce((acc, [n, _]) => acc + n, 0);
		const conBonus = this.data.data.abilities.con.mod * totalDice;
		const results = Rolls.hd(this, rolls, conBonus);
		const total = results.reduce((acc, die) => acc + die.total, 0);
		const hp = this.data.data.attributes.hp;
		const hd = duplicate(this.data.flags.obsidian.attributes.hd);

		let newHP = hp.value + total + conBonus;
		if (newHP > hp.max) {
			newHP = hp.max;
		}

		rolls.forEach(([n, d]) => {
			const obj = hd[`d${d}`];
			obj.value -= n;

			if (obj.value < 0) {
				obj.value = 0;
			}
		});

		this.update({'data.attributes.hp.value': newHP, 'flags.obsidian.attributes.hd': hd});
	}

	async shortRest (...args) {
		if (!(this.sheet instanceof Obsidian) && !(this.sheet instanceof ObsidianNPC)) {
			return super.shortRest(...args);
		}

		if (this.data.data.spells.pact) {
			await this.update({'data.spells.pact.value': this.data.data.spells.pact.max});
		}

		const itemUpdates = this._resourceUpdates(['short']);
		if (itemUpdates.length > 0) {
			return OBSIDIAN.updateManyOwnedItems(this, itemUpdates);
		}

		return Promise.resolve();
	}

	async longRest (...args) {
		if (!(this.sheet instanceof Obsidian) && !(this.sheet instanceof ObsidianNPC)) {
			return super.longRest(...args);
		}

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
				update[`data.spells.${level}.value`] = data.spells[level].max;
				update[`data.spells.${level}.tmp`] = 0;
			}
		}

		if (data.spells.pact) {
			update[`data.spells.pact.tmp`] = 0;
		}

		await this.update(update);
		const itemUpdates = this._resourceUpdates(['long', 'dawn', 'dusk']);

		if (itemUpdates.length > 0) {
			return OBSIDIAN.updateManyOwnedItems(this, itemUpdates);
		}

		return Promise.resolve();
	}

	async updateEquipment (deleted) {
		if (deleted) {
			const update = {};
			if (deleted.type === 'backpack') {
				deleted.obsidian.contents.forEach(item => {
					update[`items.${item.idx}.flags.obsidian.parent`] = null;
				});
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

	static fromSceneTokenPair (sceneID, tokenID) {
		const scene = game.scenes.get(sceneID);
		if (!scene) {
			return;
		}

		const tokenData = scene.getEmbeddedEntity('Token', tokenID);
		if (!tokenData) {
			return;
		}

		const token = new Token(tokenData);
		return token.actor;
	}

	static duplicateItem (original) {
		const dupe = duplicate(original);

		// Give all the effects and components new UUIDs, but maintain a
		// reference to what their original UUID was.
		const uuidMap = new Map();
		dupe.flags?.obsidian?.effects?.forEach(effect => {
			const newUUID = OBSIDIAN.uuid();
			uuidMap.set(effect.uuid, newUUID);
			effect.uuid = newUUID;

			effect.components.forEach(component => {
				const newUUID = OBSIDIAN.uuid();
				uuidMap.set(component.uuid, newUUID);
				component.uuid = newUUID;
			});
		});

		// Make sure all internal references point to the new UUIDs.
		dupe.flags?.obsidian?.effects?.flatMap(effect => effect.components).forEach(component => {
			if (!OBSIDIAN.notDefinedOrEmpty(component.ref)) {
				const newUUID = uuidMap.get(component.ref);
				if (newUUID) {
					component.ref = newUUID;
				}
			}
		});

		return dupe;
	}
}
