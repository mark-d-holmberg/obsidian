class ObsidianWeaponSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-weapon', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form)));
		});
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 560;
		options.template = 'public/modules/obsidian/html/sheets/weapon.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-attack-type').change(this._updateDisplay.bind(this));
		html.find('.obsidian-attack-tag').change(this._onModifyTags.bind(this));
		html.find('.obsidian-add-damage').click(this._onAddDamage.bind(this));
		html.find('.obsidian-rm-damage').click(this._onRemoveDamage.bind(this));
		html.find('.obsidian-add-tag').click(this._onAddTag.bind(this));
		html.find('.obsidian-rm-tag').click(this._onRemoveTag.bind(this));
		html.find('.obsidian-add-special').click(this._onAddSpecial.bind(this));
		html.find('.obsidian-rm-special').click(this._onRemoveSpecial.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	static enrichFlags (data) {
		if (data.type === 'weapon') {
			if (!data.flags) {
				data.flags = {};
			}

			if (!data.flags.obsidian) {
				data.flags.obsidian = duplicate(Obsidian.WEAPON_SCHEMA);
			}
		}
	}

	/**
	 * @private
	 */
	_adjustMode (formData, tags) {
		const current = this.item.data.flags.obsidian.mode;
		const type = formData[`flags.obsidian.type`];

		if (type === 'ranged' || type === 'unarmed') {
			return type;
		}

		if ((current === 'ranged' && !tags.thrown)
			|| (current === 'versatile' && !tags.versatile)
			|| current === 'unarmed')
		{
			return 'melee';
		}

		return current;
	}

	/**
	 * @private
	 */
	_collectTags () {
		const tags = {};
		this.element.find('.obsidian-attack-tag').each((i, el) => {
			const jqel = $(el);
			const tag = jqel.val();

			if (tag === 'custom') {
				tags[`custom-${Object.keys(tags).length}`] = {
					label: jqel.next().val(),
					custom: true
				};
			} else {
				tags[tag] = true;
			}
		});

		return tags;
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onAddSpecial (evt) {
		evt.preventDefault();
		const formData = this._formData;
		const newSpecial = {name: '', uses: {max: 0}};
		let special = this.item.data.flags.obsidian.special;

		if (special === undefined) {
			formData['flags.obsidian.special'] = [newSpecial];
		} else {
			special = duplicate(special);
			formData[`flags.obsidian.special.${special.length}`] = newSpecial;
		}

		this.item.update(formData);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onAddTag (evt) {
		evt.preventDefault();
		const tags = this.item.data.flags.obsidian.tags;

		let available = null;
		for (const tag of Obsidian.Rules.WEAPON_TAGS) {
			if (tags[tag] === undefined) {
				available = tag;
				break;
			}
		}

		const formData = this._formData;
		if (available === null || available === 'custom') {
			const tagID = `custom-${Object.keys(tags).length}`;
			formData[`flags.obsidian.tags.${tagID}`] = {label: '', custom: true};
		} else {
			formData[`flags.obsidian.tags.${available}`] = true;
		}

		this.item.update(formData);
	}

	/**
	 * @private
	 */
	_onModifyTags () {
		this.element.find('.obsidian-attack-tag').each((i, el) => {
			const jqel = $(el);
			const input = jqel.next();
			if (jqel.val() === 'custom') {
				input.removeClass('obsidian-hidden');
			} else {
				input.addClass('obsidian-hidden');
			}
		});

		this._updateDisplay();
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemoveSpecial (evt) {
		evt.preventDefault();
		await this.item.update(this._formData);
		this.item.update({
			'flags.obsidian.special':
				ObsidianDialog.removeRow(this.item.data.flags.obsidian.special, evt)
		});
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemoveTag (evt) {
		evt.preventDefault();
		const formData = this._formData;
		const tag = $(evt.currentTarget).data('key');
		const tags = duplicate(this.item.data.flags.obsidian.tags);
		delete tags[tag];
		formData['flags.obsidian.tags'] = tags;
		this.item.update(formData);
	}

	/**
	 * @private
	 */
	_updateDisplay () {
		const tags = this._collectTags();
		const range = this.element.find('.obsidian-range-row');
		const versatile = this.element.find('.obsidian-versatile-block');
		const type = this.element.find('.obsidian-attack-type').val();

		if (tags.thrown || type === 'ranged') {
			range.removeClass('obsidian-hidden');
		} else {
			range.addClass('obsidian-hidden');
		}

		if (tags.versatile) {
			versatile.removeClass('obsidian-hidden');
		} else {
			versatile.addClass('obsidian-hidden');
		}

		ObsidianDialog.recalculateHeight(this.element.find('form'));
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		const tags = this._collectTags();
		formData['flags.obsidian.tags'] = tags;
		formData['flags.obsidian.mode'] = this._adjustMode(formData, tags);
		this.item.update(formData);
	}
}

Items.registerSheet('dnd5e', ObsidianWeaponSheet, {types: ['weapon'], makeDefault: true});
Hooks.on('preCreateItem', (constructor, data) => ObsidianWeaponSheet.enrichFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => ObsidianWeaponSheet.enrichFlags(data));
