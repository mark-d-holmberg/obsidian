class ObsidianAttacksDialog extends ObsidianArrayDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		options.title = game.i18n.localize('OBSIDIAN.ManageAttacks');
		options.template = 'public/modules/obsidian/html/dialogs/attacks.html';
		return options;
	}

	get cls () {
		return 'attack';
	}

	get flag () {
		return 'flags.obsidian.attacks.custom';
	}

	get item () {
		return {
			custom: true,
			type: 'melee',
			mode: 'melee',
			label: '',
			damage: [],
			versatile: [],
			tags: {},
			hit: {enabled: true, stat: 'str', bonus: 0, proficient: true, crit: 20},
			dc: {enabled: false}
		}
	}
}
