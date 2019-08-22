class ObsidianArrayDialog extends ObsidianDialog {
	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find(`.obsidian-add-${this.cls}`).click(this._onAdd.bind(this));
		html.find(`.obsidian-rm-${this.cls}`).click(this._onRemove.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onAdd (evt) {
		evt.preventDefault();
		const array = duplicate(getProperty(this.parent.actor.data, this.flag));
		const item = this.item;
		if (item.id === undefined) {
			item.id = array.length;
		}
		array.push(this.item);
		const update = {};
		update[this.flag] = array;
		await this.parent.actor.update(update);
		this.render(false);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemove (evt) {
		evt.preventDefault();
		const array = getProperty(this.parent.actor.data, this.flag);
		const update = {};
		update[this.flag] = ObsidianDialog.removeRow(array, evt);
		if (this.onRemove) {
			this.onRemove(array, update);
		}
		await this.parent.actor.update(update);
		this.render(false);
	}
}
