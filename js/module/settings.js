export function registerSettings () {
	game.settings.register('obsidian', 'rollOneDie', {
		name: 'OBSIDIAN.ConfigNumDiceHead',
		hint: 'OBSIDIAN.ConfigNumDiceMessage',
		scope: 'user',
		config: true,
		default: false,
		type: Boolean
	});

	const dice3d = game.modules.get('dice-so-nice')?.active;
	if(dice3d) {
		game.settings.register('obsidian', 'diceSoNiceShowPublicRolls', {
			name: 'OBSIDIAN.ConfigDiceSoNiceShowPublicRollsHead',
			hint: 'OBSIDIAN.ConfigDiceSoNiceShowPublicRollsMessage',
			scope: 'world',
			config: true,
			default: false,
			type: Boolean
		});
	}
}
