import {OBSIDIAN} from './rules.js';

export function prepareInventory (actorData) {
	actorData.obsidian.itemsByID = new Map();
	actorData.obsidian.inventory = {
		weight: 0,
		encumbered: false,
		items: [],
	};

	const rootOrder = new Set(actorData.flags.obsidian.order.equipment.root);
	const containerOrder = new Set(actorData.flags.obsidian.order.equipment.containers);
	const inventory = actorData.obsidian.inventory;
	const itemTypes = new Set(['weapon', 'equipment', 'consumable', 'backpack', 'tool', 'loot']);
	const map = actorData.obsidian.itemsByID;

	for (let i = 0; i < actorData.items.length; i++) {
		const item = actorData.items[i];
		map.set(item._id, item);
		item.idx = i;

		if (!itemTypes.has(item.type) || !item.flags.obsidian) {
			continue;
		}

		if (item.type !== 'weapon' || item.flags.obsidian.type !== 'unarmed') {
			inventory.items.push(item);
		}

		if (item.type === 'backpack') {
			item.flags.obsidian.carriedWeight = 0;
			if (!item.data.capacity.weightless && item.flags.obsidian.currency) {
				item.flags.obsidian.carriedWeight +=
					Object.values(item.flags.obsidian.currency)
						.reduce((acc, currency) => acc + currency, 0)
					* OBSIDIAN.Rules.COIN_WEIGHT;
			}

			if (!item.flags.obsidian.order) {
				item.flags.obsidian.order = [];
			}

			item.obsidian = {order: new Set(item.flags.obsidian.order)};
			if (!containerOrder.has(item._id)) {
				actorData.flags.obsidian.order.equipment.containers.push(item._id);
			}
		}
	}

	for (const item of inventory.items) {
		const flags = item.flags.obsidian;
		if (!flags) {
			continue;
		}

		const totalWeight = item.data.weight * (item.data.quantity || 1);

		if (flags.parent == null) {
			inventory.weight += totalWeight;
			if (item.type !== 'backpack' && !rootOrder.has(item._id)) {
				actorData.flags.obsidian.order.equipment.root.push(item._id);
			}
		} else {
			const container = map.get(flags.parent);
			if (container) {
				container.flags.obsidian.carriedWeight += totalWeight;
				if (!container.data.capacity.weightless) {
					inventory.weight += totalWeight;
				}

				if (container.obsidian && !container.obsidian.order.has(item._id)) {
					container.flags.obsidian.order.push(item._id);
				}
			}
		}

		flags.consumable = item.type === 'consumable';
		flags.equippable =
			item.type === 'weapon'
			|| (item.type === 'equipment' && OBSIDIAN.Schema.EquipTypes.includes(flags.subtype));
	}

	const link = list => list.map(id => map.get(id)).filter(item => item !== undefined);
	inventory.weight +=
		Object.values(actorData.data.currency).reduce((acc, currency) => acc + currency, 0)
		* OBSIDIAN.Rules.COIN_WEIGHT;
	inventory.root = link(actorData.flags.obsidian.order.equipment.root);
	inventory.containers = link(actorData.flags.obsidian.order.equipment.containers);
	inventory.containers.forEach(container =>
		container.flags.obsidian.contents = link(container.flags.obsidian.order));

	if (inventory.weight >= actorData.data.abilities.str.value * OBSIDIAN.Rules.CARRY_MULTIPLIER) {
		inventory.encumbered = true;
	}
}
