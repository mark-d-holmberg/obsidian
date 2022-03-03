import ObsidianSpellLists from '../data/spell-lists.js';
import {OBSIDIAN} from '../global.js';

export function registerSettings () {
	game.settings.registerMenu('obsidian', 'config-spell-list', {
		name: 'OBSIDIAN.SettingsConfSpellLists',
		label: 'OBSIDIAN.Configure',
		icon: 'fas fa-cogs',
		type: ObsidianSpellLists
	});

	game.settings.register('obsidian', 'spell-class-lists', {
		scope: 'world',
		type: String,
		default: ''
	});

	game.settings.register('obsidian', 'spell-compendium', {
		name: 'OBSIDIAN.SpellCompendium',
		hint: 'OBSIDIAN.SpellCompendiumHint',
		scope: 'world',
		type: String,
		config: true,
		default: 'obsidian.spells',
		choices: getSpellCompendiumChoices(),
		onChange: async pack => {
			await OBSIDIAN.collateSpells(pack);
			OBSIDIAN.computeSpellsByClass(
				JSON.parse(game.settings.get('obsidian', 'spell-class-lists')));
		}
	});

	game.settings.register('obsidian', 'rollOneDie', {
		name: 'OBSIDIAN.ConfigNumDiceHead',
		hint: 'OBSIDIAN.ConfigNumDiceMessage',
		scope: 'user',
		config: true,
		default: false,
		type: Boolean
	});

	game.settings.register('obsidian', 'encumbrance', {
		name: 'OBSIDIAN.ConfigEncumbrance',
		hint: 'OBSIDIAN.ConfigEncumbranceMessage',
		scope: 'world',
		config: true,
		default: 0,
		type: Number,
		choices: {
			0: 'OBSIDIAN.StandardEncumbrance',
			1: 'OBSIDIAN.VariantEncumbrance',
			2: 'OBSIDIAN.NoEncumbrance'
		}
	});
}

function getSpellCompendiumChoices () {
	return game.packs.reduce((acc, pack) => {
		if (pack.documentName !== 'Item') {
			return acc;
		}
		acc[pack.collection] = `[${pack.metadata.package}] ${pack.metadata.label}`;
		return acc;
	}, {});
}
