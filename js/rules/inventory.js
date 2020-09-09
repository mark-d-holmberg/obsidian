import {OBSIDIAN} from '../global.js';

export function prepareInventory (actorData) {
	actorData.obsidian.itemsByID = new Map();
	actorData.obsidian.inventory = {
		weight: 0,
		encumbered: false,
		items: [],
		attunements: 0,
		root: [],
		containers: []
	};

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
			item.obsidian = {contents: [], carriedWeight: 0};
			if (item.flags.obsidian.currency) {
				const currencyWeight =
					Object.values(item.flags.obsidian.currency)
						.reduce((acc, currency) => acc + currency, 0)
					* OBSIDIAN.Rules.COIN_WEIGHT;

				item.obsidian.carriedWeight += currencyWeight;
				if (!item.data.capacity.weightless) {
					inventory.weight += currencyWeight;
				}
			}
		}
	}

	for (const item of inventory.items) {
		const flags = item.flags.obsidian;
		if (!flags) {
			continue;
		}

		const totalWeight = item.data.weight * (item.data.quantity || 1);

		if (flags.attunement && item.data.attuned) {
			inventory.attunements++;
		}

		const container = map.get(flags.parent);
		if (container) {
			container.obsidian.carriedWeight += totalWeight;
			if (!container.data.capacity.weightless) {
				inventory.weight += totalWeight;
			}

			if (container.obsidian?.contents) {
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

		flags.consumable = item.type === 'consumable';
		flags.equippable =
			item.type === 'weapon'
			|| (item.type === 'equipment' && OBSIDIAN.Schema.EquipTypes.includes(flags.subtype));
	}

	inventory.weight +=
		Object.values(actorData.data.currency).reduce((acc, currency) => acc + currency, 0)
		* OBSIDIAN.Rules.COIN_WEIGHT;

	if (inventory.weight >= actorData.data.abilities.str.value * OBSIDIAN.Rules.CARRY_MULTIPLIER) {
		inventory.encumbered = true;
	}

	const sort = (a, b) => a.sort - b.sort;
	inventory.root.sort(sort);
	inventory.containers.sort(sort);
	inventory.containers.forEach(container => container.obsidian.contents.sort(sort));
}
