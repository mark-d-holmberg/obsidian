import {ActorSheet5eNPC} from '../../../../systems/dnd5e/module/actor/sheets/npc.js';

export class ObsidianNPC extends ActorSheet5eNPC {
	get template () {
		return 'modules/obsidian/html/npc.html';
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(['obsidian-window'])
		});

		return options;
	}
}
