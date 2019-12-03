import {ObsidianItemSheet} from './item-sheet.js';
import {ObsidianDialog} from '../dialogs/dialog.js';
import {ObsidianCurrencyDialog} from '../dialogs/currency.js';
import {Schema} from '../module/schema.js';

export class ObsidianContainerSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-container', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form)));
		});
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 460;
		options.template = 'modules/obsidian/html/sheets/container.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-remove').keypress(ObsidianCurrencyDialog.onAddRemove);
	}

	static enrichFlags (data) {
		if (data.type === 'backpack') {
			if (!data.flags.obsidian) {
				data.flags.obsidian = duplicate(Schema.Container);
			}
		}
	}
}
