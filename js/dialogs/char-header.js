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
		ObsidianDialog.recalculateHeight(html);
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
		this.render(false);
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
		const classes = this.parent.actor.getFlag('obsidian', 'classes');
		await this._updateFlags(ObsidianDialog.removeRow(classes, evt));
		this.render(false);
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
		const classes =
			ObsidianDialog.reconstructArray(formData, newData, 'flags.obsidian.classes');
		newData['flags.obsidian.attributes.hd'] = this.parent.actor.updateHD(classes);
		super._updateObject(event, newData);
	}
}
