class ObsidianItemSheet extends ItemSheet {
	constructor (...args) {
		super(...args);
		this.scrolling = false;
	}

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
		super.activateListeners(html);
		console.debug(this.item);
		ObsidianDialog.initialiseComponents(html);
	}

	getData () {
		const data = super.getData();
		data.actor = this.actor;
		data.ObsidianRules = Obsidian.Rules;
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

	render (force = false, options = {}) {
		if (this.actor && this.actor.apps) {
			Object.values(this.actor.apps)
				.filter(app => app.setModal)
				.forEach(app => app.setModal(true));
		}

		return super.render(force, options);
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
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onScroll (evt) {
		if (!this.scrolling) {
			setTimeout(() => {
				this.item.data.flags['_scroll'] = this.element.prop('scrollTop');
				this.scrolling = false;
			}, 200);

			this.scrolling = true;
		}
	}

	_rememberScrollPosition () {
		this.element.on('scroll', this._onScroll.bind(this));
		if (this.item.data.flags['_scroll'] !== undefined) {
			this.element.prop('scrollTop', this.item.flags['_scroll']);
		}
	}
}
