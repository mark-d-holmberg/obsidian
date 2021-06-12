import {Rolls} from './rolls.js';

export function sendTriggers (combat) {
	const actor = combat.combatant?.actor;
	if (!actor?.obsidian?.triggers?.start?.length) {
		return;
	}

	const chatData = Rolls.toMessage(actor, 'selfroll');
	chatData.sound = null;
	chatData.flags = {
		obsidian: {
			start: true,
			title: game.i18n.localize('OBSIDIAN.TurnStart')
		}
	};

	ChatMessage.create(chatData);
}
