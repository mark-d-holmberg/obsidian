import {OBSIDIAN} from '../global.js';

export function prepareSpellcasting (actorData, data, flags, derived) {
	const mods = [];
	const attacks = [];
	const saves = [];
	const existing = {};

	derived.spellcasting = {mods: mods, attacks: attacks, saves: saves};
	for (const cls of derived.classes) {
		const spellcasting = cls.obsidian.spellcasting;
		if (!OBSIDIAN.notDefinedOrEmpty(spellcasting.spell) && !existing[spellcasting.spell]) {
			mods.push(spellcasting.mod);
			attacks.push(spellcasting.attack);
			saves.push(spellcasting.save);
			existing[spellcasting.spell] = true;
		}
	}

	if (actorData.type === 'npc' && !OBSIDIAN.notDefinedOrEmpty(data.attributes.spellcasting)) {
		const mod = data.abilities[data.attributes.spellcasting].mod;
		data.attributes.spellMod = mod;
		data.attributes.spellAtk = mod + data.attributes.prof;
		data.attributes.spelldc = mod + data.attributes.prof + 8;

		if (!OBSIDIAN.notDefinedOrEmpty(flags.spells.attack)) {
			data.attributes.spellAtk = flags.spells.attack;
		}

		if (!OBSIDIAN.notDefinedOrEmpty(flags.spells.save)) {
			data.attributes.spelldc = flags.spells.save;
		}

		if (!existing[data.attributes.spellcasting]) {
			mods.push(data.attributes.spellMod);
			attacks.push(data.attributes.spellAtk);
			saves.push(data.attributes.spelldc);
		}
	}

	if (data.spells.pact) {
		const levelOverride = flags.spells?.slots.pactLevel;
		if (!OBSIDIAN.notDefinedOrEmpty(levelOverride)) {
			data.spells.pact.level = Number(levelOverride);
		}
	}

	if (actorData.type === 'npc' && !OBSIDIAN.notDefinedOrEmpty(flags.spells?.slots.pactLevel)) {
		const lvl = data.details.spellLevel;
		data.spells.pact = data.spells.pact || {};
		data.spells.pact.level = Number(flags.spells?.slots.pactLevel);

		if (data.spells.pact.override) {
			data.spells.pact.max = data.spells.pact.override;
		} else {
			data.spells.pact.max =
				Math.max(1, Math.min(lvl, 2), Math.min(lvl - 8, 3), Math.min(lvl - 13, 4));
		}

		data.spells.pact.value = Math.min(data.spells.pact.value, data.spells.pact.max);
	}
}
