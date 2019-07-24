class ObsidianSkillsDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 420;
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/skills-dialog.html';
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-skill').click(this._onAddSkill.bind(this));
		html.find('.obsidian-rm-skill').click(this._onRemoveSkill.bind(this));
		ObsidianDialog.recalculateHeight(html, false);
	}

	/**
	 * @private
	 */
	async _onAddSkill (evt) {
		evt.preventDefault();
		const skills = duplicate(this.parent.actor.data.flags.obsidian.skills.custom);

		skills.push({
			id: skills.length,
			ability: 'str',
			bonus: 0,
			value: 0,
			label: ''
		});

		await this.parent.actor.update({'flags.obsidian.skills.custom': skills});
		this.render(false);
	}

	/**
	 * @private
	 */
	async _onRemoveSkill (evt) {
		evt.preventDefault();
		const skills = duplicate(this.parent.actor.data.flags.obsidian.skills.custom);
		await this.parent.actor.update({
			'flags.obsidian.skills.custom': ObsidianDialog.removeRow(skills, evt)
		});

		this.render(false);
	}
}
