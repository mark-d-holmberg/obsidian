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
		return options;
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		console.debug(this.item);
		html.find('input').off('focusout').focusout(this._onSubmit.bind(this));
		html.find('select').off('change').change(this._onSubmit.bind(this));
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
