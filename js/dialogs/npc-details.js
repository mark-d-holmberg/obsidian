import {ObsidianDialog} from './dialog.js';

export class ObsidianNPCDetailsDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 650;
		options.title = game.i18n.localize('OBSIDIAN.EditDetails');
		options.template = 'modules/obsidian/html/dialogs/npc-details.html';
		return options;
	}
}
