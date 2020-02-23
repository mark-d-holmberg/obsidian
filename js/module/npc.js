import {Prepare} from '../rules/prepare.js';
import {Filters} from '../rules/filters.js';

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

	actorData.obsidian = {
		filters: {
			mods: Filters.mods([]),
			bonuses: Filters.bonuses([])
		}
	};

	const data = actorData.data;
	const flags = actorData.flags.obsidian;

	Prepare.init(data, flags);

	return actorData;
}
