import {ObsidianDialog} from './dialog.js';

export class ObsidianSkillDialog extends ObsidianDialog {
	constructor (parent, evt) {
		const item = evt.currentTarget.closest('.obsidian-skill-item');
		const id = item.dataset.skillId || item.dataset.toolId;
		const tool = !!item.dataset.toolId;
		const prop = tool ? 'tools' : 'skills';
		const data = getProperty(parent.actor.data.flags.obsidian, `${prop}.${id}`);

		super(parent, {
			title: `${game.i18n.localize(`OBSIDIAN.Manage${tool ? 'Tool' : 'Skill'}`)}: `
				+ (data.custom
					? data.label
					: game.i18n.localize(`OBSIDIAN.${tool ? 'ToolProf' : 'Skill'}.${id}`)),
			width: 300
		});

		this._tool = tool;
		this._prop = prop;
		this._id = id;
		this._data = data;
	}

	get template () {
		return 'modules/obsidian/html/dialogs/skill.html';
	}

	getData () {
		const data = super.getData();
		data.tool = this._tool;
		data.prop = this._prop;
		data.id = this._id;
		data.data = this._data;
		data.data.label =
			this._data.custom
				? this._data.label
				: game.i18n.localize(`OBSIDIAN.${this._tool ? 'ToolProf' : 'Skill'}.${this._id}`);

		return data;
	}
}
