class ObsidianFeaturesDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.title = game.i18n.localize('OBSIDIAN.ManageFeatures');
		options.template = 'public/modules/obsidian/html/dialogs/features.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-feature').click(this._onAdd.bind(this));
		html.find('.obsidian-rm-feature').click(this._onRemove.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onAdd (evt) {
		evt.preventDefault();
		await this.parent.actor.createOwnedItem({
			type: 'feat',
			name: game.i18n.localize('OBSIDIAN.NewFeature'),
			flags: {
				obsidian: {
					custom: true,
					active: this.options.active,
					action: this.options.action
				}
			}
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

		const update = {};
		await this.parent.actor.updateFeatures(update);
		if (!$.isEmptyObject(update)) {
			await this.parent.actor.update(update);
		}

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
				const name = this.element.find(`[name="${item.id}.name"]`);
				const active = name.next();
				const action = active.next();

				formData[`items.${i}.name`] = name.val();
				formData[`items.${i}.flags.obsidian.active`] = active.val();
				formData[`items.${i}.flags.obsidian.action`] = action.val();
			}
		}

		super._updateObject(event, formData);
	}
}
