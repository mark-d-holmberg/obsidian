import Actor5e from '../../../../systems/dnd5e/module/actor/entity.js';
import {OBSIDIAN} from '../global.js';
import {Prepare} from '../rules/prepare.js';
import {prepareSpellcasting} from '../rules/spellcasting.js';
import {Rolls} from '../rules/rolls.js';
import {DND5E} from '../../../../systems/dnd5e/module/config.js';
import {Schema} from './schema.js';
import {prepareToggleableEffects} from '../rules/effects.js';
import {applyBonuses, applyProfBonus} from '../rules/bonuses.js';
import {prepareNPC, prepareNPCHD, prepareSpeed} from '../rules/npc.js';
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
			ammo: [],
			attributes: {init: {}, speed: {}},
			classes: [],
			components: new Map(),
			details: {},
			effects: new Map(),
			itemsByID: new Map(),
			itemsByType: new Partitioner(game.system.entityTypes.Item),
			magicalItems: [],
			rules: {},
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

	_collateOwnedItems (actorDerived, items) {
		actorDerived.inventory = {
			weight: 0,
			attunements: 0,
			items: [],
			root: [],
			containers: []
		};

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (!item.obsidian) {
				item.obsidian = {};
			}

			const data = item.data;
			const flags = item.flags.obsidian;
			const derived = item.obsidian;

			item.idx = i;
			actorDerived.itemsByID.set(item._id, item);
			derived.consumable = item.type === 'consumable';
			derived.equippable =
				item.type === 'weapon'
				|| (item.type === 'equipment' && Schema.EquipTypes.includes(flags?.subtype));

			if (item.type === 'consumable' && flags?.subtype === 'ammo') {
				actorDerived.ammo.push(item);
			}

			if (['weapon', 'equipment'].includes(item.type) && flags?.magical) {
				actorDerived.magicalItems.push(item);
			}

			if (flags && Rules.INVENTORY_ITEMS.has(item.type)
				&& (item.type !== 'weapon' || flags.type !== 'unarmed'))
			{
				actorDerived.inventory.items.push(item);
			}

			if (item.type === 'feat'
				&& data.activation.type === 'special'
				&& !OBSIDIAN.notDefinedOrEmpty(flags?.trigger))
			{
				actorDerived.triggers[flags.trigger].push(item);
			}

			if (item.type === 'spell' && derived.visible) {
				if (data.concentration) {
					actorDerived.spellbook.concentration.push(item);
				}

				if (data.components.ritual) {
					actorDerived.spellbook.rituals.push(item);
				}
			}

			if (item.type === 'backpack') {
				derived.contents = [];
				derived.carriedWeight = 0;
			}

			const effects = flags?.effects || [];
			for (const effect of effects) {
				actorDerived.effects.set(effect.uuid, effect);
				effect.filters = [];
				effect.active = {};
				effect.isApplied = false;
				Effect.metadata.active.forEach(c => effect.active[c] = []);

				for (const component of effect.components) {
					actorDerived.components.set(component.uuid, component);
					if (component.type === 'applied') {
						effect.isApplied = true;
					}

					if (Effect.metadata.active.has(component.type)) {
						effect.active[component.type].push(component);
					} else if (component.type === 'filter') {
						effect.filters.push(component);
					}
				}

				const isToggleable = Object.values(effect.active).some(list => list.length);
				if (isToggleable && Effect.isActive(item, effect)) {
					actorDerived.toggleable.push(effect);
				}
			}
		}
	}

	prepareEmbeddedEntities () {
		// Many items have a dependency on class items as their source, so they
		// need to be prepared first.
		this.data.items.filter(i => i.type === 'class').forEach(cls => {
			// Small patch to fix spell slot progression.
			if (!cls.flags.obsidian?.spellcasting?.enabled) {
				cls.data.spellcasting = 'none';
			}

			Item.createOwned(cls, this);
		});

		super.prepareEmbeddedEntities();
	}

	prepareDerivedData () {
		super.prepareDerivedData();
		if (!OBSIDIAN.isMigrated()) {
			return;
		}

		const data = this.data.data;
		const flags = this.data.flags.obsidian;
		const derived = this.data.obsidian;
		const items = (this.items || []).map(i => i.data);

		derived.itemsByType.partition(items, item => item.type);
		this._collateOwnedItems(derived, items);

		if (this.data.type === 'character') {
			derived.classes = derived.itemsByType.get('class').filter(item => item.flags.obsidian);
		}

		derived.filters = {
			mods: Filters.mods(derived.toggleable),
			bonuses: Filters.bonuses(derived.toggleable),
			setters: Filters.setters(derived.toggleable),
			conditions: Filters.conditions(derived.toggleable),
			multipliers: Filters.multipliers(derived.toggleable)
		};

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
		Prepare.armour(data, flags, derived);
		Prepare.init(data, flags, derived);
		Prepare.conditions(this.data, data, flags, derived);

		if (this.data.type !== 'vehicle') {
			Prepare.skills(this.data, data, flags, derived, originalSkills);
		}

		Prepare.saves(this.data, data, flags, derived, originalSaves);
		Prepare.encumbrance(this.data, data, derived);

		if (this.data.type === 'character') {
			Prepare.hd(flags, derived);
			Prepare.tools(this.data, data, flags, derived);
		} else if (this.data.type === 'npc') {
			prepareNPCHD(data, flags, derived);
		}

		// We have a complicated preparation workflow where item and actor
		// preparation depend on each other. So we must prepare items once,
		// then perform some actor preparation, then prepare the items again
		// with the now-updated actor data.
		const nonClassItems = this.items.reduce((acc, item) => {
			// Make sure we prepare class items first.
			if (item.data.type === 'class') {
				item.prepareObsidianEffects();
				return acc;
			}

			acc.push(item);
			return acc;
		}, []);

		nonClassItems.forEach(item => item.prepareObsidianEffects());

		for (const [id, abl] of Object.entries(data.abilities)) {
			abl.mod = Math.floor((derived.abilities[id].value - 10) / 2);
		}

		if (this.data.type === 'character') {
			derived.details.class = ObsidianActor._classFormat(derived.classes);
		}

		if (this.data.type !== 'vehicle') {
			prepareSpellcasting(this.data, data, flags, derived);
		}

		derived.attacks =
			this.items.filter(item =>
				item.data.obsidian?.collection.attack.length
				&& (item.data.type !== 'weapon' || item.data.data.equipped)
				&& (item.data.type !== 'spell' || item.data.obsidian?.visible))
				.flatMap(item => item.data.obsidian.collection.attack);

		prepareDefenses(data, flags, derived);
		prepareToggleableEffects(this.data);
		applyBonuses(this.data, data, flags, derived);

		if (this.data.type === 'npc') {
			prepareSpeed(data, derived);
		}

		if (this.isToken) {
			// If we are preparing data right after an update, this.token
			// points to the old token that has since been replaced on the
			// canvas. We need to make sure we get the new token.
			canvas.tokens.get(this.token.data._id)?.drawEffects().catch(() => {});
		} else if (canvas) {
			this.getActiveTokens(true).forEach(token => token.drawEffects().catch(() => {}));
		}
	}

	_prepareInventory (actorData, inventory, itemsByID) {
		for (const item of inventory.items) {
			const data = item.data;
			const flags = item.flags.obsidian;
			const totalWeight = (data.weight || 0) * (data.quantity ?? 1);

			if (flags.attunement && data.attuned) {
				inventory.attunements++;
			}

			const container = itemsByID.get(flags.parent);
			if (container) {
				container.obsidian.carriedWeight += totalWeight;
				if (!container.data.capacity.weightless && container.data.equipped !== false) {
					inventory.weight += totalWeight;
				}

				if (item.type === 'backpack') {
					flags.parent = null;
					inventory.root.push(item);
				} else {
					container.obsidian.contents.push(item);
				}
			} else {
				if (item.type !== 'backpack' || item.data.equipped !== false) {
					inventory.weight += totalWeight;
				}

				if (item.type === 'backpack') {
					inventory.containers.push(item);
				} else {
					inventory.root.push(item);
				}
			}
		}

		if (game.settings.get('dnd5e', 'currencyWeight')) {
			const coins =
				Object.values(actorData.currency).reduce((acc, currency) =>
					acc + Math.max(currency, 0), 0);

			inventory.weight += coins / CONFIG.DND5E.encumbrance.currencyPerWeight;
		}

		const sort = (a, b) => a.sort - b.sort;
		inventory.root.sort(sort);
		inventory.containers.sort(sort);
		inventory.containers.forEach(container => container.obsidian.contents.sort(sort));
	}

	async deleteEmbeddedEntity (embeddedName, data, options = {}) {
		let deleted = await super.deleteEmbeddedEntity(embeddedName, data, options);
		deleted = Array.isArray(deleted) ? deleted : [deleted];

		if (embeddedName === 'OwnedItem') {
			const orphanedSpells =
				deleted.flatMap(item => item.flags.obsidian?.effects || [])
					.flatMap(e => e.components)
					.filter(c => c.type === 'spells')
					.flatMap(c => c.spells)
					.filter(spell => typeof spell === 'string');

			if (orphanedSpells.length) {
				await this.deleteEmbeddedEntity('OwnedItem', orphanedSpells, options);
			}
		}

		return deleted;
	}

	async importFromJSON (json) {
		const data = Migrate.convertActor(JSON.parse(json));
		delete data._id;
		data.flags.obsidian.skills = duplicate(data.data.skills);

		return this.update(data);
	}

	async createEmbeddedEntity (embeddedName, data, options = {}) {
		if (embeddedName !== 'OwnedItem') {
			return super.createEmbeddedEntity(embeddedName, data, options);
		}

		let items = await super.createEmbeddedEntity('OwnedItem', data, options);
		items = Array.isArray(items) ? items : [items];

		let spells = this._importSpellsFromItem(data, options, items);
		if (spells.length) {
			const updates = [];
			spells = await this.createEmbeddedEntity('OwnedItem', spells, options);
			spells = Array.isArray(spells) ? spells : [spells];

			for (const parentItem of items) {
				const effects = duplicate(parentItem.flags.obsidian?.effects || []);
				const components =
					effects.flatMap(e => e.components).filter(Effect.isEmbeddedSpellsComponent);

				if (!components?.length) {
					continue;
				}

				updates.push({_id: parentItem._id, 'flags.obsidian.effects': effects});
				for (const component of components) {
					component.spells =
						spells.filter(spell =>
							spell.flags.obsidian.parentComponent === component.uuid)
							.map(spell => spell._id);
				}
			}

			if (updates.length) {
				await this.updateEmbeddedEntity('OwnedItem', updates);
			}
		}

		return items.length === 1 ? items[0] : items;
	}

	_importSpellsFromItem (data, {temporary = false} = {}, items) {
		const spells = [];
		if (temporary) {
			return spells;
		}

		for (const item of items) {
			if (!getProperty(item, 'flags.obsidian.effects.length')) {
				continue;
			}

			const effects = duplicate(item.flags.obsidian.effects);
			spells.push(
				...effects.flatMap(e => e.components)
					.filter(c =>
						Effect.isEmbeddedSpellsComponent(c)
						&& typeof c.spells[0] === 'object')
					.flatMap(c =>
						c.spells.filter(spell => spell.flags.obsidian.isEmbedded).map(spell => {
							spell.flags.obsidian.source.item = item._id;
							spell.flags.obsidian.parentComponent = c.uuid;
							return spell;
						})));
		}

		return spells;
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
						cls.obsidian.label.toLowerCase() === needle);

				c.class = cls ? cls._id : '';
			});

		if (!item.flags.obsidian.source || item.flags.obsidian.source.type !== 'class') {
			return;
		}

		if (!OBSIDIAN.notDefinedOrEmpty(item.flags.obsidian.source.text)) {
			const needle = item.flags.obsidian.source.text.toLowerCase();
			const cls =
				this.data.obsidian.classes.find(cls =>
					cls.obsidian.label.toLowerCase() === needle);

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
		return this.items.get(item?.flags.obsidian.parent)?.data;
	}

	isRuleActive (rule) {
		return ObsidianActor.isRuleActive(this.data, rule);
	}

	static isRuleActive (actorData, rule) {
		const derived = actorData.obsidian;
		const flags = actorData.flags.obsidian;
		return (!flags?.rules || flags.rules[rule] !== false) && derived.rules[rule] === true;
	}

	rollHD (rolls) {
		const totalDice = rolls.reduce((acc, [n, _]) => acc + n, 0);
		const conBonus = this.data.data.abilities.con.mod * totalDice;
		const total = Rolls.hd(this, rolls, conBonus);
		const hp = this.data.data.attributes.hp;
		const hd = duplicate(this.data.flags.obsidian.attributes.hd);

		let newHP = hp.value + total;
		if (newHP > hp.max) {
			newHP = hp.max;
		}

		rolls.forEach(([n, d]) => {
			let obj = hd[`d${d}`];
			if (this.data.type === 'npc') {
				obj = hd;
			}

			obj.value -= n;

			if (obj.value < 0) {
				obj.value = 0;
			}
		});

		this.update({'data.attributes.hp.value': newHP, 'flags.obsidian.attributes.hd': hd});
	}

	rollHP (takeAverage) {
		const totalDice = this.data.flags.obsidian.attributes.hd.max;
		if (!totalDice) {
			return;
		}

		let total;
		const hd = this.data.obsidian.attributes.hd;

		if (takeAverage) {
			const average = hd.die / 2 + .5;
			total = Math.floor(average * totalDice + hd.const);
		} else {
			total = Rolls.hp(this, totalDice, hd.die, hd.const);
		}

		this.update({'data.attributes.hp': {value: total, max: total}});
	}

	get temporaryEffects () {
		const existingEffects = super.temporaryEffects.filter(effect => {
			const id = effect.getFlag('core', 'statusId');
			return !id?.startsWith('exhaust');
		});

		const effects =
			(this.data.obsidian?.toggleable || [])
				.filter(effect => effect.activeEffect && effect.toggle.active)
				.map(effect => effect.img);

		const conditions = this.data.obsidian?.conditions || {};
		if (conditions.concentrating) {
			effects.push('modules/obsidian/img/conditions/concentrating.svg');
		}

		if (conditions.exhaustion) {
			effects.push(`modules/obsidian/img/conditions/exhaust${conditions.exhaustion}.svg`);
		}

		const existingConditions =
			new Set(
				existingEffects.map(effect => effect.getFlag('core', 'statusId')).filter(_ => _));

		effects.push(
			...Rules.CONDITIONS
				.filter(condition => conditions[condition] && !existingConditions.has(condition))
				.map(condition => `modules/obsidian/img/conditions/${condition}.svg`));

		return Array.from(new Set(effects).values()).map(icon => {
			return {data: {icon: icon}, getFlag: () => false};
		}).concat(existingEffects);
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

		update['data.attributes.hp.value'] = data.attributes.hp.max;

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

		if (this.data.type === 'npc') {
			const hd = flags.attributes.hd;
			if (hd.max) {
				let expended = hd.max - hd.value;
				if (isNaN(expended) || expended < 0) {
					expended = 0;
				}

				if (expended > 0) {
					const recovered = Math.min(Math.floor(hd.max / 2), expended);
					update[`flags.obsidian.attributes.hd.value`] = hd.value + recovered;
				}
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
			if (deleted.data.type === 'backpack') {
				deleted.data.obsidian.contents.forEach(item => {
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
		for (const item of this.items) {
			if (!getProperty(item.data, 'flags.obsidian.effects.length')) {
				continue;
			}

			const updates = {_id: item.data._id};
			for (const effect of item.data.flags.obsidian.effects) {
				for (const component of effect.components) {
					if (component.type !== 'resource'
						|| !validTimes.includes(component.recharge.time)
						|| component.remaining === component.max)
					{
						continue;
					}

					this._recharge(item.data, effect, component, updates);
				}
			}

			if (Object.keys(updates).length > 1) {
				itemUpdates.push(OBSIDIAN.updateArrays(item.data, updates));
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

			if (component.tables?.length) {
				component.tables.forEach(table =>
					table.flags.obsidian.parentComponent =
						uuidMap.get(table.flags.obsidian.parentComponent));
			}
		});

		return dupe;
	}
}
