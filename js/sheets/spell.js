import {ObsidianItemSheet} from './item-sheet.js';
import {ObsidianDialog} from '../dialogs/dialog.js';
import {Schema} from '../module/schema.js';

export class ObsidianSpellSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-spell', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form)));
		});
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 560;
		return options;
	}

	get template () {
		return 'modules/obsidian/html/sheets/spell.html';
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-damage').click(this._onAddDamage.bind(this));
		html.find('.obsidian-rm-damage').click(this._onRemoveDamage.bind(this));
		html.find('[name="data.level"]').focusout(this._onSubmit.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	static enrichFlags (data) {
		if (data.type === 'spell') {
			if (!data.flags.obsidian) {
				data.flags.obsidian = duplicate(Schema.Spell);
			}
		}
	}
}
