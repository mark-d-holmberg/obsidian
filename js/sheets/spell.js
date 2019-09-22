class ObsidianSpellSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-spell', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form), {richText: true}));
		});
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 560;
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/sheets/spell.html';
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-damage').click(this._onAddDamage.bind(this));
		html.find('.obsidian-rm-damage').click(this._onRemoveDamage.bind(this));
		ObsidianDialog.recalculateHeight(html, {richText: true});
	}

	static enrichFlags (data) {
		if (data.type === 'spell') {
			if (!data.flags) {
				data.flags = {};
			}

			if (!data.flags.obsidian) {
				data.flags.obsidian = duplicate(Obsidian.SPELL_SCHEMA);
			}
		}
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onAddDamage (evt) {
		evt.preventDefault();
		const prop = $(evt.currentTarget).parents('fieldset').data('prop');
		const damage = getProperty(this.item.data.flags.obsidian, prop);
		const newDamage = {ndice: 1, die: 4, stat: 'spell', bonus: 0, type: ''};
		const formData = this._formData;
		formData[`flags.obsidian.${prop}.${damage.length}`] = newDamage;
		this.item.update(formData);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemoveDamage (evt) {
		evt.preventDefault();
		await this.item.update(this._formData);
		const prop = $(evt.currentTarget).parents('fieldset').data('prop');
		const damage = getProperty(this.item.data.flags.obsidian, prop);
		this.item.update({[`flags.obsidian.${prop}`]: ObsidianDialog.removeRow(damage, evt)});
	}
}

Items.registerSheet('dnd5e', ObsidianSpellSheet, {types: ['spell'], makeDefault: true});
Hooks.on('preCreateItem', (constructor, data) => ObsidianSpellSheet.enrichFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => ObsidianSpellSheet.enrichFlags(data));
