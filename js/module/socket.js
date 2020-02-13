export function addSocketListener () {
	game.socket.on('module.obsidian', handleMsg);
}

function handleMsg (payload) {
	if (!game.user.isGM) {
		return;
	}

	if (payload.action === 'CREATE.OWNED') {
		createOwned(payload);
	}
}

function createOwned (payload) {
	const actor = game.actors.get(payload.actorID);
	if (!actor) {
		return;
	}

	actor.createEmbeddedEntity('OwnedItem', payload.data);
}
