class ObsidianDialog extends BaseEntitySheet {
	constructor (parent, options) {
		super(parent.object, options);
		this.parent = parent;

		// Deregister the sheet as this is just a modal dialog.
		delete this.entity.apps[this.appId];
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

	get template () {
		return this.options.template;
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
		ObsidianDialog.initialiseComponents(html);
	}

	static initialiseComponents (html) {
		html.find('.fancy-checkbox').click(evt => {
			const target = $(evt.currentTarget);
			const selected = !target.hasClass('selected');
			const parent = target.parent();

			if (target.data('bound')) {
				const bound =  html.find(`input[name="${target.data('bound')}"]`)[0];
				if (bound.disabled) {
					return;
				}

				bound.checked = selected;
			}

			selected ? target.addClass('selected') : target.removeClass('selected');

			if (parent[0].tagName === 'LEGEND') {
				parent.parent()[0].disabled = !selected;
			}
		}).each((i, el) => {
			const jqel = $(el);
			if (jqel.data('bound')) {
				if (html.find(`input[name="${jqel.data('bound')}"]`)[0].checked) {
					jqel.addClass('selected');
				}
			}

			const parent = jqel.parent();
			if (parent[0].tagName === 'LEGEND') {
				parent.parent()[0].disabled = !jqel.hasClass('selected');
			}
		});

		const updateSelections = parent => {
			const selector = parent.data('selector');
			const val = parent.val();
			html.find(`[data-selector-parent="${selector}"]`).each((i, el) => {
				const jqel = $(el);
				const show = el.dataset.show && el.dataset.show.split(',').map(s => s.trimStart());
				const hide = el.dataset.hide && el.dataset.hide.split(',').map(s => s.trimStart());

				if ((show && show.includes(val)) || (hide && !hide.includes(val))) {
					jqel.removeClass('obsidian-hidden');
				} else {
					jqel.addClass('obsidian-hidden');
				}
			});
		};

		html.find('[data-selector]')
			.change(evt => {
				updateSelections($(evt.currentTarget));
				const recalculate = evt.currentTarget.dataset.recalculate;
				if (recalculate) {
					const options = {};
					options[recalculate] = true;
					ObsidianDialog.recalculateHeight($(this.form), options);
				}
			}).each((i, el) => updateSelections($(el)));
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

	static recalculateHeight (html, {fieldset, bareLabels, richText} = {}) {
		let total = 0;
		let selector = '.obsidian-form-row, label.obsidian-label-lg';
		if (bareLabels) {
			selector += ', label > input';
		}

		if (fieldset) {
			selector = 'fieldset';
		}

		if (richText) {
			selector = 'fieldset, form > label, .obsidian-rich-text';
		}

		html.find(selector)
			.each((i, el) => total += $(el).outerHeight(true));

		const content = html.parents('.window-content');
		html.height(total);

		const diff = total - content.height();
		const win = content.parents('.obsidian-window');
		win.height(win.height() + diff + (richText ? 20 : 0));
	}

	static reconstructArray (formData, newData, keySubstr) {
		const ar = [];
		for (const [key, val] of Object.entries(formData)) {
			if (key.startsWith(keySubstr)) {
				let [index, property] = key.substring(keySubstr.length + 1).split('.');
				index = parseInt(index);

				if (ar[index] === undefined) {
					ar[index] = {};
				}

				ar[index][property] = val;
			} else {
				newData[key] = val;
			}
		}

		newData[keySubstr] = ar;
		return ar;
	}

	static removeRow (data, evt) {
		const row = $(evt.currentTarget).parents('.obsidian-form-row');
		const id = Number(row.data('item-id'));
		const newData = [];

		for (let i = 0; i < data.length; i++) {
			const item = data[i];
			if (i !== id) {
				if (typeof item.id !== 'string') {
					item.id = newData.length;
				}

				newData.push(item);
			}
		}

		return newData;
	}
}
