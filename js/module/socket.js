import {ObsidianActor} from './actor.js';

export function addSocketListener () {
	game.socket.on('module.obsidian', handleMsg);
}

function handleMsg (payload) {
	if (!game.user.isGM) {
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

			return scene.deleteEmbeddedEntity('Token', tokenIDs);
		});
	} else {
		const actor = getActor(payload);
		if (actor) {
			actor[`${payload.action.toLowerCase()}EmbeddedEntity`](payload.entity, payload.data);
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
