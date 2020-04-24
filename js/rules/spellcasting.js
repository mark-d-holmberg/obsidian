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
			const val = data.abilities[spellcasting.spell].mod;
			spellcasting.mod = val;
			spellcasting.attack = val + data.attributes.prof;
			spellcasting.save = val + data.attributes.prof + 8;

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

	if (data.spells.pact) {
		const levelOverride = flags.spells?.slots.pactLevel;
		if (!OBSIDIAN.notDefinedOrEmpty(levelOverride)) {
			data.spells.pact.level = Number(levelOverride);
		}
	}

	actorData.obsidian.spellbook = {concentration: [], rituals: []};
}
