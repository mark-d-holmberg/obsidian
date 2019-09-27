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
}

Items.registerSheet('dnd5e', ObsidianSpellSheet, {types: ['spell'], makeDefault: true});
Hooks.on('preCreateItem', (constructor, data) => ObsidianSpellSheet.enrichFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => ObsidianSpellSheet.enrichFlags(data));