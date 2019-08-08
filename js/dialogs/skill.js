Obsidian.Dialog.Skill = class ObsidianSkillDialog extends Obsidian.Dialog {
	constructor (parent, skillID) {
		super(parent, {
			title: `Manage ${skillID.startsWith('tools') ? 'Tool' : 'Skill'}: `
				+ getProperty(parent.actor.data.flags.obsidian.skills, skillID).label,
			width: 250
		});

		this.skillID = skillID;
	}

	get template () {
		return 'public/modules/obsidian/html/dialogs/skill.html';
	}

	getData () {
		const data = super.getData();
		data.skillID = this.skillID;
		return data;
	}
};
