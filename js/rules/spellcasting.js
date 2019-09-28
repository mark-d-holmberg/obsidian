Obsidian.Rules.Prepare.spellcasting = function (actorData, flags) {
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
	for (const cls of flags.classes) {
		if (cls.spell === undefined) {
			cls.spell = Obsidian.Rules.CLASS_SPELL_MODS[cls.name];
		}

		if (cls.spell !== undefined && cls.spell !== '') {
			const val = data.abilities[cls.spell].mod;
			cls.spellcasting = {
				mod: val,
				attack: val + data.attributes.prof.value,
				save: val + data.attributes.prof.value + 8
			};

			if (!existing[cls.spell]) {
				mods.push(cls.spellcasting.mod);
				attacks.push(cls.spellcasting.attack);
				saves.push(cls.spellcasting.save);
				existing[cls.spell] = true;
			}
		}

		if (cls.progression === undefined) {
			cls.progression = Obsidian.Rules.CLASS_SPELL_PROGRESSION[cls.name];
		}

		if (cls.progression !== undefined && cls.progression !== '') {
			if (cls.progression !== 'pact') {
				totalCasters++;
			}

			switch (cls.progression) {
				case 'third': slotLevel += Math.floor(cls.levels / 3); nonFullCasters++; break;
				case 'half': slotLevel += Math.floor(cls.levels / 2); nonFullCasters++; break;
				case 'full': slotLevel += cls.levels; break;
				case 'artificer': slotLevel += Math.ceil(cls.levels / 2); break;
				case 'pact': pactLevel += cls.levels; break;
			}
		}

		if (cls.preparation === undefined) {
			cls.preparation = Obsidian.Rules.CLASS_SPELL_PREP[cls.name];
		}

		if (cls.rituals === undefined) {
			cls.rituals = Obsidian.Rules.CLASS_RITUALS[cls.name];
		}

		const spellsKnown = Obsidian.Rules.SPELLS_KNOWN_TABLE[cls.name];
		if (spellsKnown !== undefined) {
			cls.maxKnown = spellsKnown.known[cls.levels - 1];
			cls.maxCantrips = spellsKnown.cantrips[cls.levels - 1];
			if (cls.maxCantrips === undefined) {
				cls.maxCantrips = spellsKnown.cantrips[spellsKnown.cantrips.length - 1];
			}
		}

		if (cls.preparation === 'prep') {
			cls.maxPrepared = data.abilities[cls.spell].mod;
			switch (cls.progression) {
				case 'third': cls.maxPrepared += Math.floor(cls.levels / 3); break;
				case 'half': case 'artificer': cls.maxPrepared += Math.floor(cls.levels / 2); break;
				case 'full': cls.maxPrepared += cls.levels; break;
			}

			cls.maxPrepared = Math.max(1, cls.maxPrepared);
		}
	}

	if (slotLevel > 0) {
		if (totalCasters === 1 && nonFullCasters === 1) {
			// Single-classed non-half-caster.
			slotLevel++;
		}

		const slots = Obsidian.Rules.SPELL_SLOT_TABLE[slotLevel - 1];
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
	}

	actorData.obsidian.spellbook = {concentration: [], rituals: []};
};
