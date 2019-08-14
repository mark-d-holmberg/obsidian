class ObsidianAttackDialog extends ObsidianDialog {
	constructor (parent, attackID) {
		super(parent, {
			title: game.i18n.localize('OBSIDIAN.EditAttack'),
			template: 'public/modules/obsidian/html/dialogs/attack.html',
			width: 460
		});

		this.attackID = parseInt(attackID);
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
		data.attack = this.parent.actor.data.flags.obsidian.attacks.custom[this.attackID];
		return data;
	}

	/**
	 * @private
	 */
	_adjustMode (formData, tags) {
		const existing = this.parent.actor.data.flags.obsidian.attacks.custom[this.attackID];
		const type = formData[`flags.obsidian.attacks.custom.${this.attackID}.type`];

		if (type === 'ranged' || type === 'unarmed') {
			return type;
		}

		if ((existing.mode === 'ranged' && !tags.thrown)
			|| (existing.mode === 'versatile' && !tags.versatile)
			|| existing.mode === 'unarmed')
		{
			return 'melee';
		}

		return existing.mode;
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
		const damage = this.parent.actor.data.flags.obsidian.attacks.custom[this.attackID][prop];

		damage.push({
			ndice: 1,
			die: 4,
			stat: 'str',
			bonus: 0,
			type: ''
		});

		const existing = duplicate(this.parent.actor.data.flags.obsidian.attacks.custom);
		await this.parent.actor.update({'flags.obsidian.attacks.custom': existing});
		this.render(false);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onAddTag (evt) {
		evt.preventDefault();
		const tags = this.parent.actor.data.flags.obsidian.attacks.custom[this.attackID].tags;

		let available = null;
		for (const tag of Obsidian.Rules.ATTACK_TAGS) {
			if (tags[tag] === undefined) {
				available = tag;
				break;
			}
		}

		if (available === null || available === 'custom') {
			tags[`custom-${Object.keys(tags).length}`] = {
				label: '',
				custom: true
			};
		} else {
			tags[available] = true;
		}

		const existing = duplicate(this.parent.actor.data.flags.obsidian.attacks.custom);
		existing[this.attackID].tags = tags;
		await this.parent.actor.update({'flags.obsidian.attacks.custom': existing});
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
		const damage = this.parent.actor.data.flags.obsidian.attacks.custom[this.attackID][prop];
		const newDamage = ObsidianDialog.removeRow(damage, evt);
		const existing = duplicate(this.parent.actor.data.flags.obsidian.attacks.custom);
		existing[this.attackID][prop] = newDamage;
		await this.parent.actor.update({'flags.obsidian.attacks.custom': existing});
		this.render(false);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemoveTag (evt) {
		evt.preventDefault();
		const tag = $(evt.currentTarget).data('key');
		const tags = this.parent.actor.data.flags.obsidian.attacks.custom[this.attackID].tags;
		delete tags[tag];
		const existing = duplicate(this.parent.actor.data.flags.obsidian.attacks.custom);
		await this.parent.actor.update({'flags.obsidian.attacks.custom': existing});
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
		const damageData = {};
		ObsidianDialog.reconstructArray(
			formData, damageData, `flags.obsidian.attacks.custom.${this.attackID}.damage`);

		const versatileData = {};
		ObsidianDialog.reconstructArray(
			damageData, versatileData, `flags.obsidian.attacks.custom.${this.attackID}.versatile`);

		const customData = {};
		ObsidianDialog.reconstructArray(versatileData, customData, 'flags.obsidian.attacks.custom');

		const tags = this._collectTags();
		customData['flags.obsidian.attacks.custom'][this.attackID].tags = tags;
		customData['flags.obsidian.attacks.custom'][this.attackID].mode =
			this._adjustMode(formData, tags);

		const existing = duplicate(this.parent.actor.data.flags.obsidian.attacks.custom);
		existing[this.attackID] = customData['flags.obsidian.attacks.custom'][this.attackID];

		super._updateObject(event, {'flags.obsidian.attacks.custom': existing});
	}
}
