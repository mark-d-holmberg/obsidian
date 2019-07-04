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
		if (data.data.details.level.max === undefined) {
			// noinspection JSPrimitiveTypeWrapperUsage
			data.data.details.level.max = ObsidianRules.MAX_LEVEL;
		}

		if (data.data.details.subrace === undefined) {
			data.data.details.subrace = {
				label: 'Subrace',
				type: 'String'
			};
		}

		if (data.data.details.gender === undefined) {
			data.data.details.gender = {
				label: 'Gender',
				type: 'String'
			};
		}

		return data;
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
	}

	/**
	 * @private
	 */
	_dialogUpdate (html) {
		const form = html.find('form')[0];
		const formData = validateForm(form);
		// noinspection JSUnresolvedFunction
		this._updateObject(null, formData);
	}

	/**
	 * @private
	 */
	async _launchHeaderDetails () {
		this.setModal(true);
		const html =
			await renderTemplate(
				'public/modules/obsidian/html/header-details.html',
				this.object.data);

		// noinspection JSUnusedGlobalSymbols
		new ObsidianHeaderDetailsDialog({
			title: 'Edit Details',
			content: html,
			close: () => this.setModal(false),
			buttons: {
				save: {
					icon: '<i class="fas fa-save"></i>',
					label: 'Save',
					callback: this._dialogUpdate.bind(this)
				},
				cancel: {
					icon: '<i class="fas fa-times"></i>',
					label: 'Cancel'
				}
			},
			default: 'save'
		}).render(true);
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

Actors.registerSheet('dnd5e', Obsidian, {
	types: ['character'],
	makeDefault: true
});
