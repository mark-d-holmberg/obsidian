import {ObsidianDialog} from './dialog.js';
import {ObsidianCharacter} from '../sheets/obsidian.js';

export class ObsidianNPCSavesDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 300;
		options.title = game.i18n.localize('OBSIDIAN.ManageSaves');
		options.template = 'modules/obsidian/html/dialogs/npc-saves.html';
		options.npc = true;
		return options;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-save-item .obsidian-radio').click(async evt => {
			await ObsidianCharacter.prototype._setSaveProficiency.apply(this.parent, [evt]);
			this.render(true);
		});
	}
}
