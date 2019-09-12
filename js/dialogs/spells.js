class ObsidianSpellsDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 520;
		options.height = 700;
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/dialogs/spells.html';
	}
}
