import {ObsidianDialog} from './dialog.js';
import {OBSIDIAN} from '../global.js';
import {ObsidianNPCFeaturesDialog} from './npc-features.js';

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
		ObsidianNPCFeaturesDialog.prototype.activateListeners.apply(this, arguments);
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
		const selection = this.element.find('select').val();
		const itemData = {
			name: game.i18n.localize('OBSIDIAN.NewFeature'),
			type: 'feat',
			data: {activation: {type: selection}}
		};

		if (selection === 'component') {
			itemData.name = game.i18n.localize('OBSIDIAN.NewComponent');
			itemData.type = 'equipment';
			itemData.flags = {obsidian: {subtype: 'vehicle'}};
			delete itemData.data;
		} else if (selection === 'siege' || selection === 'weapon') {
			itemData.name = game.i18n.localize('OBSIDIAN.NewWeapon');
			itemData.type = 'weapon';

			if (selection === 'siege') {
				itemData.flags = {obsidian: {category: 'siege'}};
			}

			delete itemData.data;
		}

		const item = await this.parent.actor.createEmbeddedEntity('OwnedItem', itemData);
		this.parent.actor.items.get(item._id).sheet.render(true);
		this.close();
	}

	_updateObject (event, formData) {
		if (formData['flags.obsidian.actions'] === game.i18n.localize('OBSIDIAN.ActionRules')) {
			formData['flags.obsidian.actions'] = '';
		}

		super._updateObject(event, formData);
	}
}
