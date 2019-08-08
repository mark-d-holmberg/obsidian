Obsidian.Dialog.Proficiencies = class ObsidianProficienciesDialog extends Obsidian.Dialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		options.title = 'Manage Proficiencies';
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/dialogs/profs.html';
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-prof').click(this._onAddProficiency.bind(this));
		html.find('.obsidian-rm-prof').click(this._onRemoveProficiency.bind(this));
		Obsidian.Dialog.recalculateHeight(html, true);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onAddProficiency (evt) {
		evt.preventDefault();
		const cat = $(evt.currentTarget).data('cat');
		const profs = duplicate(this.parent.actor.data.flags.obsidian.traits.profs.custom[cat]);
		profs.push('');
		const update = {};
		update[`flags.obsidian.traits.profs.custom.${cat}`] = profs;
		await this.parent.actor.update(update);
		this.render(false);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemoveProficiency (evt) {
		evt.preventDefault();
		const row = $(evt.currentTarget).parents('.obsidian-form-row');
		const id = parseInt(row.data('item-id'));
		const cat = row.data('cat');
		const profs = duplicate(this.parent.actor.data.flags.obsidian.traits.profs.custom[cat]);
		profs.splice(id, 1);
		const update = {};
		update[`flags.obsidian.traits.profs.custom.${cat}`] = profs;
		await this.parent.actor.update(update);
		this.render(false);
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		const profs = {};
		this.element.find('input').each((i, el) => {
			const jqel = $(el);
			const row = jqel.parents('.obsidian-form-row');
			const cat = row.data('cat');

			if (profs[cat] === undefined) {
				profs[cat] = [];
			}

			profs[cat].push(jqel.val());
		});

		formData = {'flags.obsidian.traits.profs.custom': profs};
		super._updateObject(event, formData);
	}
};
