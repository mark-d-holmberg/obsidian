class ObsidianFeaturesDialog extends ObsidianArrayDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.title = game.i18n.localize('OBSIDIAN.ManageFeatures');
		options.template = 'public/modules/obsidian/html/dialogs/features.html';
		return options;
	}

	get cls () {
		return 'feature';
	}

	get flag () {
		return 'flags.obsidian.features.custom';
	}

	get item () {
		return {
			id: Obsidian.uuid(),
			custom: true,
			label: '',
			active: this.options.active,
			action: this.options.action,
			source: {},
			uses: {enabled: false},
			dc: {enabled: false},
			desc: ''
		};
	}

	onRemove (features, update) {
		ObsidianActor.updateFeatures(features, update);
	}
}
