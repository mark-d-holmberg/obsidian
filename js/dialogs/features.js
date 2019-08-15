class ObsidianFeaturesDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.title = game.i18n.localize('OBSIDIAN.ManageFeatures');
		options.template = 'public/modules/obsidian/html/dialogs/features.html';
		return options;
	}
}
