export async function rollInitiative (actor, initiative) {
	let combat = game.combat;
	if (!combat) {
		if (!game.user.isGM) {
			return;
		}

		combat = await Combat.implementation.create({scene: canvas.scene.id, active: true});
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
