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
		html.find('.obsidian-char-header-minor .obsidian-edit')
			.click(this._launchHeaderDetails.bind(this));
	}

	getData () {
		const data = super.getData();
		data.ObsidianRules = ObsidianRules;
		data.extra = this.getFlagData();
		return data;
	}

	getFlagData () {
		const extra = {};

		const details = this.actor.getFlag('obsidian', 'details');
		if (details != null) {
			extra.details = JSON.parse(details);
		}

		const classes = this.actor.getFlag('obsidian', 'classes');
		if (classes != null) {
			extra.classes = JSON.parse(classes);
		}

		return extra;
	}

	/**
	 * Whether a modal dialog is currently popped up.
	 * @param modal {boolean}
	 */
	setModal (modal) {
		/** @type {JQuery} */ const win = $(this.form).parents('.obsidian-window');
		if (modal) {
			win.addClass('obsidian-background');
		} else {
			win.removeClass('obsidian-background');
		}
	}

	/**
	 * @private
	 */
	_applySettings () {
		this._setCollapsed(this.settings.portraitCollapsed);
		if (this.settings.width !== undefined) {
			this.position.width = this.settings.width;
		}
	}

	/**
	 * @private
	 */
	async _launchHeaderDetails () {
		this.setModal(true);
		new ObsidianHeaderDetailsDialog(this, {title: 'Edit Details'}).render(true);
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
		this._setCollapsed(this.settings.portraitCollapsed);

		if (this.settings.portraitCollapsed) {
			this.position.width -= 400;
		} else {
			this.position.width += 400;
		}

		$(this.form).parents('.obsidian-window').width(this.position.width);
		this.settings.width = this.position.width;
		// noinspection JSIgnoredPromiseFromCall
		game.settings.set('Obsidian', this.object.data._id, JSON.stringify(this.settings));
	}

	/**
	 * @private
	 */
	_updateFlags (data) {
		const flags = {};
		for (let [key, val] of Object.entries(data)) {
			key = key.substring(6);
			const props = key.split('.');
			let target = flags;

			for (let i = 0; i < props.length; i++) {
				const p = props[i];
				if (p in target) {
					target = target[p];
				} else {
					const next = props[i + 1];
					if (next === undefined) {
						target[p] = val;
					} else {
						if (next >= '0' && next <= '9') {
							target[p] = [];
						} else {
							target[p] = {};
						}
						target = target[p];
					}
				}
			}
		}

		console.debug(flags);
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		const newFormData = {};
		const extras = {};

		for (const [key, val] of Object.entries(formData)) {
			if (key.startsWith('extra.')) {
				extras[key] = val;
			} else {
				newFormData[key] = val;
			}
		}

		// noinspection JSUnresolvedFunction
		//super._updateObject(event, newFormData);
		this._updateFlags(extras);
	}
}

Handlebars.registerHelper('expr', function (op, ...args) {
	args.pop();

	if (op === '>=') {
		return args[0] >= args[1];
	}

	if (op === '===') {
		return args[0] === args[1];
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

Actors.registerSheet('dnd5e', Obsidian, {
	types: ['character'],
	makeDefault: true
});
