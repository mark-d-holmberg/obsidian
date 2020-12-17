import {ObsidianItemSheet} from './item-sheet.js';

export class ObsidianClassSheet extends ObsidianItemSheet {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.template = 'modules/obsidian/html/sheets/class.html';
		return options;
	}

	get title () {
		return this.item.data.obsidian.label;
	}

	async close () {
		await super.close();
		Hooks.callAll('obsidian.classSheetClosed');
	}

	getData () {
		const data = super.getData();
		if (this.item.isOwned) {
			data.rollData = this.item.actor.getRollData();
		}

		return data;
	}
}
