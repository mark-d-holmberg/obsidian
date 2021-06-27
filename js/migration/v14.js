import {OBSIDIAN} from '../global.js';
import {Config} from '../data/config.js';

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
	},

	convertTempMaxHP: function (data) {
		let hpMaxMod = data.flags?.obsidian?.attributes?.hpMaxMod;
		if (OBSIDIAN.notDefinedOrEmpty(hpMaxMod)) {
			return;
		}

		hpMaxMod = Number(hpMaxMod);
		if (isNaN(hpMaxMod)) {
			return;
		}

		data.data.attributes.hp.tempmax = hpMaxMod;
	},

	convertSkills: function (data) {
		const skills = data.flags?.obsidian?.skills;
		const tools = data.flags?.obsidian?.tools;

		for (const skill of skills?.custom || []) {
			if (OBSIDIAN.notDefinedOrEmpty(skill.label)) {
				continue;
			}

			const key = skill.label.slugify({strict: true});
			skills[key] = duplicate(skill);
		}

		for (const tool of tools?.custom || []) {
			if (OBSIDIAN.notDefinedOrEmpty(tool.label)) {
				continue;
			}

			const key = tool.label.slugify({strict: true});
			tools[key] = duplicate(tool);
		}
	},

	convertClass: function (data) {
		if (data.type !== 'class') {
			return;
		}

		if (Config.CLASSES.includes(data.name)) {
			if (data.name === 'custom') {
				data.name = data.flags.obsidian.custom;
			} else {
				data.name = game.i18n.localize(`OBSIDIAN.Class.${data.name}`);
			}
		}
	}
};
