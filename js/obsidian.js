class Obsidian extends ActorSheet5eCharacter {
	constructor (object, options) {
		super(object, options);
		game.settings.register('obsidian', this.object.data._id, {
			name: 'Obsidian settings',
			default: '',
			type: String,
			scope: 'user',
			onChange: settings => this.settings = JSON.parse(settings)
		});

		let settings = game.settings.get('obsidian', this.object.data._id);
		if (settings === '') {
			settings = {};
			settings.portraitCollapsed = false;
			game.settings.set('obsidian', this.object.data._id, JSON.stringify(settings));
		} else {
			settings = JSON.parse(settings);
		}

		this.settings = settings;
		this.scrolling = false;
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

		this.form.addEventListener('scroll', this._onScroll.bind(this));
		this._setCollapsed(this.settings.portraitCollapsed);
		if (this.settings.scrollTop !== undefined) {
			this.form.scrollTop = this.settings.scrollTop;
		}

		html.find('.obsidian-collapser-container').click(this._togglePortrait.bind(this));
		html.find('.obsidian-inspiration')
			.click(this._toggleControl.bind(this, 'data.attributes.inspiration.value'));
		html.find('.obsidian-prof').click(this._setSkillProficiency.bind(this));
		html.find('.obsidian-conditions .obsidian-radio-label')
			.click(this._setCondition.bind(this));
		html.find('.obsidian-exhaustion .obsidian-radio').click(
			this._setAttributeLevel.bind(this, 'data.attributes.exhaustion.value'));
		html.find('.obsidian-death-successes .obsidian-radio').click(
			this._setAttributeLevel.bind(this, 'data.attributes.death.success'));
		html.find('.obsidian-death-failures .obsidian-radio').click(
			this._setAttributeLevel.bind(this, 'data.attributes.death.failure'));
		html.find('.obsidian-save-item .obsidian-radio').click(this._setSaveProficiency.bind(this));
		html.find('.obsidian-char-header-minor .obsidian-edit').click(() =>
			new ObsidianHeaderDetailsDialog(this, {title: 'Edit Details'}).render(true));
		html.find('.obsidian-char-xp').click(() =>
			new ObsidianXPDialog(this, {title: 'Manage XP'}).render(true));
		html.find('.obsidian-char-hd .obsidian-resource-box-max').click(() =>
			new ObsidianHDDialog(this, {title: 'Override HD'}).render(true));
		html.find('[title="Edit Skills"]').click(() =>
			new ObsidianSkillsDialog(this, {
				title: 'Manage Skills',
				dataPath: 'flags.obsidian.skills.custom',
				template: 'public/modules/obsidian/html/skills-dialog.html'
			}).render(true));
		html.find('[title="Edit Tools"]').click(() =>
			new ObsidianSkillsDialog(this, {
				title: 'Manage Tools',
				dataPath: 'flags.obsidian.skills.tools',
				template: 'public/modules/obsidian/html/tools-dialog.html'
			}).render(true));
		html.find('[title="Edit Saving Throws"]').click(() =>
			new ObsidianDialog(this, {
				title: 'Manage Saving Throws',
				width: 250,
				template: 'public/modules/obsidian/html/saves-dialog.html'
			}).render(true));
		html.find('[title="Edit Death Saves"]').click(() =>
			new ObsidianDialog(this, {
				title: 'Manage Death Saves',
				width: 250,
				template: 'public/modules/obsidian/html/death-saves-dialog.html'
			}).render(true));
		html.find('.obsidian-max-hp').click(() =>
			new ObsidianDialog(this, {
				title: 'Edit Max HP',
				width: 250,
				template: 'public/modules/obsidian/html/hp-dialog.html'
			}).render(true));
		html.find('.obsidian-speed').click(() =>
			new ObsidianDialog(this, {
				title: 'Override Speed',
				width: 250,
				template: 'public/modules/obsidian/html/speed-dialog.html'
			}).render(true));
		html.find('.obsidian-init').click(() =>
			new ObsidianDialog(this, {
				title: 'Manage Initiative',
				width: 250,
				template: 'public/modules/obsidian/html/init-dialog.html'
			}).render(true));
		html.find('.obsidian-ac').click(() =>
			new ObsidianDialog(this, {
				title: 'Manage Armour Class',
				template: 'public/modules/obsidian/html/ac-dialog.html'
			}).render(true));
		html.find('.obsidian-skill-mod').click(evt =>
			new ObsidianSkillDialog(
				this,
				$(evt.currentTarget).parents('.obsidian-skill-item').data('skill-id'))
				.render(true));
		html.find('.obsidian-save-mod').click(evt =>
			new ObsidianSaveDialog(
				this,
				$(evt.currentTarget).parents('.obsidian-save-item').data('value'))
				.render(true));
	}

	getData () {
		const data = super.getData();
		data.ObsidianRules = ObsidianRules;
		return data;
	}

	render (force = false, options = {}) {
		this._applySettings();
		return super.render(force, options);
	}

	/**
	 * Whether a modal dialog is currently popped up.
	 * @param modal {boolean}
	 */
	setModal (modal) {
		const win = $(this.form).parents('.obsidian-window');
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
		if (this.settings.width !== undefined) {
			this.position.width = this.settings.width;
		}

		if (this.settings.height !== undefined) {
			this.position.height = this.settings.height;
		}
	}

	/**
	 * @private
	 * @param {Event} evt
	 */
	_onScroll (evt) {
		if (!this.scrolling) {
			setTimeout(() => {
				this.settings.scrollTop = this.form.scrollTop;
				game.settings.set('obsidian', this.object.data._id, JSON.stringify(this.settings));
				this.scrolling = false;
			}, 200);

			this.scrolling = true;
		}
	}

	/**
	 * @private
	 */
	_onResize (event) {
		super._onResize(event);
		this.settings.width = this.position.width;
		this.settings.height = this.position.height;
		game.settings.set('obsidian', this.object.data._id, JSON.stringify(this.settings));
	}

	/**
	 * @private
	 * @param collapsed {boolean}
	 */
	_setCollapsed (collapsed) {
		const jqForm = $(this.form);
		const collapser =
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
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_setCondition (evt) {
		const id = $(evt.currentTarget).data('value');
		let state = this.actor.data.flags.obsidian.attributes.conditions[id];
		if (state === undefined) {
			state = false;
		}

		const update = {};
		update[`flags.obsidian.attributes.conditions.${id}`] = !state;
		this.actor.update(update);
	}

	/**
	 * @private
	 * @param {String} prop
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_setAttributeLevel (prop, evt) {
		let value = Number($(evt.currentTarget).data('value'));
		const current = getProperty(this.actor.data, prop);

		if (value === 1 && current === 1) {
			value = 0;
		}

		const update = {};
		update[prop] = value;
		this.actor.update(update);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_setSaveProficiency (evt) {
		const save = $(evt.currentTarget).parents('.obsidian-save-item').data('value');
		let state = this.actor.data.data.abilities[save].proficient;

		if (state === undefined || state === 0) {
			state = 1;
		} else {
			state = 0;
		}

		const update = {};
		update[`data.abilities.${save}.proficient`] = state;
		this.actor.update(update);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_setSkillProficiency (evt) {
		let id = $(evt.currentTarget).parents('.obsidian-skill-item').data('skill-id');
		let skillKey;

		if (id.includes('.')) {
			const split = id.split('.');
			skillKey = split[0];
			id = parseInt(split[1]);
		}

		const skill =
			skillKey
				? this.actor.data.flags.obsidian.skills[skillKey][id]
				: this.actor.data.data.skills[id];

		let newValue = 0;
		if (skill.value === 0) {
			newValue = 1;
		} else if (skill.value === 1) {
			newValue = 2;
		}

		const update = {};
		if (skillKey) {
			const newSkills = duplicate(this.actor.data.flags.obsidian.skills[skillKey]);
			newSkills[id].value = newValue;
			update[`flags.obsidian.skills.${skillKey}`] = newSkills;
		} else {
			update[`data.skills.${id}.value`] = newValue;
		}

		this.actor.update(update);
	}

	/**
	 * @private
	 * @param {String} property
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_toggleControl (property, evt) {
		const state = !getProperty(this.actor.data, property);
		const icon = $(evt.currentTarget).find('i');
		state ? icon.removeClass('obsidian-hidden') : icon.addClass('obsidian-hidden');
		const update = {};
		update[property] = state;
		this.actor.update(update);
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
		game.settings.set('obsidian', this.object.data._id, JSON.stringify(this.settings));
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		const special = ['flags.obsidian.skills.custom', 'flags.obsidian.skills.tools'];
		if (!Object.keys(formData).some(key => special.some(path => key.startsWith(path)))) {
			super._updateObject(event, formData);
			return;
		}

		const newData = {};
		special.forEach(path => {
			const skills = ObsidianDialog.reconstructArray(formData, newData, path);
			for (const [key, skill] of Object.entries(getProperty(this.actor.data, path))) {
				for (const prop in skill) {
					if (skills[key] === undefined) {
						skills[key] = duplicate(skill);
					}

					if (!skills[key].hasOwnProperty(prop)) {
						skills[key][prop] = skill[prop];
					}
				}
			}
		});

		super._updateObject(event, newData);
	}
}

Actors.registerSheet('dnd5e', Obsidian, {
	types: ['character'],
	makeDefault: true
});
