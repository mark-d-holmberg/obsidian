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
	},

	convertSummon: function (data) {
		const summon = data.flags?.obsidian?.summon;
		if (!summon) {
			return;
		}

		if (summon.scene && summon.token) {
			summon.summoner = `Scene.${summon.scene}.Token.${summon.token}`;
		} else {
			summon.summoner = `Actor.${summon.actor}`;
		}

		summon['-=scene'] = null;
		summon['-=token'] = null;
		summon['-=actor'] = null;
	}
};
