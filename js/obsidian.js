class Obsidian extends ActorSheet5eCharacter {
	constructor (object, options) {
		super(object, options);
		// noinspection JSUnusedGlobalSymbols
		game.settings.register('Obsidian', this.object.data._id, {
			name: 'Obsidian settings',
			default: '',
			type: String,
			scope: 'user',
			onChange: settings => this.settings = JSON.parse(settings)
		});

		let settings = game.settings.get('Obsidian', this.object.data._id);
		if (settings === '') {
			settings = {};
			settings.portraitCollapsed = false;
			// noinspection JSIgnoredPromiseFromCall
			game.settings.set('Obsidian', this.object.data._id, JSON.stringify(settings));
		} else {
			settings = JSON.parse(settings);
		}

		this.settings = settings;
	}

	get template () {
		Handlebars.registerHelper('expr', function (op, ...args) {
			args.pop();

			if (op === '>=') {
				return args[0] >= args[1];
			}

			let reducer = null;
			if (op === '+') {
				reducer = (acc, x) => acc + x;
			} else if (op === '*') {
				reducer = (acc, x) => acc * x;
			} else if (op === '/') {
				reducer = (acc, x) => acc / x;
			}

			if (reducer !== null) {
				return args.reduce(reducer);
			}
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

	/**
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		console.debug(this.actor);

		// The first element of our template is actually a comment, not the
		// form element so we override this behaviour here.
		this.form = html[2];

		this._applySettings();
		html.find('.obsidian-collapser-container').click(this._togglePortrait.bind(this));
	}

	getData () {
		const data = super.getData();
		if (data.data.details.level.max === undefined) {
			// noinspection JSPrimitiveTypeWrapperUsage
			data.data.details.level.max = ObsidianRules.MAX_LEVEL;
		}

		return data;
	}

	/**
	 * @private
	 */
	_applySettings () {
		this._setCollapsed(this.settings.portraitCollapsed);
	}

	/**
	 * @private
	 * @param collapsed {boolean}
	 */
	_setCollapsed (collapsed) {
		const jqForm = $(this.form);
		/** @type JQuery */ const collapser =
			jqForm.find('.obsidian-collapser-container i')
				.removeClass('fa-rotate-90 fa-rotate-270');

		if (collapsed) {
			jqForm.addClass('obsidian-collapsed');
			collapser.addClass('fa-rotate-270');
		} else {
			jqForm.removeClass('obsidian-collapsed');
			collapser.addClass('fa-rotate-90');
		}
	}

	/**
	 * @private
	 */
	_togglePortrait () {
		this.settings.portraitCollapsed = !this.settings.portraitCollapsed;
		// noinspection JSIgnoredPromiseFromCall
		game.settings.set('Obsidian', this.object.data._id, JSON.stringify(this.settings));
		this._setCollapsed(this.settings.portraitCollapsed);

		if (this.settings.portraitCollapsed) {
			this.position.width -= 400;
		} else {
			this.position.width += 400;
		}

		$(this.form).parents('.obsidian-window').width(this.position.width);
	}
}

Actors.registerSheet('dnd5e', Obsidian, {
	types: ['character'],
	makeDefault: true
});
