import {OBSIDIAN} from '../global.js';

export function prepareNPC (actorData) {
	const flags = actorData.flags.obsidian;
	actorData.obsidian.tags = [];

	for (const [tag, val] of Object.entries(flags.details.tags)) {
		if (tag === 'custom' || !val) {
			continue;
		}

		actorData.obsidian.tags.push(game.i18n.localize(`OBSIDIAN.CreatureTag-${tag}`));
	}

	actorData.obsidian.tags = actorData.obsidian.tags.join(', ');
	if (!OBSIDIAN.notDefinedOrEmpty(flags.details.tags.custom)) {
		if (!OBSIDIAN.notDefinedOrEmpty(actorData.obsidian.tags)) {
			actorData.obsidian.tags += ', ';
		}

		actorData.obsidian.tags += flags.details.tags.custom;
	}
}
