import {ObsidianDialog} from './dialog.js';
import {OBSIDIAN} from '../global.js';

export class ObsidianVehicleFeaturesDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 400;
		options.title = game.i18n.localize('OBSIDIAN.ManageFeatures');
		options.template = 'modules/obsidian/html/dialogs/vehicle-features.html';
		options.submitOnClose = true;
		options.submitOnChage = true;
		options.closeOnSubmit = false;
		return options;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('button').click(this._onAddFeature.bind(this));
	}

	getData () {
		const data = super.getData();
		data.featureList =
			data.landVehicle
				? OBSIDIAN.Rules.VEHICLE_LAND_FEATURES
				: OBSIDIAN.Rules.VEHICLE_WATER_FEATURES;

		return data;
	}

	async _onAddFeature () {

	}
}
