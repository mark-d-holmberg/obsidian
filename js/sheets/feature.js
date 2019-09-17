class ObsidianFeatureSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-feature', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form), {richText: true}));
		});
	}

	get template () {
		return 'public/modules/obsidian/html/sheets/feature.html';
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		ObsidianDialog.recalculateHeight(html, {richText: true});
	}

	static enrichFlags (data) {
		if (data.type === 'feat') {
			data.flags.obsidian =
				mergeObject({
					active: 'active',
					action: 'action',
					source: {},
					uses: {enabled: false},
					dc: {enabled: false}
				}, data.flags.obsidian);
		}
	}
}

Items.registerSheet('dnd5e', ObsidianFeatureSheet, {types: ['feat'], makeDefault: true});
Hooks.on('preCreateItem', (constructor, data) => ObsidianFeatureSheet.enrichFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => ObsidianFeatureSheet.enrichFlags(data));
Hooks.on('createOwnedItem', (item, id, data) => item.actor.linkClasses(data));
