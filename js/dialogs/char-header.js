class ObsidianHeaderDetailsDialog extends ObsidianDialog {
	constructor (...args) {
		super(...args);
		this._hookID = Hooks.on('obsidian-classSheetClosed', () => this.render(false));
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 420;
		options.title = game.i18n.localize('OBSIDIAN.EditDetails');
		return options;
	}

	get template () {
		return 'modules/obsidian/html/dialogs/header-details.html';
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-class').click(this._onAddClass.bind(this));
		html.find('.obsidian-rm-class').click(this._onRemoveClass.bind(this));
		html.find('.obsidian-edit').click(this._editItem.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	async close () {
		Hooks.off('obsidian-classSheetClosed', this._hookID);
		return super.close();
	}

	static determineHD (cls) {
		if (cls === 'custom') {
			return 6;
		}

		return Obsidian.Rules.CLASS_HIT_DICE[cls];
	}

	static determineSpellcasting (cls) {
		if (cls === 'custom') {
			return {};
		}

		if (Obsidian.Rules.NON_CASTERS.includes(cls)) {
			return {enabled: false};
		}

		return {
			enabled: true,
			spell: Obsidian.Rules.CLASS_SPELL_MODS[cls],
			progression: Obsidian.Rules.CLASS_SPELL_PROGRESSION[cls],
			preparation: Obsidian.Rules.CLASS_SPELL_PREP[cls],
			rituals: Obsidian.Rules.CLASS_RITUALS[cls]
		};
	}

	setModal (modal) {
		const win = $(this.form).closest('.obsidian-window');
		if (modal) {
			win.addClass('obsidian-background');
		} else {
			win.removeClass('obsidian-background');
		}
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_editItem (evt) {
		const item =
			this.parent.actor.getOwnedItem(
				$(evt.currentTarget).closest('[data-item-id]').data('item-id'));
		item.sheet.render(true);
	}

	/**
	 * @private
	 */
	async _onAddClass (evt) {
		evt.preventDefault();
		evt.stopPropagation();
		new ObsidianNewClassDialog(this, {callback: this._onNewClass.bind(this)}).render(true);
	}

	/**
	 * @private
	 */
	async _onNewClass (cls) {
		const item = {
			name: cls.name,
			type: 'class',
			data: {levels: {value: 1}},
			flags: {obsidian: {}}
		};

		if (cls.name === 'custom') {
			item.flags.obsidian.custom = cls.custom;
		}

		await this.parent.actor.createOwnedItem(item, {displaySheet: false});
		this.render(false);
	}

	/**
	 * @private
	 */
	async _onRemoveClass (evt) {
		evt.preventDefault();
		const itemID = Number($(evt.currentTarget).closest('.obsidian-class-row').data('item-id'));
		await this.parent.actor.deleteOwnedItem(itemID);
		this.render(false);
	}

	async _updateObject (event, formData) {
		const data = Array.from(this.element.find('[data-item-id]')).map(el => {
			const inputs = $(el).find('input');
			return {
				id: Number(el.dataset.itemId),
				data: {
					levels: {value: Number(inputs[1].value)},
					subclass: {value: inputs[0].value}
				},
			};
		});

		await this.parent.actor.updateManyOwnedItem(data);
		return this.parent.actor.update({
			'flags.obsidian.details.gender': formData['flags.obsidian.details.gender'],
			'data.details.race.value': formData['data.details.race.value'],
			'flags.obsidian.details.subrace': formData['flags.obsidian.details.subrace'],
			'flags.obsidian.attributes.hd':
				this.parent.actor.updateHD(this.parent.actor.data.obsidian.classes)
		});
	}
}
