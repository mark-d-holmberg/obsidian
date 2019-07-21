class ObsidianInitDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/init-dialog.html';
	}
}
