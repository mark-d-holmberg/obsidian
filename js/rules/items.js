import {ObsidianConsumeSlotDialog} from '../dialogs/consume-slot.js';
import {ObsidianResourceScalingDialog} from '../dialogs/resource-scaling.js';
import {ObsidianActionableDialog} from '../dialogs/actionable.js';
import {Rolls} from './rolls.js';
import {Effect} from '../module/effect.js';
import {OBSIDIAN} from './rules.js';

export const ObsidianItems = {
	consumeQuantity: function (actor, item, n = 1) {
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
			actor.updateEmbeddedEntity('OwnedItem', {_id: item._id, 'data.quantity': quantity});
		}
	},

	effectMacro: function (actor, effect) {
		actor = game.actors.get(actor);
		if (!actor || !getProperty(actor, 'data.obsidian.itemsByID')) {
			return;
		}

		ObsidianItems.roll(actor, {uuid: effect});
	},

	itemMacro: function (actor, item) {
		actor = game.actors.get(actor);
		if (!actor || !getProperty(actor, 'data.obsidian.itemsByID')) {
			return;
		}

		ObsidianItems.roll(actor, {roll: 'item', id: item});
	},

	refreshConsumable: function (actor, item, effect, resource, n) {
		actor.updateEmbeddedEntity('OwnedItem', OBSIDIAN.updateArrays(item, {
			_id: item._id,
			'data.quantity': item.data.quantity - 1,
			[`flags.obsidian.effects.${effect.idx}.components.${resource.idx}.remaining`]:
			resource.max - (n - resource.remaining)
		}));
	},

	roll: function (actor, options) {
		if (actor == null) {
			actor = game.actors.get(options.actor);
			if (actor == null) {
				return;
			}
		}

		const uuid = options.uuid;
		const effect = actor.data.obsidian.effects.get(uuid);
		const spell = actor.data.obsidian.itemsByID.get(options.spl);

		if (effect) {
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

			ObsidianItems.rollEffect(actor, effect, null, spell);
			return;
		}

		if (options.roll === 'item') {
			const item = actor.getEmbeddedEntity('OwnedItem', options.id);
			if (item && item.obsidian) {
				if (item.type === 'spell') {
					let component;
					if (getProperty(item, 'flags.obsidian.parentComponent')) {
						component =
							actor.data.obsidian.components.get(item.flags.obsidian.parentComponent);
					}

					if (component && component.method === 'item') {
						const effect = actor.data.obsidian.effects.get(component.parentEffect);
						options.roll = 'fx';
						options.uuid = effect.uuid;
						options.spl = item._id;
						ObsidianItems.roll(actor, options);
					} else {
						new ObsidianConsumeSlotDialog(
							options.parent, actor, item, item.flags.obsidian.effects[0])
							.render(true);
					}
				} else if (item.obsidian.actionable.length > 1) {
					new ObsidianActionableDialog(options.parent, actor, item).render(true);
				} else if (item.obsidian.actionable.length) {
					const action = item.obsidian.actionable[0];
					options.roll = 'fx';
					options.uuid = action.uuid;

					if (action.type === 'spell') {
						options.roll = 'item';
						options.id = action._id;
					}

					ObsidianItems.roll(actor, options);
				}

				return;
			}
		}

		Rolls.create(actor, options);
	},

	rollEffect: function (actor, effect, scaling, spell) {
		if (typeof actor === 'string') {
			actor = game.actors.get(actor);
		}

		if (!actor) {
			return;
		}

		const item = actor.data.obsidian.itemsByID.get(effect.parentItem);
		const resources = effect.components.filter(component => component.type === 'resource');
		const consumers = effect.components.filter(component => component.type === 'consume');
		let scaledAmount = (scaling || 0) - 1;

		if (spell) {
			scaledAmount += spell.data.level;
		}

		if (resources.length) {
			if (resources[0].remaining - (scaling || 1) < 1
				&& item.type === 'consumable'
				&& item.data.quantity > 0
				&& item.data.uses.autoDestroy)
			{
				ObsidianItems.refreshConsumable(actor, item, effect, resources[0], scaling || 1);
			} else {
				ObsidianItems.useResource(actor, item, effect, resources[0], scaling || 1);
			}
		}

		if (consumers.length) {
			const consumer = consumers[0];
			if (consumer.target === 'qty') {
				ObsidianItems.consumeQuantity(actor, consumer, scaling || consumer.fixed);
			} else if (consumer.target !== 'spell') {
				const [refItem, refEffect, resource] =
					Effect.getLinkedResource(actor.data, consumers[0]);

				if (refItem && refEffect && resource) {
					ObsidianItems.useResource(
						actor, refItem, refEffect, resource, scaling || consumer.fixed);
				}
			}

			if (scaling && consumer.target !== 'spell') {
				scaledAmount = Math.floor(scaling / consumer.fixed) - 1;
			}
		}

		if (!OBSIDIAN.notDefinedOrEmpty(getProperty(item, 'flags.obsidian.ammo.id'))) {
			const ammo = actor.data.obsidian.itemsByID.get(item.flags.obsidian.ammo.id);
			if (ammo) {
				ObsidianItems.consumeQuantity(actor, ammo);
			}
		}

		if (scaledAmount < 0) {
			scaledAmount = 0;
		}

		const options = {roll: 'fx', uuid: effect.uuid, scaling: scaledAmount};
		if (spell) {
			options.roll = 'item';
			options.id = spell._id;
		}

		Rolls.create(actor, options);
	},

	useResource: function (actor, item, effect, resource, n = 1) {
		let remaining = resource.remaining - n;
		if (remaining < 0) {
			remaining = 0;
		}

		const update = {
			_id: item._id,
			[`flags.obsidian.effects.${effect.idx}.components.${resource.idx}.remaining`]: remaining
		};

		actor.updateEmbeddedEntity('OwnedItem', OBSIDIAN.updateArrays(item, update));
	}
};
