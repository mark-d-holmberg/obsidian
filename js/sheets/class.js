import {ObsidianItemSheet} from './item-sheet.js';

export class ObsidianClassSheet extends ObsidianItemSheet {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.template = 'modules/obsidian/html/sheets/class.html';
		return options;
	}

	get title () {
		return this.item.data.flags.obsidian.label;
	}

	async close () {
		await super.close();
		Hooks.callAll('obsidian.classSheetClosed');
	}
}
