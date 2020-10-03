import {ObsidianConsumeSlotDialog} from '../dialogs/consume-slot.js';
import {ObsidianResourceScalingDialog} from '../dialogs/resource-scaling.js';
import {ObsidianActionableDialog} from '../dialogs/actionable.js';
import {Rolls} from './rolls.js';
import {Effect} from '../module/effect.js';
import {OBSIDIAN} from '../global.js';
import {ObsidianActor} from '../module/actor.js';

export const ObsidianItems = {
	consolidateUpdates: function (updates) {
		const unique = new Map();
		for (const update of updates) {
			const existing = unique.get(update._id);
			if (existing) {
				for (const prop in update) {
					if (prop === '_id') {
						continue;
					}

					if (existing[prop] !== undefined) {
						console.warn(
							`Property collision on '${prop}' when consolidating `
							+ `updates for '${update._id}'.`);
					}

					existing[prop] = update[prop];
				}
			} else {
				unique.set(update._id, update);
			}
		}

		return Array.from(unique.values());
	},

	consumeQuantity: function (actor, item, n, updates) {
		if (item.parentEffect) {
			const effect = actor.data.obsidian.effects.get(item.parentEffect);
			if (!effect) {
				return;
			}

			item = actor.getEmbeddedEntity('OwnedItem', effect.parentItem);
		}

		if (!item) {
			return;
		}

		const quantity = item.data.quantity - n;
		if (quantity >= 0) {
			updates.push({_id: item._id, 'data.quantity': quantity});
		}
	},

	effectMacro: function ({actor, token, scene, effect}) {
		if (token && scene) {
			actor = ObsidianActor.fromSceneTokenPair(scene, token);
		} else {
			actor = game.actors.get(actor);
		}

		if (!actor || !getProperty(actor, 'data.obsidian.itemsByID')) {
			return;
		}

		ObsidianItems.roll(actor, {roll: 'fx', uuid: effect});
	},

	itemMacro: function ({actor, token, scene, item}) {
		if (token && scene) {
			actor = ObsidianActor.fromSceneTokenPair(scene, token);
		} else {
			actor = game.actors.get(actor);
		}

		if (!actor || !getProperty(actor, 'data.obsidian.itemsByID')) {
			return;
		}

		ObsidianItems.roll(actor, {roll: 'item', id: item});
	},

	rollMacro: function ({actor, token, scene, rollData}) {
		if (token && scene) {
			actor = ObsidianActor.fromSceneTokenPair(scene, token);
		} else {
			actor = game.actors.get(actor);
		}

		if (!actor) {
			return;
		}

		Rolls.create(actor, rollData);
	},

	produceSpellSlot: function (actor, slot, unlimited) {
		const isPact = slot === 'pact';
		const prop = isPact ? 'data.spells.pact' : `data.spells.spell${slot}`;
		const spell = getProperty(actor.data, prop);

		if (spell.value < spell.max) {
			actor.update({[`${prop}.value`]: spell.value + 1});
		} else {
			if (!unlimited) {
				return;
			}

			const tmp = spell.tmp || 0;
			actor.update({[`${prop}.tmp`]: tmp + 1});
		}
	},

	refreshConsumable: function (actor, item, effect, resource, n = 1, updates) {
		updates.push({
			_id: item._id,
			'data.quantity': item.data.quantity - 1,
			[`flags.obsidian.effects.${effect.idx}.components.${resource.idx}.remaining`]:
			resource.max - (n - resource.remaining)
		});
	},

	resolveEffect: function (actor, options) {
		const updates = [];
		const item = actor.data.obsidian.itemsByID.get(options.id);
		const effect = actor.data.obsidian.effects.get(options.uuid);
		const resources = effect.components.filter(c => c.type === 'resource');
		const consumers = effect.components.filter(c => c.type === 'consume');
		const producers = effect.components.filter(c => c.type === 'produce');
		const tables = effect.components.filter(c => c.type === 'roll-table');
		const scaling = item.obsidian.collection.scaling.find(e =>
			e.scalingComponent.ref === effect.uuid && e.scalingComponent.method === 'resource');

		let scaledAmount = 0;
		if (scaling && (consumers.length || resources.length)) {
			const consumer = consumers[0];
			let consumed = options.consumed || 0;
			let base;

			if (!consumer || consumer.calc === 'var') {
				base = 1;
			} else {
				if (consumer.target === 'spell') {
					consumed = options.spellLevel;
					base = consumer.slot;
				} else {
					base = consumer.fixed;
				}
			}

			scaledAmount = Math.max(0, consumed - base);
		}

		if (options.spell && options.spellLevel == null) {
			const spell = actor.data.obsidian.itemsByID.get(options.spell);
			const component =
				actor.data.obsidian.components.get(spell.flags?.obsidian?.parentComponent);

			if (component?.source === 'individual'
				&& ['innate', 'item'].includes(component.method))
			{
				options.spellLevel = spell.data.level;
				if (component.upcast) {
					options.spellLevel = component.level;
				}

				options.spellLevel += scaledAmount;
			}
		}

		if (consumers.length) {
			const consumer = consumers[0];
			if (consumer.target === 'qty') {
				ObsidianItems.consumeQuantity(actor, consumer, options.consumed, updates);
			} else if (consumer.target !== 'spell') {
				const [refItem, refEffect, resource] =
					Effect.getLinkedResource(actor.data, consumer);

				if (refItem && refEffect && resource) {
					ObsidianItems.useResource(
						actor, refItem, refEffect, resource, options.consumed, {updates});
				}
			}
		}

		if (resources.length) {
			const resource = resources[0];
			const used = options.consumed || 1;

			if (resource.remaining - used < 1
				&& item.type === 'consumable'
				&& item.data.quantity > 0
				&& item.data.uses.autoDestroy)
			{
				ObsidianItems.refreshConsumable(actor, item, effect, resource, used, updates);
			} else {
				ObsidianItems.useResource(actor, item, effect, resource, used, {updates});
			}
		}

		if (producers.length) {
			const producer = producers[0];
			const produced = producer.fixed + scaledAmount;

			if (produced > 0) {
				if (producer.target === 'qty') {
					ObsidianItems.consumeQuantity(actor, producer, produced + -1, updates);
				} else if (producer.target === 'spell') {
					ObsidianItems.produceSpellSlot(actor, producer.slot, producer.unlimited);
				} else {
					const [refItem, refEffect, resource] =
						Effect.getLinkedResource(actor.data, producer);

					if (refItem && refEffect && resource) {
						ObsidianItems.useResource(
							actor, refItem, refEffect, resource, produced * -1,
							{unlimited: producer.unlimited, updates});
					}
				}
			}
		}

		if (item.type === 'weapon'
			&& item.flags.obsidian.type === 'melee'
			&& item.flags.obsidian.consumeThrown
			&& item.flags.obsidian.tags.thrown)
		{
			const attack = effect.components.find(c => c.type === 'attack');
			if (attack && attack.mode === 'ranged') {
				updates.push({_id: item._id, 'data.quantity': item.data.quantity - 1});
			}
		}

		if (updates.length) {
			const consolidated = ObsidianItems.consolidateUpdates(updates);
			OBSIDIAN.updateManyOwnedItems(actor, consolidated);
		}

		options.scaling = scaledAmount;
		if (options.parentResolved === false) {
			options.roll = 'item';
			options.id = options.spell;
			options.parentResolved = true;
			ObsidianItems.roll(actor, options);
		} else {
			Rolls.create(actor, options);
		}

		if (!OBSIDIAN.notDefinedOrEmpty(getProperty(item, 'flags.obsidian.ammo.id'))) {
			const ammo = actor.data.obsidian.itemsByID.get(item.flags.obsidian.ammo.id);
			const collection = ammo.obsidian.collection;
			const suppressCard =
				(collection.attack.length + collection.damage.length + collection.save.length) < 1;

			if (ammo) {
				ObsidianItems.roll(actor, {roll: 'item', id: ammo._id, suppressCard: suppressCard});
			}
		}

		if (tables.length) {
			tables.forEach(component => {
				const RollTable = CONFIG.RollTable.entityClass;
				component.tables.map(table =>
					new RollTable(table, {
						parentItem: CONFIG.Item.entityClass.createOwned(item, actor)
					})).forEach(table => {
						table.drawMany(component.nrolls).then(() => {
							if (component.reset) {
								table.reset();
							}
						});
					});
			});
		}
	},

	roll: function (actor, options) {
		// Make sure this isn't a live DOMStringMap.
		options = duplicate(options);

		if (actor == null) {
			actor = game.actors.get(options.actor);
		}

		if (actor == null) {
			return;
		}

		if (options.roll === 'fx') {
			ObsidianItems.rollEffect(actor, options);
			return;
		}

		if (options.roll === 'item') {
			ObsidianItems.rollItem(actor, options);
			return;
		}

		Rolls.create(actor, options);
	},

	rollActionable: function (actor, index, options) {
		const item = actor.data.obsidian.itemsByID.get(options.id);
		const action = item.obsidian.actionable[index];

		if (action.type === 'spell') {
			options.roll = 'item';
			options.id = action._id;
		} else {
			options.roll = 'fx';
			options.uuid = action.uuid;
		}

		ObsidianItems.roll(actor, options);
	},

	rollEffect: function (actor, options) {
		const effect = actor.data.obsidian.effects.get(options.uuid);
		options.id = effect.parentItem;

		const item = actor.data.obsidian.itemsByID.get(options.id);
		const consumer = effect.components.find(c => c.type === 'consume');
		const scaling = item.obsidian.collection.scaling.find(e =>
			e.scalingComponent.ref === effect.uuid && e.scalingComponent.method === 'resource');

		if (consumer?.target === 'spell' && options.spellLevel == null) {
			ObsidianItems.selectSpellLevel(actor, options, consumer.slot);
			return;
		}

		if (options.consumed == null
			&& consumer?.target !== 'spell'
			&& (scaling || consumer?.calc === 'var'))
		{
			ObsidianItems.selectConsumption(actor, options);
			return;
		}

		if (consumer?.target !== 'spell'
			&& consumer?.calc === 'fixed'
			&& options.consumed == null)
		{
			options.consumed = consumer.fixed;
		}

		ObsidianItems.resolveEffect(actor, options);
	},

	rollItem: async function (actor, options) {
		const item = actor.data.obsidian.itemsByID.get(options.id);
		if (!item || !item.obsidian) {
			Rolls.create(actor, options);
			return;
		}

		if (item.type === 'feat' && item.data.activation.type === 'legendary') {
			const legact = actor.data.data.resources.legact;
			await actor.update({
				'data.resources.legact.value':
					Math.min(legact.max, legact.value + item.data.activation.cost)
			});
		}

		if (item.type === 'tool') {
			ObsidianItems.rollToolItem(actor, options);
			return;
		}

		if (item.type === 'spell') {
			ObsidianItems.rollSpellItem(actor, options);
			return;
		}

		if (item.obsidian.actionable.length) {
			ObsidianItems.selectActionable(actor, options);
			return;
		}

		Rolls.create(actor, options);
	},

	rollSpellItem: function (actor, options) {
		const spell = actor.data.obsidian.itemsByID.get(options.id);
		let component;

		if (getProperty(spell, 'flags.obsidian.parentComponent')) {
			component = actor.data.obsidian.components.get(spell.flags.obsidian.parentComponent);
		}

		if (component && ['item', 'innate'].includes(component.method) && !options.parentResolved) {
			const effect = actor.data.obsidian.effects.get(component.parentEffect);
			options.roll = 'fx';
			options.uuid = effect.uuid;
			options.id = effect.parentItem;
			options.spell = spell._id;
			options.parentResolved = false;
			ObsidianItems.roll(actor, options);
			return;
		}

		if (options.spellLevel == null) {
			if (spell.data.level > 0) {
				ObsidianItems.selectSpellLevel(actor, options, spell.data.level);
				return;
			} else {
				options.spellLevel = 0;
			}
		}

		if (spell.obsidian.actionable.length) {
			ObsidianItems.selectActionable(actor, options);
			return;
		}

		Rolls.create(actor, options);
	},

	rollToolItem: function (actor, options) {
		const tool = actor.data.obsidian.itemsByID.get(options.id);
		if (tool.obsidian.actionable.length) {
			ObsidianItems.selectActionable(actor, options);
			return;
		}

		const found = Object.values(actor.data.obsidian.tools).find(t =>
			t.label.toLocaleLowerCase() === tool.name.toLocaleLowerCase());

		if (found) {
			options.roll = 'tool';
			options.tool = found.key;
		}

		Rolls.create(actor, options);
	},

	selectActionable: function (actor, options) {
		const item = actor.data.obsidian.itemsByID.get(options.id);
		if (item.obsidian.actionable.length > 1) {
			new ObsidianActionableDialog(actor, options).render(true);
		} else {
			ObsidianItems.rollActionable(actor, 0, options);
		}
	},

	selectConsumption: function (actor, options) {
		new ObsidianResourceScalingDialog(actor, options).render(true);
	},

	selectSpellLevel: function (actor, options, min) {
		new ObsidianConsumeSlotDialog(actor, options, min).render(true);
	},

	useResource: function (actor, item, effect, resource, n = 1, {unlimited = false, updates}) {
		let remaining = resource.remaining - n;
		if (remaining < 0) {
			remaining = 0;
		}

		if (!unlimited && resource.max && remaining > resource.max) {
			remaining = resource.max;
		}

		updates.push({
			_id: item._id,
			[`flags.obsidian.effects.${effect.idx}.components.${resource.idx}.remaining`]: remaining
		});
	}
};
