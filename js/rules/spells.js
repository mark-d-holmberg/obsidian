import {OBSIDIAN} from './rules.js';

export function prepareSpells (actorData) {
	for (let i = 0; i < actorData.items.length; i++) {
		if (actorData.items[i].type !== 'spell') {
			continue;
		}

		const spell = actorData.items[i];
		const flags = spell.flags.obsidian;

		if (!flags) {
			continue;
		}

		let cls;
		flags.notes = [];

		if (flags.time.n === undefined || flags.time.n === '') {
			flags.time.n = 1;
		} else {
			flags.time.n = Number(flags.time.n);
		}

		if (flags.source === undefined) {
			flags.source = {display: game.i18n.localize('OBSIDIAN.Class-custom')};
		} else if (flags.source.type === 'custom') {
			flags.source.display = flags.source.custom;
		} else if (flags.source.type === 'class') {
			cls = actorData.obsidian.classes.find(cls =>
				cls.flags.obsidian.uuid === flags.source.class);
			if (cls) {
				flags.source.display = cls.flags.obsidian.label;
			}
		}

		flags.components.display =
			Object.entries(flags.components)
				.filter(([, val]) => val)
				.map(([key,]) => OBSIDIAN.Rules.SPELL_COMPONENT_MAP[key])
				.filter(s => s !== undefined)
				.map(s => game.i18n.localize(`OBSIDIAN.${s}Abbr`))
				.join(', ');

		if (flags.components.m && spell.data.materials.length > 0) {
			flags.notes.push(
				`${game.i18n.localize('OBSIDIAN.MaterialAbbr')}: `
				+ spell.data.materials);
		}

		if (flags.time.type === 'react' && flags.time.react.length > 0) {
			flags.notes.push(
				`${game.i18n.localize('OBSIDIAN.CastTimeAbbr-react')}: `
				+ flags.time.react);
		}

		if (cls) {
			const spellcasting = cls.flags.obsidian.spellcasting;
			if (spell.data.level === 0) {
				flags.known = true;
				flags.visible = true;
			} else if (spellcasting.preparation === 'known') {
				if (flags.known === undefined) {
					flags.known = true;
				}

				flags.visible = flags.known;
			} else if (spellcasting.preparation === 'prep') {
				if (flags.prepared === undefined) {
					flags.prepared = true;
				}

				flags.visible = flags.prepared;
			} else if (spellcasting.preparation === 'book') {
				if (flags.book === undefined) {
					flags.book = true;
				}

				if (flags.prepared === undefined) {
					flags.prepared = false;
				}

				flags.visible = flags.book && flags.prepared;
			}

			if (spell.data.components.ritual) {
				flags.visible =
					(spellcasting.rituals === 'prep' && flags.prepared)
					|| spellcasting.rituals === 'book';

				if (flags.visible) {
					actorData.obsidian.spellbook.rituals.push(spell);
				}
			}
		} else {
			flags.visible = true;
		}

		if (flags.visible && spell.data.concentration) {
			actorData.obsidian.spellbook.concentration.push(spell);
		}
	}
}
