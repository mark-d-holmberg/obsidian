class ObsidianItemSheet extends ItemSheet {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 520;
		options.classes = options.classes.concat(['item', 'dialog', 'obsidian-window']);
		options.resizable = false;
		options.submitOnUnfocus = false;
		return options;
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		if (this.actor && this.actor.apps) {
			Object.values(this.actor.apps)
				.filter(app => app.setModal)
				.forEach(app => app.setModal(true));
		}

		super.activateListeners(html);
		console.debug(this.item);
		ObsidianDialog.initialiseComponents(html);
	}

	getData () {
		const data = super.getData();
		data.actor = this.actor;
		data.ObsidianRules = Obsidian.Rules;

		if (data.actor) {
			data.actor.data.feats = data.actor.data.items.filter(item => item.type === 'feat');
		}

		return data;
	}

	async close () {
		await super.close();
		if (this.actor && this.actor.apps) {
			Object.values(this.actor.apps)
				.filter(app => app.setModal)
				.forEach(app => app.setModal(false));
		}
	}

	get _formData () {
		const form = this.element.find('form')[0];
		const formData = validateForm(form);

		Object.values(this.editors).forEach(ed => {
			if (ed.mce && ed.changed) {
				formData[ed.target] = ed.mce.getContent();
			} else {
				delete formData[ed.target];
			}
		});

		return formData;
	}

	/**
	 * @private
	 */
	_saveScrollPosition () {
		if (this.element) {
			this._scroll = this.element.find('.window-content').prop('scrollTop');
		}
	}

	/**
	 * @private
	 */
	async _render (force = false, options = {}) {
		this._saveScrollPosition();
		await super._render(force, options);
		this._restoreScrollPosition();
	}

	/**
	 * @private
	 */
	_restoreScrollPosition () {
		if (this.element) {
			this.element.find('.window-content').prop('scrollTop', this._scroll);
		}
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onAddDamage (evt) {
		evt.preventDefault();
		const prop = $(evt.currentTarget).closest('fieldset').data('prop');
		const damage = getProperty(this.item.data.flags.obsidian, prop);
		const newDamage = {ndice: 1, die: 4, stat: 'str', bonus: 0, type: ''};
		const formData = this._formData;
		formData[`flags.obsidian.${prop}.${damage.length}`] = newDamage;
		this.item.update(formData);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemoveDamage (evt) {
		evt.preventDefault();
		await this.item.update(this._formData);
		const prop = $(evt.currentTarget).closest('fieldset').data('prop');
		const damage = getProperty(this.item.data.flags.obsidian, prop);
		this.item.update({[`flags.obsidian.${prop}`]: ObsidianDialog.removeRow(damage, evt)});
	}
}
