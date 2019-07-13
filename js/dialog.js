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
		options.width = 420;
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

		html.find('input').off('focusout').focusout(this._onSubmit.bind(this));
		html.find('select').off('change').change(this._onSubmit.bind(this));
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

		await this.parent.actor.setFlag('obsidian', 'classes', classes);
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

		await this.parent.actor.setFlag('obsidian', 'classes', newClasses);
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
}
