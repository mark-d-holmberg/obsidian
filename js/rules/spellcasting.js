import {OBSIDIAN} from '../global.js';

export function prepareSpellcasting (actorData, flags) {
	const data = actorData.data;
	const mods = [];
	const attacks = [];
	const saves = [];
	const existing = {};

	flags.attributes.spellcasting = {mods: mods, attacks: attacks, saves: saves};
	for (const cls of actorData.obsidian.classes) {
		if (!cls.flags.obsidian) {
			continue;
		}

		const spellcasting = cls.flags.obsidian.spellcasting;
		const levels = cls.data.levels;

		spellcasting.list = cls.name === 'custom' ? cls.flags.obsidian.custom : cls.name;
		spellcasting.spellList = [];

		if (OBSIDIAN.Data.SPELLS_BY_CLASS && OBSIDIAN.Data.SPELLS_BY_CLASS[spellcasting.list]) {
			const originalList = OBSIDIAN.Data.SPELLS_BY_CLASS[spellcasting.list];
			spellcasting.spellList = [].concat(originalList);
		}

		if (spellcasting.spell === undefined) {
			spellcasting.spell = OBSIDIAN.Rules.CLASS_SPELL_MODS[cls.name];
		}

		if (!OBSIDIAN.notDefinedOrEmpty(spellcasting.spell)) {
			const mod = data.abilities[spellcasting.spell].mod;
			spellcasting.mod = mod;
			spellcasting.attack = mod + data.attributes.prof;
			spellcasting.save = mod + data.attributes.prof + 8;

			if (!existing[spellcasting.spell]) {
				mods.push(spellcasting.mod);
				attacks.push(spellcasting.attack);
				saves.push(spellcasting.save);
				existing[spellcasting.spell] = true;
			}
		}

		if (cls.data.spellcasting === 'none') {
			cls.data.spellcasting = OBSIDIAN.Rules.CLASS_SPELL_PROGRESSION[cls.name] || 'none';
		}

		if (spellcasting.preparation === undefined) {
			spellcasting.preparation = OBSIDIAN.Rules.CLASS_SPELL_PREP[cls.name];
		}

		if (spellcasting.rituals === undefined) {
			spellcasting.rituals = OBSIDIAN.Rules.CLASS_RITUALS[cls.name];
		}

		const spellsKnown = OBSIDIAN.Rules.SPELLS_KNOWN_TABLE[cls.name];
		if (spellsKnown !== undefined) {
			spellcasting.maxKnown = spellsKnown.known[levels - 1];
			spellcasting.maxCantrips = spellsKnown.cantrips[levels - 1];
			if (spellcasting.maxCantrips === undefined) {
				spellcasting.maxCantrips = spellsKnown.cantrips[spellsKnown.cantrips.length - 1];
			}
		}

		if (spellcasting.preparation === 'prep') {
			spellcasting.maxPrepared = data.abilities[spellcasting.spell].mod;
			switch (cls.data.spellcasting) {
				case 'third': spellcasting.maxPrepared += Math.floor(levels / 3); break;
				case 'half': case 'artificer': spellcasting.maxPrepared += Math.floor(levels / 2); break;
				case 'full': spellcasting.maxPrepared += levels; break;
			}

			spellcasting.maxPrepared = Math.max(1, spellcasting.maxPrepared);
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

	actorData.obsidian.spellbook = {concentration: [], rituals: []};
}
