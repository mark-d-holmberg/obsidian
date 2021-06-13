export const v14 = {
	convertActiveEffect: function (data) {
		if (data.type !== 'feat' || !data.flags?.obsidian?.activeEffect) {
			return;
		}

		const duration = data.flags.obsidian.duration;
		if (duration.scene && duration.token) {
			duration.uuid = `Scene.${duration.scene}.Token.${duration.token}`;
		} else if (duration.actor) {
			duration.uuid = `Actor.${duration.actor}`;
		}

		duration['-=scene'] = null;
		duration['-=token'] = null;
		duration['-=actor'] = null;
	},

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
		} else if (summon.actor) {
			summon.summoner = `Actor.${summon.actor}`;
		}

		summon['-=scene'] = null;
		summon['-=token'] = null;
		summon['-=actor'] = null;
	}
};
