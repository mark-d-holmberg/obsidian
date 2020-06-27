export function registerSettings () {
	game.settings.register('obsidian', 'rollOneDie', {
		name: 'OBSIDIAN.ConfigNumDiceHead',
		hint: 'OBSIDIAN.ConfigNumDiceMessage',
		scope: 'user',
		config: true,
		default: false,
		type: Boolean
	});
}
