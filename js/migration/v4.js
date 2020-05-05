import {OBSIDIAN} from '../global.js';

export const v4 = {
	convertSpellcasting: function (data) {
		const spells = data.data.spells;
		const overrides = data.flags.obsidian.spells.slots;

		for (let i = 1; i < 10; i++) {
			const spell = spells[`spell${i}`];
			if (spell.value != null && spell.max != null) {
				spell.value = spell.max - spell.value;
			}

			if (!OBSIDIAN.notDefinedOrEmpty(overrides[i])) {
				spell.override = Number(overrides[i]);
			}
		}
	}
};
