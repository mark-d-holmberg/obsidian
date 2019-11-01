class ObsidianDialog extends BaseEntitySheet {
	constructor (parent, options = {register: false}) {
		super(parent.object, options);
		this.parent = parent;

		if (!options.register) {
			// Deregister the sheet as this is just a modal dialog.
			delete this.entity.apps[this.appId];
		}
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		delete options.template;
		options.classes = ['form', 'dialog', 'obsidian-window'];
		options.closeOnSubmit = false;
		options.submitOnClose = true;
		options.submitOnUnfocus = true;
		options.width = 400;
		options.modal = true;
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
		const updateSelections = parent => {
			const selector = parent.data('selector');
			const val = parent.val();
			html.find(`[data-selector-parent="${selector}"]`).each((i, el) => {
				const jqel = $(el);
				const show = el.dataset.show && el.dataset.show.split(',').map(s => s.trimStart());
				const hide = el.dataset.hide && el.dataset.hide.split(',').map(s => s.trimStart());

				if (parent.attr('type') === 'checkbox') {
					if (parent.prop('checked')) {
						jqel.removeClass('obsidian-hidden');
					} else {
						jqel.addClass('obsidian-hidden');
					}
				} else {
					if ((show && show.includes(val)) || (hide && !hide.includes(val))) {
						jqel.removeClass('obsidian-hidden');
					} else {
						jqel.addClass('obsidian-hidden');
					}
				}
			});
		};

		html.find('.fancy-checkbox').click(evt => {
			const target = $(evt.currentTarget);
			const selected = !target.hasClass('selected');
			const parent = target.parent();

			if (target.data('bound')) {
				const bound =  html.find(`input[name="${target.data('bound')}"]`);
				if (bound.prop('disabled')) {
					return;
				}

				bound.prop('checked', selected);
				updateSelections(bound);
			}

			selected ? target.addClass('selected') : target.removeClass('selected');

			if (parent[0].tagName === 'LEGEND') {
				parent.parent()[0].disabled = !selected;
			}
		}).each((i, el) => {
			const jqel = $(el);
			if (jqel.data('bound')) {
				const bound =  html.find(`input[name="${jqel.data('bound')}"]`);
				if (bound.prop('checked')) {
					jqel.addClass('selected');
				}

				updateSelections(bound);
			}

			const parent = jqel.parent();
			if (parent[0].tagName === 'LEGEND') {
				parent.parent()[0].disabled = !jqel.hasClass('selected');
			}
		});

		html.find('select[data-selector]')
			.change(evt => {
				updateSelections($(evt.currentTarget));
				const recalculate = evt.currentTarget.dataset.recalculate;
				if (recalculate) {
					ObsidianDialog.recalculateHeight($(this.form));
				}
			}).each((i, el) => updateSelections($(el)));
	}

	async close () {
		if (this.parent.setModal && this.options.modal) {
			this.parent.setModal(false);
		}

		return super.close();
	}

	getData () {
		return this.parent.getData();
	}

	async maximize () {
		await super.maximize();
		ObsidianDialog.recalculateHeight($(this.form));
	}

	render (force = false, options = {}) {
		if (this.parent.setModal && this.options.modal) {
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
		const labels = html.children('label:not(.obsidian-inline)');
		const richText = html.children('.obsidian-rich-text').length > 0;
		html.children('div, fieldset, label.obsidian-inline')
			.add(labels.children('input'))
			.each((i, el) => total += $(el).outerHeight(true));

		const content = html.closest('.window-content');
		html.height(total);

		const diff = total - content.height();
		const win = content.closest('.obsidian-window');
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
		const row = $(evt.currentTarget).closest('.obsidian-form-row');
		const id = Number(row.data('item-id'));
		const newData = [];

		for (let i = 0; i < data.length; i++) {
			const item = data[i];
			if (i !== id) {
				if (typeof item === 'object' && typeof item.id !== 'string') {
					item.id = newData.length;
				}

				newData.push(item);
			}
		}

		return newData;
	}
}
