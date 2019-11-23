class ObsidianConsumableSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-consumable', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form)));
		});
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 560;
		options.template = 'modules/obsidian/html/sheets/consumable.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-damage').click(this._onAddDamage.bind(this));
		html.find('.obsidian-rm-damage').click(this._onRemoveDamage.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	static enrichFlags (data) {
		if (data.type === 'consumable') {
			if (!data.flags) {
				data.flags = {};
			}

			if (!data.flags.obsidian) {
				data.flags.obsidian = duplicate(Obsidian.CONSUMABLE_SCHEMA);
			}
		}
	}
}

Items.registerSheet('dnd5e', ObsidianConsumableSheet, {types: ['consumable'], makeDefault: true});
Hooks.on('preCreateItem', (constructor, data) => ObsidianConsumableSheet.enrichFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => ObsidianConsumableSheet.enrichFlags(data));
