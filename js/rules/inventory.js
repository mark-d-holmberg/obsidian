Obsidian.Rules.Prepare.inventory = function (actorData) {
	actorData.obsidian.inventory = {
		weight: 0,
		encumbered: false,
		items: [],
		containers: [],
		root: []
	};

	const inventory = actorData.obsidian.inventory;
	const itemTypes = new Set(['weapon', 'equipment', 'consumable', 'backpack']);
	const map = new Map();

	for (const item of actorData.items) {
		map.set(item.id, item);
		if (!itemTypes.has(item.type)) {
			continue;
		}

		inventory.items.push(item);
		if (item.type === 'backpack') {
			item.flags.obsidian.contents = [];
			inventory.containers.push(item);
		}
	}

	for (const item of inventory.items) {
		const flags = item.flags.obsidian;
		if (flags.parent) {
			const container = map.get(flags.parent);
			if (container) {
				container.flags.obsidian.contents.push(item);
			}
		} else {
			inventory.root.push(item);
		}
	}
};
