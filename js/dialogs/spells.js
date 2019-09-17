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

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-rm-spell').click(this._onRemoveSpell.bind(this));
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemoveSpell (evt) {
		const row = $(evt.currentTarget).parents('details');
		const id = Number(row.data('item-id'));
		await this.parent.actor.deleteOwnedItem(id);
		this.render(false);
	}
}
