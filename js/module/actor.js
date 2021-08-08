import Actor5e from '../../../../systems/dnd5e/module/actor/entity.js';
import {OBSIDIAN} from '../global.js';
import {Prepare} from '../data/prepare.js';
import {prepareSpellcasting} from '../data/spellcasting.js';
import {Rolls} from './rolls.js';
import {DND5E} from '../../../../systems/dnd5e/module/config.js';
import {Schema} from '../data/schema.js';
import {prepareToggleableEffects} from '../data/effects.js';
import {applyBonuses, applyProfBonus} from '../data/bonuses.js';
import {prepareNPC, prepareNPCHD, prepareSpeed} from '../data/npc.js';
import {prepareDefenseDisplay, prepareDefenses} from '../data/defenses.js';
import {Config} from '../data/config.js';
import {Migrate} from '../migration/migrate.js';
import {ObsidianNPC} from '../sheets/npc.js';
import {Effect} from './effect.js';
import {Filters} from '../data/filters.js';
import {ObsidianCharacter} from '../sheets/obsidian.js';
import {ObsidianActorDerived} from './derived.js';

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

	get obsidian () {
		return this.data.obsidian;
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

		this.data.obsidian = new ObsidianActorDerived();
		const data = this.data.data;
		const flags = this.data.flags.obsidian;
		const derived = this.data.obsidian;
		Config.FEAT_TRIGGERS.forEach(trigger => derived.triggers[trigger] = []);

		if (this.data.type === 'vehicle') {
			data.attributes.prof = 0;
		}

		if (this.data.type === 'character') {
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
		let i = 0;
		for (const item of items) {
			const data = item.data.data;
			const flags = item.data.flags.obsidian;
			const derived = item.data.obsidian;

			item.data.idx = i++;
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

			if (flags && Config.INVENTORY_ITEMS.has(item.type)
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

	prepareDerivedData () {
		super.prepareDerivedData();
		if (!OBSIDIAN.isMigrated()) {
			return;
		}

		const data = this.data.data;
		const flags = this.data.flags.obsidian;
		const derived = this.data.obsidian;

		derived.itemsByType.partition(this.items.values(), item => item.type);
		this._collateOwnedItems(derived, this.items.values());

		if (this.data.type === 'character') {
			derived.classes =
				derived.itemsByType.get('class').filter(item => item.isObsidian());
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

		data.attributes.hp.max += data.attributes.hp.tempmax;
		this._prepareInventory(data, derived.inventory);
		applyProfBonus(this);
		Prepare.abilities(this, data, flags, derived);
		Prepare.ac(data, flags);
		Prepare.armour(data, flags, derived);
		Prepare.init(data, flags, derived);
		prepareDefenses(data, flags, derived);
		Prepare.conditions(this, data, flags, derived);

		if (this.type !== 'vehicle') {
			Prepare.skills(this, data, flags, derived, originalSkills);
		}

		Prepare.saves(this, data, flags, derived, originalSaves);
		Prepare.encumbrance(this, data, derived);

		if (this.type === 'character') {
			Prepare.hd(flags, derived);
			Prepare.tools(this, data, flags, derived);
		} else if (this.type === 'npc') {
			prepareNPCHD(data, flags, derived);
		}

		// We have a complicated preparation workflow where item and actor
		// preparation depend on each other. So we must prepare items once,
		// then perform some actor preparation, then prepare the items again
		// with the now-updated actor data.
		const nonClassItems = this.items.reduce((acc, item) => {
			// Make sure we prepare class items first.
			if (item.type === 'class') {
				if (!item.getFlag('obsidian', 'spellcasting.enabled')) {
					item.data.data.spellcasting = {progression: 'none', ability: ''};
				}

				item.prepareObsidianEffects();
				return acc;
			}

			acc.push(item);
			return acc;
		}, []);

		nonClassItems.forEach(item => item.prepareObsidianEffects());

		if (this.type === 'character') {
			derived.details.class = ObsidianActor._classFormat(derived.classes);
		}

		if (this.type !== 'vehicle') {
			prepareSpellcasting(this.data, data, flags, derived);
		}

		derived.attacks =
			this.items.filter(item =>
					item.obsidian?.collection.attack.length
					&& (item.type !== 'weapon' || item.data.data.equipped)
					&& (item.type !== 'spell' || item.obsidian?.visible))
				.flatMap(item => item.obsidian.collection.attack);

		prepareDefenseDisplay(derived);
		prepareToggleableEffects(this);
		applyBonuses(this, data, flags, derived);

		if (this.type === 'npc') {
			prepareSpeed(data, derived);
		}

		if (this.isToken) {
			// If we are preparing data right after an update, this.token
			// points to the old token that has since been replaced on the
			// canvas. We need to make sure we get the new token.
			const token = canvas.tokens.get(this.token.id);

			// Need to be careful to not initialise a new synthetic actor if
			// one doesn't exist yet, as this causes an infinite preparation
			// loop.
			if (token?._actor != null) {
				token?.drawEffects().catch(() => {});
				token?.drawBars();
			}
		} else if (canvas) {
			this.getActiveTokens(true).forEach(token => {
				token.drawEffects().catch(() => {});
				token.drawBars();
			});
		}
	}

	_prepareInventory (actorData, inventory) {
		for (const item of inventory.items) {
			const data = item.data.data;
			const flags = item.data.flags.obsidian;
			const totalWeight = (data.weight || 0) * (data.quantity ?? 1);

			if (flags.attunement && data.attuned) {
				inventory.attunements++;
			}

			const container = this.items.get(flags.parent);
			if (container) {
				container.obsidian.carriedWeight += totalWeight;
				if (!container.data.data.capacity.weightless
					&& container.data.data.equipped !== false)
				{
					inventory.weight += totalWeight;
				}

				if (item.type === 'backpack') {
					flags.parent = null;
					inventory.root.push(item);
				} else {
					container.obsidian.contents.push(item);
				}
			} else {
				if (item.type !== 'backpack' || data.equipped !== false) {
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

			inventory.weight += coins / CONFIG.DND5E.encumbrance.currencyPerWeight.imperial;
		}

		const sort = (a, b) => a.data.sort - b.data.sort;
		inventory.root.sort(sort);
		inventory.containers.sort(sort);
		inventory.containers.forEach(container => container.obsidian.contents.sort(sort));
	}

	async createEmbeddedDocuments (embeddedName, data, options = {}) {
		if (embeddedName !== 'Item') {
			return super.createEmbeddedDocuments(embeddedName, data, options);
		}

		let items = await super.createEmbeddedDocuments('Item', data, options);
		let spells = this._importSpellsFromItem(data, options, items);

		if (!spells.length) {
			return items;
		}

		const updates = [];
		spells = await this.createEmbeddedDocuments('Item', spells, options);

		for (const parentItem of items) {
			const effects = duplicate(parentItem.data._source.flags.obsidian?.effects || []);
			const components =
				effects.flatMap(e => e.components).filter(Effect.isEmbeddedSpellsComponent);

			if (!components?.length) {
				continue;
			}

			updates.push({_id: parentItem.id, 'flags.obsidian.effects': effects});
			for (const component of components) {
				component.spells =
					spells
						.filter(spell =>
							spell.data.flags.obsidian.parentComponent === component.uuid)
						.map(spell => spell.id);
			}
		}

		if (updates.length) {
			await this.updateEmbeddedDocuments('Item', updates);
		}

		return items;
	}

	_importSpellsFromItem (data, {temporary = false} = {}, items) {
		const spells = [];
		if (temporary) {
			return spells;
		}

		for (const item of items) {
			const effects = item.getFlag('obsidian', 'effects');
			if (!effects?.length) {
				continue;
			}

			spells.push(
				...effects.flatMap(e => e.components)
					.filter(c =>
						Effect.isEmbeddedSpellsComponent(c)
						&& typeof c.spells[0] === 'object')
					.flatMap(c =>
						c.spells.filter(spell => spell.flags.obsidian.isEmbedded).map(spell => {
							spell = duplicate(spell);
							spell.flags.obsidian.source.item = item.id;
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
					this.obsidian.classes.find(cls => cls.obsidian.label.toLowerCase() === needle);

				c.class = cls?.id || '';
			});

		if (!item.flags.obsidian.source || item.flags.obsidian.source.type !== 'class') {
			return;
		}

		if (!OBSIDIAN.notDefinedOrEmpty(item.flags.obsidian.source.text)) {
			const needle = item.flags.obsidian.source.text.toLowerCase();
			const cls =
				this.obsidian.classes.find(cls => cls.obsidian.label.toLowerCase() === needle);

			if (cls === undefined) {
				item.flags.obsidian.source.type = 'other';
				item.flags.obsidian.source.other = item.flags.obsidian.source.text;
			} else {
				item.flags.obsidian.source.class = cls.id;
			}
		} else {
			const needle = item.flags.obsidian.source.class;
			const cls = this.obsidian.classes.find(cls => cls.id === needle);

			if (cls === undefined) {
				const byName = this.obsidian.classes.find(cls => cls.name === needle);
				if (byName === undefined) {
					const i18n = `OBSIDIAN.Class.${needle}`;
					item.flags.obsidian.source.type = 'other';
					item.flags.obsidian.source.other =
						game.i18n.has(i18n) ? game.i18n.localize(i18n) : needle;
				} else {
					item.flags.obsidian.source.class = byName.id;
				}
			}
		}
	}

	/**
	 * @private
	 */
	static _classFormat (classes) {
		if (classes.length < 1) {
			return game.i18n.localize('OBSIDIAN.ClassTitle');
		}

		return classes.sort((a, b) => b.data.data.levels - a.data.data.levels).map(cls =>
			(cls.data.data.subclass?.length ? `${cls.data.data.subclass} ` : '')
			+ `${cls.obsidian.label} ${cls.data.data.levels}`
		).join(' / ');
	}

	getItemParent (item) {
		return this.items.get(item?.data.flags.obsidian.parent);
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
		const hd = duplicate(this.data._source.flags.obsidian.attributes.hd);

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
			...Config.CONDITIONS
				.filter(condition => conditions[condition] && !existingConditions.has(condition))
				.map(condition => `modules/obsidian/img/conditions/${condition}.svg`));

		return Array.from(new Set(effects).values()).map(icon => {
			return {data: {icon: icon}, getFlag: () => false};
		}).concat(existingEffects);
	}

	async shortRest (...args) {
		if (!(this.sheet instanceof ObsidianCharacter) && !(this.sheet instanceof ObsidianNPC)) {
			return super.shortRest(...args);
		}

		if (this.data.data.spells.pact) {
			await this.update({'data.spells.pact.value': this.data.data.spells.pact.max});
		}

		const itemUpdates = this._resourceUpdates(['short']);
		if (itemUpdates.length > 0) {
			return OBSIDIAN.updateManyOwnedItems(this, itemUpdates);
		}
	}

	async longRest (...args) {
		if (!(this.sheet instanceof ObsidianCharacter) && !(this.sheet instanceof ObsidianNPC)) {
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
	}

	async updateEquipment (deleted) {
		if (deleted) {
			const update = {};
			if (deleted.data.type === 'backpack') {
				deleted.data.obsidian.contents.forEach(item => {
					update[`items.${item.idx}.flags.obsidian.parent`] = null;
				});
			}

			await this.update(OBSIDIAN.updateArrays(this.data._source, update));
		}
	}

	async modifyTokenAttribute (attribute, value, isDelta = false, isBar = false) {
		let current = getProperty(this.data.data, attribute);
		if (current !== undefined) {
			return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
		}

		const [itemID, effect, uuid] = attribute.split('.');
		const item = this.items.get(itemID);
		const component = this.data.obsidian.components.get(uuid);

		if (!item || !component) {
			return this;
		}

		if (isDelta) {
			value = Math.clamped(0, Number(component.remaining) + value, component.max);
		}

		const effects = duplicate(item.getFlag('obsidian', 'effects'));
		effects.find(e => e.uuid === effect).components.find(c => c.remaining = value);
		return item.setFlag('obsidian', 'effects', effects);
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
			if (!item.getFlag('obsidian', 'effects.length')) {
				continue;
			}

			const updates = {_id: item.id};
			for (const effect of item.data.flags.obsidian.effects) {
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
				itemUpdates.push(OBSIDIAN.updateArrays(item.data._source, updates));
			}
		}

		return itemUpdates;
	}

	static fromUUID (uuid) {
		const parts = uuid.split('.');
		if (parts[0] === 'Actor') {
			return game.actors.get(parts[1]);
		} else if (parts[0] === 'Scene' && parts[2] === 'Token') {
			return game.scenes.get(parts[1])?.tokens.get(parts[3])?.actor;
		}
	}

	static duplicateItem (original, entity = 'Item') {
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

		return new CONFIG[entity].documentClass(dupe);
	}
}
