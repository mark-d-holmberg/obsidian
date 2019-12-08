import {ObsidianItemSheet} from './item-sheet.js';
import {ObsidianDialog} from '../dialogs/dialog.js';
import {OBSIDIAN} from '../rules/rules.js';

export class ObsidianEquipmentSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-equipment', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form)));
		})
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 480;
		options.template = 'modules/obsidian/html/sheets/equipment.html';
		return options;
	}

	static enrichFlags (data) {
		if (data.type === 'equipment') {
			if (!data.flags.obsidian) {
				data.flags.obsidian = duplicate(OBSIDIAN.Schema.Equipment);
			}
		}
	}

	getData () {
		const data = super.getData();
		data.subtypes = OBSIDIAN.Schema.EquipTypes;
		return data;
	}
}
