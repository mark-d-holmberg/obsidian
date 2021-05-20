export async function rollInitiative (actor, initiative) {
	let combat = ui.combat.combat;
	if (!combat && game.user.isGM) {
		combat = await game.combats.documentClass.create({scene: canvas.scene.id, active: true});
	} else if (!game.combats.active && !game.user.isGM) {
		return;
	}

	let token;
	if (actor.isToken) {
		token = actor.token;
	} else {
		const tokens = actor.getActiveTokens(true);
		if (tokens.length) {
			token = tokens[0];
		}
	}

	if (!token) {
		return;
	}

	const combatant = combat.getCombatantByToken(token.id);
	if (combatant) {
		return combat.setInitiative(combatant.id, initiative);
	} else {
		return combat.createEmbeddedDocuments("Combatant", [{
			tokenId: token.id,
			hidden: token.data.hidden,
			initiative: initiative
		}]);
	}
}
