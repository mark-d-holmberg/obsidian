import {ObsidianDialog} from './dialog.js';

export class ObsidianNPCSkillsDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 500;
		options.title = game.i18n.localize('OBSIDIAN.ManageSkills');
		options.template = 'modules/obsidian/html/dialogs/npc-skills.html';
		return options;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-prof').click(this._setSkillProficiency.bind(this));
	}

	async _setSkillProficiency (evt) {
		const id = evt.currentTarget.dataset.skill;
		const skill = this.parent.actor.data.flags.obsidian.skills[id];

		let newValue = 0;
		if (skill.value === 0) {
			newValue = 1;
		} else if (skill.value === 1) {
			newValue = 2;
		}

		await this.parent.actor.update({[`flags.obsidian.skills.${id}.value`]: newValue});
		this.render(true);
	}
}
