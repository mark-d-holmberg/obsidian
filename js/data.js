import {OBSIDIAN} from './rules/rules.js';

OBSIDIAN.Data = {};
OBSIDIAN.spellComparator = (a, b) => {
	const diff = a.data.level - b.data.level;
	if (diff === 0) {
		return a.name.localeCompare(b.name);
	}

	return diff;
};

export function loadSpellData () {
	const toSlug = name => name.replace(/[',]/g, '').replace(/\s+/g, '-').trim().toLowerCase();
	fetch('modules/obsidian/data/spell-partitions.json')
		.then(response => {
			if (response.ok) {
				return response.json();
			}

			console.error(`Failed to fetch spell-partitions.json: ${response.status}`);
		})
		.then(json => {
			OBSIDIAN.Data.SPELL_PARTITIONS = json;
			return game.packs.find(pack => pack.collection === 'obsidian.spells').getContent();
		})
		.then(entries => {
			const bySlug =
				new Map(entries.map(entry => [toSlug(entry.name), entry.data]));

			OBSIDIAN.Data.SPELLS_BY_CLASS = {};
			Object.entries(OBSIDIAN.Data.SPELL_PARTITIONS.classes).forEach(([cls, slugs]) =>
				OBSIDIAN.Data.SPELLS_BY_CLASS[cls] =
					slugs.map(slug => bySlug.get(slug))
						.filter(spell => spell !== undefined)
						.sort(OBSIDIAN.spellComparator));
		});
}
