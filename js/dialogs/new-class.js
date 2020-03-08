import {ObsidianDialog} from './dialog.js';

export class ObsidianNewClassDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.title = game.i18n.localize('OBSIDIAN.AddClass');
		options.template = 'modules/obsidian/html/dialogs/new-class.html';
		options.submitOnClose = false;
		options.submitOnChange = false;
		options.closeOnSubmit = true;
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('select').change(() => ObsidianDialog.recalculateHeight(html));
		html.find('button').click(this._onSubmit.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onSubmit (evt) {
		this.options.callback({
			name: this.element.find('select').val(),
			custom: this.element.find('input').val()
		});
		this.close();
	}
}
