import {ObsidianDialog} from './dialog.js';

export class ObsidianXPDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		options.title = game.i18n.localize('OBSIDIAN.ManageXP');
		return options;
	}

	get template () {
		return 'modules/obsidian/html/dialogs/xp.html';
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('input[name="addRemoveXP"]').keypress((evt) => {
			if (evt.key === 'Enter') {
				this.close();
			}
		});
	}

	async close () {
		const xpDeltaStr = this.element.find('input[name="addRemoveXP"]').val();
		const xp = this.element.find('input[name="data.details.xp.value"]');

		if (xpDeltaStr != null && xpDeltaStr !== '') {
			const delta = this._numberFormatter.parse(xpDeltaStr);
			if (!isNaN(delta)) {
				xp.val(this.parent.actor.data.data.details.xp.value + delta);
			}
		}

		return super.close();
	}
}
