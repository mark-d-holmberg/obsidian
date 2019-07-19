class ObsidianMaxHPDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/hp-dialog.html';
	}
}
