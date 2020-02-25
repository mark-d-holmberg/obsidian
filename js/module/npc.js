import {Schema} from './schema.js';

export function prepareNPC (actorData) {
	if (!actorData.flags) {
		actorData.flags = {};
	}

	if (!actorData.flags.obsidian) {
		actorData.flags.obsidian = {
			attributes: {init: {ability: 'dex'}, ac: {ability1: 'dex', base: 10}, speed: {}},
			order: {equipment: {root: [], containers: []}},
			saves: {},
			skills: {custom: []},
			sheet: {roll: 'reg'}
		};
	}

	actorData.flags.obsidian.version = Schema.VERSION;
}
