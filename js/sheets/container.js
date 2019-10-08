class ObsidianContainerSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-container', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form), {richText: true}));
		});
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 460;
		options.template = 'public/modules/obsidian/html/sheets/container.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-remove').keypress(ObsidianCurrencyDialog.onAddRemove);
	}

	static enrichFlags (data) {
		if (data.type === 'backpack') {
			if (!data.flags) {
				data.flags = {};
			}

			if (!data.flags.obsidian) {
				data.flags.obsidian = duplicate(Obsidian.CONTAINER_SCHEMA);
			}
		}
	}
}

Items.registerSheet('dnd5e', ObsidianContainerSheet, {types: ['backpack'], makeDefault: true});
Hooks.on('preCreateItem', (constructor, data) => ObsidianContainerSheet.enrichFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => ObsidianContainerSheet.enrichFlags(data));
