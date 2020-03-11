export function fixBackpacks () {
	const getItemUpdates = actorData => {
		if (!actorData || !actorData.items) {
			return [];
		}

		const parents = new Set();
		for (const item of actorData.items) {
			if (item && item.flags.obsidian.parent) {
				parents.add(item.flags.obsidian.parent);
			}
		}

		return Array.from(parents);
	};

	game.actors.entities.forEach(async actor => {
		const updates = getItemUpdates(actor.data);
		if (updates.length) {
			await actor.updateManyEmbeddedEntities('OwnedItem', updates.map(id => {
				return {
					_id: id,
					type: 'backpack'
				};
			}));
		}
	});

	game.scenes.entities.forEach(async scene => {
		const tokenUpdates = [];
		for (const token of scene.data.tokens) {
			if (token.actorLink) {
				continue;
			}

			const updates = getItemUpdates(token.actorData);
			if (updates.length) {
				tokenUpdates.push({
					_id: token._id,
					'actorData.items': duplicate(token.actorData.items).map(item => {
						if (updates.includes(item._id)) {
							item.type = 'backpack';
						}

						return item;
					})
				});
			}
		}

		if (tokenUpdates.length) {
			await scene.updateManyEmbeddedEntities('Token', tokenUpdates);
		}
	});
}
