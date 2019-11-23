import {ObsidianItemSheet} from './item-sheet.js';
import {ObsidianDialog} from '../dialogs/dialog.js';
import {OBSIDIAN} from '../rules/rules.js';

export class ObsidianFeatureSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-feature', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form)));
		});
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 560;
		options.template = 'modules/obsidian/html/sheets/feature.html';
		return options;
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-damage').click(this._onAddDamage.bind(this));
		html.find('.obsidian-rm-damage').click(this._onRemoveDamage.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	static enrichFlags (data) {
		if (data.type === 'feat') {
			data.flags.obsidian = mergeObject(OBSIDIAN.Schema.Feature, data.flags.obsidian);
		}
	}
}
