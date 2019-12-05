import {ObsidianItemSheet} from './item-sheet.js';
import {Obsidian} from '../module/obsidian.js';
import {ObsidianHeaderDetailsDialog} from '../dialogs/char-header.js';

export class ObsidianClassSheet extends ObsidianItemSheet {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.template = 'modules/obsidian/html/sheets/class.html';
		return options;
	}

	get title () {
		return this.item.data.flags.obsidian.label;
	}

	static enrichFlags (data) {
		if (data.type === 'class') {
			if (!data.flags) {
				data.flags = {};
			}

			if (!data.flags.obsidian) {
				data.flags.obsidian = {};
			}

			switch (data.name) {
				case 'Barbarian': data.name = 'brb'; break;
				case 'Bard': data.name = 'brd'; break;
				case 'Cleric': data.name = 'clr'; break;
				case 'Druid': data.name = 'drd'; break;
				case 'Fighter': data.name = 'fgt'; break;
				case 'Monk': data.name = 'mnk'; break;
				case 'Paladin': data.name = 'pal'; break;
				case 'Ranger': data.name = 'rng'; break;
				case 'Rogue': data.name = 'rog'; break;
				case 'Sorcerer': data.name = 'src'; break;
				case 'Warlock': data.name = 'war'; break;
				case 'Wizard': data.name = 'wiz'; break;
			}

			data.flags.obsidian.uuid = Obsidian.uuid();
			data.flags.obsidian.hd = ObsidianHeaderDetailsDialog.determineHD(data.name);
			data.flags.obsidian.spellcasting =
				ObsidianHeaderDetailsDialog.determineSpellcasting(data.name);
		}
	}

	async close () {
		await super.close();
		Hooks.callAll('obsidian-classSheetClosed');
	}
}
