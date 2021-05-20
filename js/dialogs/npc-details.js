import {ObsidianDialog} from './dialog.js';
import {OBSIDIAN} from '../global.js';

export class ObsidianNPCDetailsDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 650;
		options.title = game.i18n.localize('OBSIDIAN.EditDetails');
		options.template = 'modules/obsidian/html/dialogs/npc-details.html';
		return options;
	}

	activateListeners (html) {
		let swarmChecked = false;
		if (!OBSIDIAN.notDefinedOrEmpty(this.parent.actor.data.data.details.type?.swarm)) {
			swarmChecked = true;
		}

		html.find('input[name="flags.obsidian.details.swarm"]').prop('checked', swarmChecked);
		super.activateListeners(html);
	}
}
