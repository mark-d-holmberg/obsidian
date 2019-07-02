class Obsidian extends ActorSheet5eCharacter {
	get template () {
		Handlebars.registerHelper('expr', function (op, ...args) {
			if (op === 'add') {
				return args[0] + args[1];
			}

			if (op === '>=') {
				return args[0] >= args[1];
			}
		});

		Handlebars.registerHelper('percent', function (current, max) {
			return max === 0 ? 0 : (current / max) * 100;
		});

		return 'public/modules/obsidian/html/obsidian.html';
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(['actor', 'character-sheet', 'obsidian-window']),
			width: 1170,
			height: 720,
			showUnpreparedSpells: true
		});

		return options;
	}

	// noinspection JSCheckFunctionSignatures
	activateListeners (html) {
		super.activateListeners(html);
		console.debug(this.actor);

		// The first element of our template is actually a comment, not the
		// form element so we override this behaviour here.
		this.form = html[2];
	}

	getData () {
		const data = super.getData();
		if (data.data.details.level.max === undefined) {
			// noinspection JSPrimitiveTypeWrapperUsage
			data.data.details.level.max = ObsidianRules.MAX_LEVEL;
		}

		return data;
	}
}

Actors.registerSheet('dnd5e', Obsidian, {
	types: ['character'],
	makeDefault: true
});
