import {OBSIDIAN} from '../global.js';

export class ObsidianDialog extends DocumentSheet {
	constructor (parent, options = {register: false}) {
		super(parent.object, options);
		this.parent = parent;

		if (this.parent.setModal && this.options.modal) {
			this.parent.setModal(true);
		}

		this._numberFormatter = new Intl.NumberFormat();
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		delete options.template;
		options.classes = ['form', 'dialog', 'obsidian-window'];
		options.closeOnSubmit = false;
		options.submitOnClose = true;
		options.submitOnChange = true;
		options.width = 400;
		options.modal = true;
		options.pinnable = false;
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
		if (this.options.submitOnChange) {
			html.find('input').off('focusout').focusout(this._onSubmit.bind(this));
			html.find('select').off('change').change(this._onSubmit.bind(this));
		}

		this.activateLargeNumberInputs(html);
		ObsidianDialog.initialiseComponents(html);
	}

	activateLargeNumberInputs (html) {
		html.find('input.obsidian-num-fmt')
			.keyup(evt => this.formatLargeNumber(evt.currentTarget))
			.each((i, el) => this.formatLargeNumber(el));
	}

	static initialiseComponents (html) {
		const updateSelections = parent => {
			const selector = parent.data('selector');
			const val = parent.val();
			html.find(`[data-selector-parent="${selector}"]`).each((i, el) => {
				const jqel = $(el);
				const isParentHidden =
					(parent.attr('type') !== 'checkbox' && parent.hasClass('obsidian-hidden'))
					|| (parent.attr('type') === 'checkbox'
						&& parent.prev().hasClass('obsidian-hidden'));

				if (isParentHidden) {
					jqel.addClass('obsidian-hidden');

					if (jqel.data('selector')) {
						updateSelections(jqel);
					}

					return;
				}

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

				if (jqel.data('selector')) {
					updateSelections(jqel);
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
		const data = this.parent.getData();
		data.dialogOptions = this.options;
		return data;
	}

	async maximize () {
		await super.maximize();
		ObsidianDialog.recalculateHeight($(this.form));
	}

	activateEditor (name, options = {}, initialContent = '') {
		options.content_css = [
			...CONFIG.TinyMCE.content_css,
			OBSIDIAN.getFont(),
			'modules/obsidian/css/obsidian-mce.css'
		].join(',');
		super.activateEditor(name, options, initialContent);
	}

	render (force, options = {}) {
		super.render(force, options);
		if (!options.register) {
			// Deregister the sheet as this is just a modal dialog.
			delete this.document.apps[this.appId];
		}
	}

	formatLargeNumber (el) {
		const value = el.value;
		if (!value?.length) {
			return value;
		}

		const parsed = this._numberFormatter.parse(value);
		if (isNaN(parsed)) {
			return value;
		}

		el.value = this._numberFormatter.format(parsed);
	}

	updateLargeNumberInputs (formData) {
		this.element.find('input.obsidian-num-fmt').each((i, el) => {
			if (!el.name || !(el.name in formData)) {
				return;
			}

			const parsed = this._numberFormatter.parse(formData[el.name]);
			if (isNaN(parsed)) {
				delete formData[el.name];
			} else {
				formData[el.name] = parsed;
			}
		});
	}

	/**
	 * @private
	 */
	async _updateObject (event, formData) {
		this.updateLargeNumberInputs(formData);
		return this.parent._updateObject(event, formData);
	}

	static recalculateHeight (html) {
		let total = 0;
		const richText = html.children('.obsidian-rich-text').length > 0;
		html.children('div, fieldset, label').each((i, el) => total += $(el).outerHeight(true));

		const content = html.closest('.window-content');
		html.height(total);

		const diff = total - content.height();
		const win = content.closest('.obsidian-window');
		win.height(win.height() + diff + (richText ? 20 : 0));
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
