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

		ObsidianItems.roll(actor, {uuid: effect});
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
		const uses = spell[isPact ? 'uses' : 'value'];

		if (uses > 0) {
			actor.update({[`${prop}.${isPact ? 'uses' : 'value'}`]: uses - 1});
		} else {
			if (!unlimited) {
				return;
			}

			const tmp = spell.tmp || 0;
			actor.update({[`${prop}.tmp`]: tmp + 1});
		}
	},

	refreshConsumable: function (actor, item, effect, resource, n, updates) {
		updates.push({
			_id: item._id,
			'data.quantity': item.data.quantity - 1,
			[`flags.obsidian.effects.${effect.idx}.components.${resource.idx}.remaining`]:
			resource.max - (n - resource.remaining)
		});
	},

	roll: function (actor, options) {
		if (actor == null) {
			actor = game.actors.get(options.actor);
			if (actor == null) {
				return;
			}
		}

		if (options.roll === 'fx') {
			ObsidianItems.rollPromptVariables(actor, options);
			return;
		}

		if (options.roll === 'item') {
			ObsidianItems.rollItem(actor, options);
			return;
		}

		Rolls.create(actor, options);
	},

	rollEffect: function (actor, effect, {consumed, spell}) {
		if (typeof actor === 'string') {
			actor = game.actors.get(actor);
		}

		if (!actor) {
			return;
		}

		const item = actor.data.obsidian.itemsByID.get(effect.parentItem);
		const resources = effect.components.filter(component => component.type === 'resource');
		const consumers = effect.components.filter(component => component.type === 'consume');
		const producers = effect.components.filter(component => component.type === 'produce');
		const updates = [];
		let scaledAmount = (consumed || 0);

		if (spell) {
			const component =
				actor.data.obsidian.components.get(spell.flags.obsidian.parentComponent);

			if (component && ['innate', 'item'].includes(component.method)) {
				if (component.upcast) {
					scaledAmount += Math.max(0, component.level - spell.data.level);
				}
			} else {
				scaledAmount -= spell.data.level;
			}
		}

		if (consumers.length) {
			const consumer = consumers[0];
			if (consumer.target === 'qty') {
				ObsidianItems.consumeQuantity(actor, consumer, consumed, updates);
			} else if (consumer.target !== 'spell') {
				const [refItem, refEffect, resource] =
					Effect.getLinkedResource(actor.data, consumer);

				if (refItem && refEffect && resource) {
					ObsidianItems.useResource(
						actor, refItem, refEffect, resource, consumed, {updates});
				}
			}

			if (consumer.calc === 'var') {
				scaledAmount -= 1;
			} else {
				if (consumer.target === 'spell') {
					scaledAmount -= consumer.slot;
				} else {
					scaledAmount -= consumer.fixed;
				}
			}
		}

		if (resources.length) {
			if (resources[0].remaining - consumed < 1
				&& item.type === 'consumable'
				&& item.data.quantity > 0
				&& item.data.uses.autoDestroy)
			{
				ObsidianItems.refreshConsumable(
					actor, item, effect, resources[0], consumed, updates);
			} else {
				ObsidianItems.useResource(actor, item, effect, resources[0], consumed, {updates});
			}
		}

		if (producers.length) {
			const producer = producers[0];
			const produced = producer.fixed + scaledAmount;

			if (produced > 0) {
				if (producer.target === 'qty') {
					ObsidianItems.consumeQuantity(actor, producer, produced * -1, updates);
				} else if (producer.target === 'spell') {
					ObsidianItems.produceSpellSlot(actor, producer.slot, producer.unlimited);
				} else if (producer.target !== 'spell') {
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

		if (scaledAmount < 0) {
			scaledAmount = 0;
		}

		const options = {
			roll: 'fx',
			uuid: effect.uuid,
			scaling: scaledAmount
		};

		if (spell) {
			options.roll = 'item';
			options.id = spell._id;
		}

		Rolls.create(actor, options);

		if (!OBSIDIAN.notDefinedOrEmpty(getProperty(item, 'flags.obsidian.ammo.id'))) {
			const ammo = actor.data.obsidian.itemsByID.get(item.flags.obsidian.ammo.id);
			if (ammo) {
				ObsidianItems.roll(actor, {roll: 'item', id: ammo._id});
			}
		}
	},

	rollItem: async function (actor, options) {
		const item = actor.getEmbeddedEntity('OwnedItem', options.id);
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

		if (item.type === 'spell') {
			let component;
			if (getProperty(item, 'flags.obsidian.parentComponent')) {
				component =
					actor.data.obsidian.components.get(item.flags.obsidian.parentComponent);
			}

			if (component && ['item', 'innate'].includes(component.method)) {
				const effect = actor.data.obsidian.effects.get(component.parentEffect);
				options.roll = 'fx';
				options.uuid = effect.uuid;
				options.spl = item._id;
				ObsidianItems.roll(actor, options);
				return;
			} else if (item.data.level > 0) {
				new ObsidianConsumeSlotDialog(
					options.parent, actor, item, item.flags.obsidian.effects[0])
					.render(true);
				return;
			}
		} else if (item.type === 'tool') {
			const idx =
				actor.data.flags.obsidian.skills.tools.findIndex(tool =>
					tool.label.toLocaleLowerCase() === item.name.toLocaleLowerCase());

			if (idx > -1) {
				options.roll = 'tool';
				options.tool = idx;
				Rolls.create(actor, options);
				return;
			}
		} else if (item.obsidian.actionable.length > 1) {
			new ObsidianActionableDialog(options.parent, actor, item).render(true);
			return;
		} else if (item.obsidian.actionable.length) {
			const action = item.obsidian.actionable[0];
			options.roll = 'fx';
			options.uuid = action.uuid;

			if (action.type === 'spell') {
				options.roll = 'item';
				options.id = action._id;
			}

			ObsidianItems.roll(actor, options);
			return;
		}

		Rolls.create(actor, options);
	},

	rollPromptVariables: function (actor, options) {
		const effect = actor.data.obsidian.effects.get(options.uuid);
		if (!effect) {
			return;
		}

		const spell = actor.data.obsidian.itemsByID.get(options.spl);
		const item = actor.getEmbeddedEntity('OwnedItem', effect.parentItem);
		const consumer = effect.components.find(c => c.type === 'consume');
		const scaling = item.obsidian.scaling.find(e =>
			e.scalingComponent.ref === effect.uuid && e.scalingComponent.method === 'resource');

		if (consumer && consumer.target === 'spell') {
			new ObsidianConsumeSlotDialog(options.parent, actor, item, effect).render(true);
			return;
		}

		if (scaling || (consumer && consumer.calc === 'var')) {
			new ObsidianResourceScalingDialog(options.parent, actor, item, effect, spell)
				.render(true);

			return;
		}

		const params = {spell: spell};
		if (consumer) {
			params.consumed = consumer.fixed;
		}

		ObsidianItems.rollEffect(actor, effect, params);
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
