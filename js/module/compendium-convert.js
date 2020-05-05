import {Migrate} from '../migration/migrate.js';

export function addCompendiumContextMenuHook () {
	Hooks.on('getCompendiumDirectoryEntryContext', (html, entryOptions) => {
		entryOptions.push({
			name: 'OBSIDIAN.ConvertObsidian',
			icon: '<div class="obsidian-icon obsidian-icon-obsidian"></div>',
			callback: convertCompendium,
			condition: li => {
				const pack = game.packs.find(p => p.collection === li.data('pack'));
				return !pack.metadata.module || pack.metadata.module !== 'obsidian';
			}
		});
	});
}

async function convertCompendium (li) {
	const original = game.packs.find(p => p.collection === li.data('pack'));
	if (!original) {
		return;
	}

	const obsidian = await Compendium.create({
		label: `[O] ${original.metadata.label}`,
		entity: original.entity
	});

	const content = await original.getContent();
	for (const entry of content) {
		if (original.entity === 'Item') {
			Migrate.convertItem(entry.data);
		} else if (original.entity === 'Actor') {
			Migrate.convertActor(entry.data);
		}

		await obsidian.importEntity(entry);
	}

	ui.compendium.render();
}
