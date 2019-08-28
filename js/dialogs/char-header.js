class ObsidianHeaderDetailsDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 420;
		options.title = game.i18n.localize('OBSIDIAN.EditDetails');
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/dialogs/header-details.html';
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
		ObsidianDialog.recalculateHeight(html, {bareLabels: true});
	}

	/**
	 * @private
	 */
	async _onAddClass (evt) {
		evt.preventDefault();
		const classes = this.parent.actor.getFlag('obsidian', 'classes');
		const firstClass = Object.keys(Obsidian.Rules.CLASS_HIT_DICE)[0];

		classes.push({
			id: Obsidian.uuid(),
			name: firstClass,
			levels: 1,
			hd: Obsidian.Rules.CLASS_HIT_DICE[firstClass]
		});

		const hd = this.parent.actor.updateHD(classes);
		await this.parent.actor.update({
			'flags.obsidian.classes': classes,
			'flags.obsidian.attributes.hd': hd
		});

		this.render(false);
	}

	/**
	 * @private
	 */
	static _onChangeClass (evt) {
		const el = $(evt.currentTarget);
		const siblings = el.siblings();
		const cls = el.val();
		const subclass = siblings[1];
		const hd = siblings[3];

		if (cls === 'custom') {
			subclass.style.width = '65px';
			return;
		} else {
			subclass.style.width = '';
		}

		hd.selectedIndex = Obsidian.Rules.HD.indexOf(Obsidian.Rules.CLASS_HIT_DICE[cls]);
	}

	/**
	 * @private
	 */
	async _onRemoveClass (evt) {
		evt.preventDefault();
		const classes = this.parent.actor.getFlag('obsidian', 'classes');
		const newClasses = ObsidianDialog.removeRow(classes, evt);
		const update = {'flags.obsidian.classes': newClasses};
		await this.parent.actor.updateClasses(classes, newClasses, update);
		await this.parent.actor.update(update);
		this.render(false);
	}

	/**
	 * @private
	 */
	async _updateObject (event, formData) {
		const newData = {};
		const classes =
			ObsidianDialog.reconstructArray(formData, newData, 'flags.obsidian.classes');
		await this.parent.actor.updateClasses(
			this.parent.actor.getFlag('obsidian', 'classes'), classes, newData);
		super._updateObject(event, newData);
	}
}
