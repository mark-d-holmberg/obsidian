class ObsidianSpellsDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 520;
		return options;
	}

	get template () {
		return 'public/modules/html/dialogs/spells.html';
	}
}
