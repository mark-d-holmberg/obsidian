export const v14 = {
	convertSpellcasting: function (data) {
		if (data.flags.obsidian?.spellcasting?.enabled && data.data.spellcasting) {
			data.data.spellcasting.ability = data.flags.obsidian.spellcasting.spell;
		}
	},

	convertCreatureType: function (data) {
		if (data.flags.obsidian.details?.type) {
			data.data.details.type.value = data.flags.obsidian.details.type;
		}

		if (data.flags.obsidian.details?.tags?.custom) {
			data.data.details.type.subtype = data.flags.obsidian.details.tags.custom;
		}
	}
};
