class ObsidianSkillDialog extends ObsidianDialog {
	constructor (parent, skillID) {
		super(parent, {
			title: `Manage Skill: ${parent.actor.data.data.skills[skillID].label}`,
			width: 250
		});
		this.skillID = skillID;
	}

	get template () {
		return 'public/modules/obsidian/html/skill-dialog.html';
	}

	getData () {
		const data = super.getData();
		data.skillID = this.skillID;
		return data;
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		const key = `data.skills.${this.skillID}.value`;
		formData[key] = parseFloat(formData[key]);
		super._updateObject(event, formData);
	}
}
