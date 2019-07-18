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
}

class ObsidianHeaderDetailsDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 420;
		return options;
	}

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
		html.find('.obsidian-rm-class').click(this._onRemoveClass.bind(this));
		html.find('select:first-child').change(ObsidianHeaderDetailsDialog._onChangeClass);

		// render doesn't correctly recalculate height when adding and removing
		// form rows.
		ObsidianHeaderDetailsDialog._recalculateHeight(html);
	}

	/**
	 * @private
	 */
	async _onAddClass (evt) {
		evt.preventDefault();
		const classes = this.parent.actor.getFlag('obsidian', 'classes');
		const firstClass = Object.keys(ObsidianRules.ClassHitDice)[0];

		classes.push({
			id: classes.length,
			name: firstClass,
			levels: 1,
			hd: ObsidianRules.ClassHitDice[firstClass]
		});

		await this._updateFlags(classes);
		this.render(false, {
			renderContext: 'addClass',
			renderData: this.getData()
		});
	}

	/**
	 * @private
	 */
	static _onChangeClass (evt) {
		const el = $(evt.currentTarget);
		const siblings = el.siblings();
		const cls = el.val();
		const custom = $(siblings[0]);
		const subclass = siblings[1];
		const hd = siblings[3];

		if (cls === 'Custom') {
			custom.removeClass('obsidian-hidden');
			subclass.style.width = '65px';
			return;
		} else {
			custom.addClass('obsidian-hidden');
			subclass.style.width = '';
		}

		hd.selectedIndex = ObsidianRules.HD.indexOf(ObsidianRules.ClassHitDice[cls]);
	}

	/**
	 * @private
	 */
	async _onRemoveClass (evt) {
		evt.preventDefault();

		const row = $(evt.currentTarget).parents('.obsidian-form-row');
		const id = Number(row.data('item-id'));
		const classes = this.parent.actor.getFlag('obsidian', 'classes');
		const newClasses = [];

		for (let i = 0; i < classes.length; i++) {
			const cls = classes[i];
			if (i !== id) {
				cls.id = newClasses.length;
				newClasses.push(cls);
			}
		}

		await this._updateFlags(newClasses);
		this.render(false, {
			renderContext: 'removeClass',
			renderData: this.getData()
		});
	}

	/**
	 * @private
	 */
	static _recalculateHeight (html) {
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

	/**
	 * @private
	 */
	async _updateFlags (newClasses) {
		const hd = this.parent.actor.updateHD(newClasses);
		await this.parent.actor.update({
			'flags.obsidian.classes': newClasses,
			'flags.obsidian.attributes.hd': hd
		});
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		const newData = {};
		const classes = [];

		for (const [key, val] of Object.entries(formData)) {
			if (key.startsWith('flags.obsidian.classes')) {
				let [index, property] = key.substring(23).split('.');
				index = parseInt(index);

				if (classes[index] === undefined) {
					classes[index] = {};
				}

				classes[index][property] = val;
			} else {
				newData[key] = val;
			}
		}

		const hd = this.parent.actor.updateHD(classes);
		newData['flags.obsidian.classes'] = classes;
		newData['flags.obsidian.attributes.hd'] = hd;
		super._updateObject(event, newData);
	}
}

class ObsidianXPDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/xp-dialog.html';
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('input[name="addRemoveXP"]').keypress((evt) => {
			if (evt.key === 'Enter') {
				this.close();
			}
		});

		if (html.find('input[name="flags.obsidian.details.milestone"]')[0].checked) {
			html.find('.fancy-checkbox').addClass('selected');
		}
	}

	/**
	 * @private
	 */
	_onSubmit (event, {preventClose = false} = {}) {
		const xpDeltaStr = this.element.find('input[name="addRemoveXP"]').val();
		if (xpDeltaStr != null && xpDeltaStr !== '') {
			const delta = Number(xpDeltaStr);
			if (!isNaN(delta)) {
				this.element.find('input[name="data.details.xp.value"]')
					.val(parseInt(this.parent.actor.data.data.details.xp.value) + delta);
			}
		}

		return super._onSubmit(event, {preventClose: preventClose});
	}
}
