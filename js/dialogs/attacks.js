class ObsidianAttacksDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		options.title = game.i18n.localize('OBSIDIAN.ManageAttacks');
		options.template = 'public/modules/obsidian/html/dialogs/attacks.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @returns undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-attack').click(this._onAdd.bind(this));
		html.find('.obsidian-rm-attack').click(this._onRemove.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onAdd (evt) {
		evt.preventDefault();
		await this.parent.actor.createOwnedItem({
			type: 'weapon',
			name: game.i18n.localize('OBSIDIAN.NewAttack')
		});

		this.render(false);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemove (evt) {
		const row = $(evt.currentTarget).parents('.obsidian-form-row');
		const id = Number(row.data('item-id'));
		await this.parent.actor.deleteOwnedItem(id);
		this.render(false);
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		formData = {};
		const ids =
			Array.from(this.element.find('[data-item-id]')).map(el => Number(el.dataset.itemId));

		for (let i = 0; i < this.parent.actor.items.length; i++) {
			const item = this.parent.actor.items[i];
			const index = ids.indexOf(item.id);

			if (index > -1) {
				formData[`items.${i}.name`] = this.element.find(`[name="${item.id}.name"]`).val();
			}
		}

		super._updateObject(event, formData);
	}
}
