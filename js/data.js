import {OBSIDIAN} from './global.js';

OBSIDIAN.Data = {};
OBSIDIAN.spellComparator = (a, b) => {
	const diff = a.data.level - b.data.level;
	if (diff === 0) {
		return a.name.localeCompare(b.name);
	}

	return diff;
};

const toSlug = name => name.replace(/[',]/g, '').replace(/\s+/g, '-').trim().toLowerCase();
OBSIDIAN.collateSpells = async (compendium) => {
	let pack = game.packs.get(compendium);
	if (!pack) {
		console.warn(
			`Unable to load spell compendium '${compendium}', falling back to 'dnd5e.spells'.`);
		pack = game.packs.get('dnd5e.spells');
	}

	const spells = await pack.getDocuments();
	OBSIDIAN.Data.SPELLS_BY_SLUG = new Map(spells.map(spell => [toSlug(spell.name), spell]));
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
	const compendium = game.settings.get('obsidian', 'spell-compendium');
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

	await OBSIDIAN.collateSpells(compendium);
	OBSIDIAN.computeSpellsByClass(spellLists);
	game.actors.contents.forEach(actor => actor.prepareData());
	Object.values(game.actors.tokens).forEach(actor => actor.prepareData());
	Hooks.callAll('obsidian.actorsPrepared');
}
