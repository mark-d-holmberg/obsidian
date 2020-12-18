export function registerSettings () {
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
		default: false,
		type: Boolean
	});
}
