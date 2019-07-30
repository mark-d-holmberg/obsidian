class ObsidianSkillDialog extends ObsidianDialog {
	constructor (parent, skillID) {
		let custom = skillID.includes('.');
		if (custom) {
			const split = skillID.split('.');
			custom = split[0];
			skillID = parseInt(split[1]);
		}

		super(parent, {
			title: `Manage ${custom === 'tools' ? 'Tool' : 'Skill'}: ${custom
				? parent.actor.data.flags.obsidian.skills[custom][skillID].label
				: parent.actor.data.data.skills[skillID].label}`,
			width: 250
		});

		this.custom = custom;
		this.skillID = skillID;
	}

	get template () {
		return 'public/modules/obsidian/html/skill-dialog.html';
	}

	getData () {
		const data = super.getData();
		data.custom = this.custom;
		data.skillID = this.skillID;
		return data;
	}
}
