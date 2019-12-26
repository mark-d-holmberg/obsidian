import {OBSIDIAN} from './rules/rules.js';

OBSIDIAN.Data = {};
OBSIDIAN.spellComparator = (a, b) => {
	const diff = a.data.level - b.data.level;
	if (diff === 0) {
		return a.name.localeCompare(b.name);
	}

	return diff;
};

OBSIDIAN.computeSpellsByClass = lists => {
	OBSIDIAN.Data.SPELLS_BY_CLASS = {};
	Object.entries(lists).forEach(([cls, slugs]) =>
		OBSIDIAN.Data.SPELLS_BY_CLASS[cls] =
			slugs.map(slug => OBSIDIAN.Data.SPELLS_BY_SLUG.get(slug))
				.filter(spell => spell)
				.sort(OBSIDIAN.spellComparator));
};

export async function loadSpellData () {
	const toSlug = name => name.replace(/[',]/g, '').replace(/\s+/g, '-').trim().toLowerCase();
	game.settings.register('obsidian', 'spell-class-lists', {
		scope: 'world',
		type: String,
		default: ''
	});

	let spellLists = game.settings.get('obsidian', 'spell-class-lists');
	if (spellLists.length) {
		spellLists = JSON.parse(spellLists);
	} else {
		const response = await fetch('modules/obsidian/data/spell-lists.json');
		if (response.ok) {
			spellLists = await response.json();
			game.settings.set('obsidian', 'spell-class-lists', JSON.stringify(spellLists));
		} else {
			console.error(`Failed to fetch spell-lists.json: ${response.status}`);
			return;
		}
	}

	const spells =
		await game.packs.find(pack => pack.collection === 'obsidian.spells').getContent();

	OBSIDIAN.Data.SPELLS_BY_SLUG = new Map(spells.map(spell => [toSlug(spell.name), spell.data]));
	OBSIDIAN.computeSpellsByClass(spellLists);
}
