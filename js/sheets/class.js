class ObsidianClassSheet extends ObsidianItemSheet {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.template = 'public/modules/obsidian/html/sheets/class.html';
		return options;
	}

	static enrichFlags (data) {
		if (data.type === 'class') {
			if (!data.flags) {
				data.flags = {};
			}

			if (!data.flags.obsidian) {
				data.flags.obsidian = duplicate(Obsidian.CLASS_SCHEMA);
			}
		}
	}
}

Items.registerSheet('dnd5e', ObsidianClassSheet, {types: ['class'], makeDefault: true});
Hooks.on('preCreateItem', (constructor, data) => ObsidianClassSheet.enrichFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => ObsidianClassSheet.enrichFlags(data));
