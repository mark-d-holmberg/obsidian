Obsidian.Data = {};
Obsidian.spellComparator = (a, b) => {
	const diff = a.data.level.value - b.data.level.value;
	if (diff === 0) {
		return a.name.localeCompare(b.name);
	}

	return diff;
};

Hooks.once('ready', () => {
	$('[data-pack="dnd5e.spells"]').hide();

	const toSlug = name => name.replace(/[',]/g, '').replace(/\s+/g, '-').trim().toLowerCase();
	fetch('modules/obsidian/data/spell-partitions.json')
		.then(response => {
			if (response.ok) {
				return response.json();
			}

			console.error(`Failed to fetch spell-partitions.json: ${response.status}`);
		})
		.then(json => {
			Obsidian.Data.SPELL_PARTITIONS = json;
			return game.packs.find(pack => pack.collection === 'obsidian.spells').getContent();
		})
		.then(entries => {
			const bySlug =
				new Map(entries.map(entry => [toSlug(entry.name), entry.data]));

			Obsidian.Data.SPELLS_BY_CLASS = {};
			Object.entries(Obsidian.Data.SPELL_PARTITIONS.classes).forEach(([cls, slugs]) =>
				Obsidian.Data.SPELLS_BY_CLASS[cls] =
					slugs.map(slug => bySlug.get(slug))
						.filter(spell => spell !== undefined)
						.sort(Obsidian.spellComparator));
		});
});
