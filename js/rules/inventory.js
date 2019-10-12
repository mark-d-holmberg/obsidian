Obsidian.Rules.Prepare.inventory = function (actorData) {
	actorData.obsidian.inventory = {
		weight: 0,
		encumbered: false,
		items: [],
	};

	const rootOrder = new Set(actorData.flags.obsidian.order.equipment.root);
	const containerOrder = new Set(actorData.flags.obsidian.order.equipment.containers);
	const inventory = actorData.obsidian.inventory;
	const itemTypes = new Set(['weapon', 'equipment', 'consumable', 'backpack', 'tool']);
	const map = new Map();

	for (let i = 0; i < actorData.items.length; i++) {
		const item = actorData.items[i];
		item.idx = i;
		map.set(item.id, item);

		if (!itemTypes.has(item.type)) {
			continue;
		}

		if (item.type !== 'weapon' || item.flags.obsidian.type !== 'unarmed') {
			inventory.items.push(item);
		}

		if (item.type === 'backpack') {
			item.flags.obsidian.carriedWeight = 0;
			if (!item.flags.obsidian.weightless && item.flags.obsidian.currency) {
				item.flags.obsidian.carriedWeight +=
					Object.values(item.flags.obsidian.currency)
						.reduce((acc, currency) => acc + currency, 0)
					* Obsidian.Rules.COIN_WEIGHT;
			}

			if (!item.flags.obsidian.order) {
				item.flags.obsidian.order = [];
			}

			item.obsidian = {order: new Set(item.flags.obsidian.order)};
			if (!containerOrder.has(item.id)) {
				actorData.flags.obsidian.order.equipment.containers.push(item.id);
			}
		}
	}

	for (const item of inventory.items) {
		const flags = item.flags.obsidian;
		const totalWeight = item.data.weight.value * (item.data.quantity.value || 1);

		if (flags.parent == null) {
			inventory.weight += totalWeight;
			if (item.type !== 'backpack' && !rootOrder.has(item.id)) {
				actorData.flags.obsidian.order.equipment.root.push(item.id);
			}
		} else {
			const container = map.get(flags.parent);
			if (container) {
				container.flags.obsidian.carriedWeight += totalWeight;
				if (!container.flags.obsidian.weightless) {
					inventory.weight += totalWeight;
				}

				if (!container.obsidian.order.has(item.id)) {
					container.flags.obsidian.order.push(item.id);
				}
			}
		}

		flags.equippable = item.type === 'weapon' || Obsidian.EQUIP_TYPES.includes(flags.subtype);
		flags.consumable = item.type === 'consumable';
	}

	const link = list => list.map(id => map.get(id)).filter(item => item !== undefined);
	inventory.weight +=
		Object.values(actorData.data.currency).reduce((acc, currency) => acc + currency.value, 0)
		* Obsidian.Rules.COIN_WEIGHT;
	inventory.root = link(actorData.flags.obsidian.order.equipment.root);
	inventory.containers = link(actorData.flags.obsidian.order.equipment.containers);
	inventory.containers.forEach(container =>
		container.flags.obsidian.contents = link(container.flags.obsidian.order))
};
