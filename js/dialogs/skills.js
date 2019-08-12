class ObsidianSkillsDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 420;
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-skill').click(this._onAddSkill.bind(this));
		html.find('.obsidian-rm-skill').click(this._onRemoveSkill.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	/**
	 * @private
	 */
	async _onAddSkill (evt) {
		evt.preventDefault();
		const skills = duplicate(getProperty(this.parent.actor.data, this.options.dataPath));

		skills.push({
			id: skills.length,
			ability: 'str',
			bonus: 0,
			value: 0,
			label: '',
			custom: true
		});

		const update = {};
		update[this.options.dataPath] = skills;
		await this.parent.actor.update(update);
		this.render(false);
	}

	/**
	 * @private
	 */
	async _onRemoveSkill (evt) {
		evt.preventDefault();
		const skills = duplicate(getProperty(this.parent.actor.data, this.options.dataPath));
		const update = {};
		update[this.options.dataPath] = ObsidianDialog.removeRow(skills, evt);
		await this.parent.actor.update(update);
		this.render(false);
	}
}
