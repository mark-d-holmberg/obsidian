class ObsidianSpellSlotDialog extends ObsidianDialog {
	constructor (parent, spell) {
		super(parent);
		this.spell = spell;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 400;
		options.title = game.i18n.localize('OBSIDIAN.CastAtWhichLevel');
		options.template = 'modules/obsidian/html/dialogs/spell-slot.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('[data-roll]').click(this._onCastSpell.bind(this));
	}

	getData () {
		const data = super.getData();
		data.spell = this.spell;
		return data;
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onCastSpell (evt) {
		const isRitual = evt.currentTarget.dataset.level === 'ritual';
		const isPact = evt.currentTarget.dataset.level === 'pact';
		let level = Number(evt.currentTarget.dataset.level);

		if (isPact) {
			level = this.parent.actor.data.data.spells.pact.level;
		} else if (isRitual) {
			level = this.spell.data.level.value;
		}

		if (!isRitual) {
			const prop = isPact ? 'data.spells.pact.uses' : `data.spells.spell${level}.value`;
			this.parent.actor.update({[`${prop}`]: getProperty(this.parent.actor.data, prop) + 1});
		}

		evt.currentTarget.dataset.level = level;
		Obsidian.Rolls.fromClick(this.parent.actor, evt);
		this.close();
	}
}
