import {ObsidianActor} from './actor.js';
import {OBSIDIAN} from '../global.js';

export function addSocketListener () {
	game.socket.on('module.obsidian', handleMsg);
}

function handleMsg (payload) {
	if (!game.user.isGM) {
		return;
	}

	if (payload.action === 'CREATE.OWNED') {
		createOwned(payload);
	} else if (payload.action === 'DELETE.OWNED') {
		deleteOwned(payload);
	} else if (payload.action === 'DELETE.MANY.OWNED') {
		deleteManyOwned(payload);
	} else if (payload.action === 'SET.WORLD') {
		setWorld(payload);
	}
}

function createOwned (payload) {
	const actor = getActor(payload);
	if (!actor) {
		return;
	}

	actor.createEmbeddedEntity('OwnedItem', payload.data);
}

function deleteOwned (payload) {
	const actor = getActor(payload);
	if (!actor) {
		return;
	}

	actor.deleteEmbeddedEntity('OwnedItem', payload.itemID);
}

function deleteManyOwned (payload) {
	const actor = getActor(payload);
	if (!actor) {
		return;
	}

	OBSIDIAN.deleteManyOwnedItems(actor, payload.ids);
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
