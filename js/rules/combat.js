export async function rollInitiative (actor, initiative) {
	let combat = ui.combat.combat;
	if (!combat && game.user.isGM) {
		combat = await game.combats.object.create({scene: canvas.scene._id, active: true});
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

	const combatant = combat.getCombatantByToken(token.data._id);
	if (combatant) {
		return combat.setInitiative(combatant._id, initiative);
	} else {
		return combat.createEmbeddedEntity("Combatant", {
			tokenId: token.data._id,
			hidden: token.data.hidden,
			initiative: initiative
		});
	}
}
