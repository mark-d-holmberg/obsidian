class ObsidianCurrencyDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 300;
		options.title = game.i18n.localize('OBSIDIAN.ManageCurrency');
		options.template = 'public/modules/obsidian/html/dialogs/currency.html';
		return options;
	}

	/**
	 * @private
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-remove').keypress(this._onAddRemove);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onAddRemove (evt) {
		if (evt.key !== 'Enter') {
			return;
		}

		const target = $(evt.currentTarget);
		const currency = target.prev().find('input');
		const current = Number(currency.val());
		currency.val(current + Number(target.val()));
		target.val('');
	}
}
