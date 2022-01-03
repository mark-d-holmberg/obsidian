import {ObsidianDialog} from './dialog.js';

export class ObsidianXPDialog extends ObsidianDialog {
	constructor (...args) {
		super(...args);
		this._formatter = new Intl.NumberFormat();
	}

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

		const formatter = this._formatter;
		const formatXP = function () {
			const value = this.value;
			if (!value?.length) {
				return value;
			}

			const parsed = formatter.parse(value);
			if (isNaN(parsed)) {
				return value;
			}

			this.value = formatter.format(formatter.parse(value));
		};

		html.find('input').keyup(formatXP).each((i, el) => formatXP.call(el));
	}

	async close () {
		const xpDeltaStr = this.element.find('input[name="addRemoveXP"]').val();
		const xp = this.element.find('input[name="data.details.xp.value"]');

		if (xpDeltaStr != null && xpDeltaStr !== '') {
			const delta = this._formatter.parse(xpDeltaStr);
			if (!isNaN(delta)) {
				xp.val(this.parent.actor.data.data.details.xp.value + delta);
			}
		}

		return super.close();
	}

	async _updateObject (event, formData) {
		const parsed = this._formatter.parse(formData['data.details.xp.value']);
		if (isNaN(parsed)) {
			delete formData['data.details.xp.value'];
		}
		formData['data.details.xp.value'] = parsed;
		return super._updateObject(event, formData);
	}
}
