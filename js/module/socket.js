import {ObsidianActor} from './actor.js';

export function addSocketListener () {
	game.socket.on('module.obsidian', handleMsg);
}

function handleMsg (payload) {
	if (!isPrimaryGM()) {
		return;
	}

	if (payload.action === 'SET.WORLD') {
		setWorld(payload);
	} else if (payload.action === 'DELETE.TOKENS') {
		payload.tokens.forEach(([sceneID, tokenIDs]) => {
			const scene = game.scenes.get(sceneID);
			if (!scene) {
				return;
			}

			return scene.deleteEmbeddedDocuments('Token', tokenIDs);
		});
	} else {
		const actor = getActor(payload);
		if (actor) {
			const data = Array.isArray(payload.data) ? payload.data : [payload.data];
			actor[`${payload.action.toLowerCase()}EmbeddedDocuments`](payload.entity, data);
		}
	}
}

function setWorld (payload) {
	game.settings.set('obsidian', payload.key, payload.value);
}

function getActor (payload) {
	if (payload.actorID) {
		return game.actors.get(payload.actorID);
	} else {
		return ObsidianActor.fromSceneTokenPair(payload.sceneID, payload.tokenID);
	}
}

function isPrimaryGM () {
	// We must route certain operations through a GM, but if there is more than
	// one GM connected then we don't want each GM to perform the same
	// operation. We must use a deterministic way of choosing the 'primary' GM.
	let id;
	const ids = Array.from(game.users.keys()).sort();

	for (let i = 0; i < ids.length; i++) {
		const user = game.users.get(ids[i]);
		if (user.active && user.isGM) {
			id = ids[i];
			break;
		}
	}

	return game.user.id === id;
}
