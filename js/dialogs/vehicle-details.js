import {ObsidianDialog} from './dialog.js';

export class ObsidianVehicleDetailsDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 400;
		options.title = game.i18n.localize('OBSIDIAN.EditDetails');
		options.template = 'modules/obsidian/html/dialogs/vehicle-details.html';
		return options;
	}
}
