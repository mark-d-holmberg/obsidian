class ObsidianSpellSheet extends ItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-spell', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form), {richText: true}));
		});
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 520;
		options.classes = options.classes.concat(['item', 'dialog', 'obsidian-window']);
		options.template = 'public/modules/obsidian/html/sheets/spell.html';
		options.resizable = false;
		return options;
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		console.debug(this.item);
		html.find('input').off('focusout').focusout(this._onSubmit.bind(this));
		html.find('select').off('change').change(this._onSubmit.bind(this));
		html.find('.obsidian-add-damage').click(this._onAddDamage.bind(this));
		html.find('.obsidian-rm-damage').click(this._onRemoveDamage.bind(this));
		ObsidianDialog.initialiseComponents(html);
		ObsidianDialog.recalculateHeight(html, {richText: true});
	}

	static enrichFlags (data) {
		if (data.type === 'spell' && !data.flags.obsidian) {
			data.flags.obsidian = {
				damage: [],
				upcast: {enabled: false, damage: []},
				time: {},
				range: {},
				duration: {},
				components: {},
				hit: {enabled: false, stat: 'spell'},
				dc: {enabled: false, bonus: 8, prof: 1, ability: 'spell'}
			};
		}
	}

	getData () {
		const data = super.getData();
		data.ObsidianRules = Obsidian.Rules;
		return data;
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onAddDamage (evt) {
		evt.preventDefault();
		const prop = $(evt.currentTarget).parents('fieldset').data('prop');
		const damage = duplicate(getProperty(this.item.data.flags.obsidian, prop));
		damage.push({ndice: 1, die: 4, stat: 'spell', bonus: 0, type: ''});
		this.item.update({[`flags.obsidian.${prop}`]: damage});
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onRemoveDamage (evt) {
		evt.preventDefault();
		const prop = $(evt.currentTarget).parents('fieldset').data('prop');
		const damage = getProperty(this.item.data.flags.obsidian, prop);
		this.item.update({[`flags.obsidian.${prop}`]: ObsidianDialog.removeRow(damage, evt)});
	}
}

Items.registerSheet('dnd5e', ObsidianSpellSheet, {types: ['spell'], makeDefault: true});
Hooks.on('preCreateItem', (constructor, data) => ObsidianSpellSheet.enrichFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => ObsidianSpellSheet.enrichFlags(data));
