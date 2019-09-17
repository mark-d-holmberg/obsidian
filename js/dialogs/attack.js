class ObsidianAttackDialog extends ObsidianDialog {
	constructor (parent, attackID) {
		super(parent, {
			title: game.i18n.localize('OBSIDIAN.EditAttack'),
			template: 'public/modules/obsidian/html/dialogs/attack.html',
			width: 560
		});

		this.attackID = parseInt(attackID);
		this.attack = this.parent.actor.getOwnedItem(this.attackID);
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
		ObsidianDialog.recalculateHeight(html, {fieldset: true});
	}

	getData () {
		const data = super.getData();
		data.attackID = this.attackID;
		data.attack = this.attack.data;
		return data;
	}

	/**
	 * @private
	 */
	_adjustMode (formData, tags) {
		const current = this.attack.data.flags.obsidian.mode;
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
	async _onAddDamage (evt) {
		evt.preventDefault();
		const prop = $(evt.currentTarget).parents('fieldset').data('prop');
		const damage = duplicate(this.attack.data.flags.obsidian[prop]);

		damage.push({
			ndice: 1,
			die: 4,
			stat: 'str',
			bonus: 0,
			type: ''
		});

		const update = {};
		update[`flags.obsidian.${prop}`] = damage;
		await this.attack.update(update);
		this.render(false);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onAddTag (evt) {
		evt.preventDefault();
		const tags = this.attack.data.flags.obsidian.tags;

		let available = null;
		for (const tag of Obsidian.Rules.ATTACK_TAGS) {
			if (tags[tag] === undefined) {
				available = tag;
				break;
			}
		}

		const update = {};
		if (available === null || available === 'custom') {
			const tagID = `custom-${Object.keys(tags).length}`;
			update[`flags.obsidian.tags.${tagID}`] = {
				label: '',
				custom: true
			};
		} else {
			update[`flags.obsidian.tags.${available}`] = true;
		}

		await this.attack.update(update);
		this.render(false);
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
	async _onRemoveDamage (evt) {
		evt.preventDefault();
		const prop = $(evt.currentTarget).parents('fieldset').data('prop');
		const damage = this.attack.data.flags.obsidian[prop];
		const update = {};
		update[`flags.obsidian.${prop}`] = ObsidianDialog.removeRow(damage, evt);
		await this.attack.update(update);
		this.render(false);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemoveTag (evt) {
		evt.preventDefault();
		const tag = $(evt.currentTarget).data('key');
		const tags = duplicate(this.attack.data.flags.obsidian.tags);
		delete tags[tag];
		await this.attack.update({'flags.obsidian.tags': tags});
		this.render(false);
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

		ObsidianDialog.recalculateHeight(this.element.find('form'), {fieldset: true});
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		const tags = this._collectTags();
		formData['flags.obsidian.tags'] = tags;
		formData['flags.obsidian.mode'] = this._adjustMode(formData, tags);
		this.attack.update(formData);
	}
}
