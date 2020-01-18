import {OBSIDIAN} from './rules.js';

export function prepareSpellcasting (actorData, flags) {
	const data = actorData.data;
	const mods = [];
	const attacks = [];
	const saves = [];
	const existing = {};
	let slotLevel = 0;
	let pactLevel = 0;
	let nonFullCasters = 0;
	let totalCasters = 0;

	flags.attributes.spellcasting = {mods: mods, attacks: attacks, saves: saves};
	for (const cls of actorData.obsidian.classes) {
		if (!cls.flags.obsidian) {
			continue;
		}

		const spellcasting = cls.flags.obsidian.spellcasting;
		const levels = cls.data.levels;

		spellcasting.list = cls.name === 'custom' ? cls.flags.obsidian.custom : cls.name;
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

		if (spellcasting.progression === undefined) {
			spellcasting.progression = OBSIDIAN.Rules.CLASS_SPELL_PROGRESSION[cls.name];
		}

		if (!OBSIDIAN.notDefinedOrEmpty(spellcasting.progression)) {
			if (spellcasting.progression !== 'pact') {
				totalCasters++;
			}

			switch (spellcasting.progression) {
				case 'third': slotLevel += Math.floor(levels / 3); nonFullCasters++; break;
				case 'half': slotLevel += Math.floor(levels / 2); nonFullCasters++; break;
				case 'full': slotLevel += levels; break;
				case 'artificer': slotLevel += Math.ceil(levels / 2); break;
				case 'pact': pactLevel += levels; break;
			}
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
			switch (spellcasting.progression) {
				case 'third': spellcasting.maxPrepared += Math.floor(levels / 3); break;
				case 'half': case 'artificer': spellcasting.maxPrepared += Math.floor(levels / 2); break;
				case 'full': spellcasting.maxPrepared += levels; break;
			}

			spellcasting.maxPrepared = Math.max(1, spellcasting.maxPrepared);
		}
	}

	slotLevel = Math.clamped(slotLevel, 1, 20);

	if (slotLevel > 0) {
		if (totalCasters === 1 && nonFullCasters === 1) {
			// Single-classed non-full-casters round up instead of down when
			// determining their level on the spell slot table.
			const caster =
				actorData.obsidian.classes.find(cls =>
					['half', 'third'].includes(
						getProperty(cls, 'flags.obsidian.spellcasting.progression')));

			slotLevel =
				Math.ceil(
					caster.data.levels
					/ (caster.flags.obsidian.spellcasting.progression === 'third' ? 3 : 2));
		}

		const slots = OBSIDIAN.Rules.SPELL_SLOT_TABLE[slotLevel - 1];
		slots.forEach((n, i) => {
			const spell = data.spells[`spell${i + 1}`];
			spell.max = n;
		});

		for (let i = 1; i < 10; i++) {
			const spell = data.spells[`spell${i}`];
			const override = flags.spells.slots[i];

			if (override !== undefined && override !== '') {
				spell.max = Number(override);
			} else if (slots[i - 1] === undefined) {
				spell.max = 0;
			}

			spell.value = Number(spell.value);
			if (isNaN(spell.value) || spell.value < 0) {
				spell.value = 0;
			}

			if (spell.value > spell.max) {
				spell.value = spell.max;
			}

			spell.remaining = spell.max - spell.value;
		}
	}

	if (pactLevel > 0) {
		if (data.spells.pact === undefined) {
			data.spells.pact = {};
		}

		data.spells.pact.level = Math.ceil(Math.min(10, pactLevel) / 2);
		data.spells.pact.slots =
			Math.max(1, Math.min(pactLevel, 2), Math.min(pactLevel - 8, 3),
				Math.min(pactLevel - 13, 4));

		const slotOverride = flags.spells.slots.pact;
		const levelOverride = flags.spells.slots.pactLevel;

		if (slotOverride !== undefined && slotOverride !== '') {
			data.spells.pact.slots = Number(slotOverride);
		}

		if (levelOverride !== undefined && levelOverride !== '') {
			data.spells.pact.level = Number(levelOverride);
		}

		if (data.spells.pact.uses === undefined || data.spells.pact.uses < 0) {
			data.spells.pact.uses = 0;
		}

		if (data.spells.pact.uses > data.spells.pact.slots) {
			data.spells.pact.uses = data.spells.pact.slots;
		}

		data.spells.pact.remaining = data.spells.pact.slots - data.spells.pact.uses;
	}

	actorData.obsidian.spellbook = {concentration: [], rituals: []};
}
