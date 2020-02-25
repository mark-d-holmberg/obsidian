export function prepareNPC (actorData) {
	if (!actorData.flags) {
		actorData.flags = {};
	}

	if (!actorData.flags.obsidian) {
		actorData.flags.obsidian = {
			attributes: {init: {ability: 'dex'}},
			skills: {},
			sheet: {roll: 'reg'}
		};
	}
}
