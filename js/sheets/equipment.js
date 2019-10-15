class ObsidianEquipmentSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-equipment', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form)));
		})
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 480;
		options.template = 'public/modules/obsidian/html/sheets/equipment.html';
		return options;
	}

	static enrichFlags (data) {
		if (data.type === 'equipment') {
			if (!data.flags) {
				data.flags = {};
			}

			if (!data.flags.obsidian) {
				data.flags.obsidian = duplicate(Obsidian.EQUIPMENT_SCHEMA);
			}
		}
	}

	getData () {
		const data = super.getData();
		data.subtypes = Obsidian.EQUIP_TYPES;
		return data;
	}
}

Items.registerSheet('dnd5e', ObsidianEquipmentSheet, {types: ['equipment'], makeDefault: true});
Hooks.on('preCreateItem', (constructor, data) => ObsidianEquipmentSheet.enrichFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => ObsidianEquipmentSheet.enrichFlags(data));
