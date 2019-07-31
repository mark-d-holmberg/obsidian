class ObsidianSkillDialog extends ObsidianDialog {
	constructor (parent, skillID) {
		super(parent, {
			title: `Manage ${skillID.startsWith('tools') ? 'Tool' : 'Skill'}: `
				+ getProperty(parent.actor.data.flags.obsidian.skills, skillID).label,
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
}
