import {ObsidianDialog} from './dialog.js';

export class ObsidianSkillDialog extends ObsidianDialog {
	constructor (parent, skillID) {
		const skill = getProperty(parent.actor.data.flags.obsidian.skills, skillID);
		super(parent, {
			title: game.i18n.localize(
				`OBSIDIAN.Manage${skillID.startsWith('tools') ? 'Tool' : 'Skill'}`)
				+ ': '
				+ (skill.custom ? skill.label : game.i18n.localize(`OBSIDIAN.Skill-${skillID}`)),
			width: 300
		});

		this.skillID = skillID;
	}

	get template () {
		return 'modules/obsidian/html/dialogs/skill.html';
	}

	getData () {
		const data = super.getData();
		data.skillID = this.skillID;
		data.skill = getProperty(this.parent.actor.data.flags.obsidian.skills, this.skillID);
		return data;
	}
}
