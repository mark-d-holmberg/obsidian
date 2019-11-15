class ObsidianNewClassDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.title = game.i18n.localize('OBSIDIAN.AddClass');
		options.template = 'public/modules/obsidian/html/dialogs/new-class.html';
		options.submitOnClose = false;
		options.submitOnUnfocus = false;
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
		ObsidianDialog.recalculateHeight(html);
	}
}
