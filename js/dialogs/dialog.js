class ObsidianDialog extends BaseEntitySheet {
	constructor (parent, options) {
		super(parent.object, options);
		this.parent = parent;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		delete options.template;
		options.classes = ['form', 'dialog', 'obsidian-window'];
		options.closeOnSubmit = false;
		options.submitOnClose = true;
		options.submitOnUnfocus = true;
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
		html.find('input').off('focusout').focusout(this._onSubmit.bind(this));
		html.find('select').off('change').change(this._onSubmit.bind(this));
		html.find('.fancy-checkbox').click((evt) => {
			const target = $(evt.currentTarget);
			const selected = !target.hasClass('selected');
			selected ? target.addClass('selected') : target.removeClass('selected');

			if (target.data('bound')) {
				html.find(`input[name="${target.data('bound')}"]`)[0].checked = selected;
			}
		}).each((i, el) => {
			const jqel = $(el);
			if (jqel.data('bound')) {
				if (html.find(`input[name="${jqel.data('bound')}"]`)[0].checked) {
					jqel.addClass('selected');
				}
			}
		});
	}

	async close () {
		if (this.parent.setModal) {
			this.parent.setModal(false);
		}

		return super.close();
	}

	getData () {
		return this.parent.getData();
	}

	render (force = false, options = {}) {
		if (this.parent.setModal) {
			this.parent.setModal(true);
		}

		return super.render(force, options);
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		this.parent._updateObject(event, formData);
	}

	static recalculateHeight (html) {
		let total = 0;
		html.find('label > input, .obsidian-form-row')
			.each((i, el) => total += $(el).outerHeight(true));

		const content = html.parents('.window-content');
		html.height(total);
		const padding = parseInt(content.css('padding'));
		total += padding * 2.5;

		const diff = total - content.height();
		const win = content.parents('.obsidian-window');
		win.height(win.height() + diff);
	}
}
