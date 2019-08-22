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
			active: 'active',
			action: 'action',
			source: {},
			uses: {enabled: false},
			dc: {enabled: false},
			desc: ''
		};
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-feat-active').change(ObsidianFeaturesDialog._onActiveChange);
	}

	onRemove (features, update) {
		ObsidianActor.updateFeatures(features, update);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	static _onActiveChange (evt) {
		const target = $(evt.currentTarget);
		const action = target.next();

		if (target.val() === 'active') {
			action.removeClass('obsidian-hidden');
		} else {
			action.addClass('obsidian-hidden');
		}
	}
}
