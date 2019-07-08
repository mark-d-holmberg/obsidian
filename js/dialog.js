class ObsidianDialog extends BaseEntitySheet {
	constructor (parent, options) {
		super(parent.object, options);
		this.parent = parent;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		delete options.template;
		options.classes = ['form', 'dialog', 'obsidian-window'];
		options.closeOnSubmit = true;
		options.submitOnClose = true;
		options.width = 400;
		return options;
	}

	get title () {
		return this.options.title;
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		if (this.parent.setModal) {
			html.parents('.obsidian-window').find('a.close')
				.click(() => this.parent.setModal(false));
		}
	}

	getData () {
		return this.parent.getData();
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		this.parent._updateObject(event, formData);
	}
}

class ObsidianHeaderDetailsDialog extends ObsidianDialog {
	get template () {
		return 'public/modules/obsidian/html/header-details.html';
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-class').click(this._onAddClass.bind(this));
	}

	/**
	 * @private
	 */
	async _onAddClass (evt) {
		evt.preventDefault();

		let classes = this.parent.actor.getFlag('obsidian', 'classes');
		if (classes == null) {
			classes = [];
		} else {
			classes = JSON.parse(classes);
		}

		const firstClass = Object.keys(ObsidianRules.ClassHitDice)[0];
		classes.push({
			id: classes.length,
			name: firstClass,
			levels: 1,
			hd: ObsidianRules.ClassHitDice[firstClass]
		});

		await this.parent.actor.setFlag('obsidian', 'classes', JSON.stringify(classes));
		this.render(false, {
			renderContext: 'createExtraFlag',
			renderData: this.getData()
		});
	}
}
