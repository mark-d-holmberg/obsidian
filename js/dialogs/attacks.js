class ObsidianAttacksDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		options.title = game.i18n.localize('OBSIDIAN.ManageAttacks');
		options.template = 'public/modules/obsidian/html/dialogs/attacks.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-attack').click(this._onAddAttack.bind(this));
		html.find('.obsidian-rm-attack').click(this._onRemoveAttack.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	/**
	 * @private
	 */
	async _onAddAttack (evt) {
		evt.preventDefault();
		const attacks = duplicate(this.parent.actor.data.flags.obsidian.attacks.custom);

		attacks.push({
			id: attacks.length,
			custom: true,
			type: 'melee',
			mode: 'melee',
			label: '',
			damage: [],
			tags: {},
			stat: 'str',
			bonus: 0,
			proficient: true
		});

		await this.parent.actor.update({'flags.obsidian.attacks.custom': attacks});
		this.render(false);
	}

	/**
	 * @private
	 */
	async _onRemoveAttack (evt) {
		evt.preventDefault();
		const attacks = duplicate(this.parent.actor.data.flags.obsidian.attacks.custom);
		await this.parent.actor.update({
			'flags.obsidian.attacks.custom': ObsidianDialog.removeRow(attacks, evt)
		});
		this.render(false);
	}
}
