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

		this.scroll = {};
		this.settings = settings;
		this.tabs = {};
		this.details = new Map();
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

		this._setCollapsed(this.settings.portraitCollapsed);

		html.find('.obsidian-tab-bar').each((i, el) => {
			const bar = $(el);
			const group = bar.data('group');
			const active = this.tabs[group];
			new Tabs(bar, {
				initial: active,
				callback: clicked => {
					this.tabs[group] = clicked.data('tab');
					if (group === 'spells') {
						this._filterSpells();
					}

					Obsidian._resizeTabs(html);
				}
			});
		});

		html.on('dragend', () => {
			this.details.forEach((open, el) => el.open = open);
			if (this.element) {
				this.element.find('.obsidian-drag-indicator').css('display', 'none');
				this.element.find('.obsidian-inv-container').removeClass('obsidian-container-drop');
			}
		});

		html.find('summary[draggable]').each((i, el) =>
			el.addEventListener('dragstart', this._onDragItemStart.bind(this), false));

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
		html.find('.obsidian-skill-mod').click(evt =>
			new ObsidianSkillDialog(
				this,
				$(evt.currentTarget).closest('.obsidian-skill-item').data('skill-id'))
				.render(true));
		html.find('.obsidian-save-mod').click(evt =>
			new ObsidianSaveDialog(
				this,
				$(evt.currentTarget).closest('.obsidian-save-item').data('value'))
				.render(true));
		html.find('.obsidian-manage-spells').click(() =>
			new ObsidianSpellsDialog(this).render(true));
		html.find('.obsidian-add-attack').click(this._onAddAttack.bind(this));
		html.find('.obsidian-attack-toggle').click(this._onAttackToggle.bind(this));
		html.find('.obsidian-char-box[contenteditable]')
			.focusout(this._onUnfocusContentEditable.bind(this));
		html.find('[data-feat-id] .obsidian-feature-use').click(this._onUseClicked.bind(this));
		html.find('[data-spell-level] .obsidian-feature-use').click(this._onSlotClicked.bind(this));
		html.find('.obsidian-global-advantage').click(() => this._setGlobalRoll('adv'));
		html.find('.obsidian-global-disadvantage').click(() => this._setGlobalRoll('dis'));
		html.find('.obsidian-search-spell-name').keyup(this._filterSpells.bind(this));
		html.find('.obsidian-clear-spell-name').click(evt => {
			const target = $(evt.currentTarget);
			const search = target.siblings('.obsidian-input-search');
			search.val('');
			this._filterSpells();
		});
		html.find('.obsidian-inv-container').click(this._saveContainerState.bind(this));

		this._activateDialogs(html);
		this._contextMenu(html);
		Obsidian._resizeMain(html);

		if (this.settings.scrollTop !== undefined) {
			this.form.scrollTop = this.settings.scrollTop;
		}

		if (this.settings.subScroll !== undefined) {
			const activeTab = html.find('.obsidian-tab-contents.active');
			if (activeTab.length > 0) {
				activeTab[0].scrollTop = this.settings.subScroll;
			}
		}
	}

	getData () {
		this.actor.data = this.actor.prepareData(this.actor.data);
		const data = super.getData();
		data.ObsidianRules = Obsidian.Rules;
		console.debug(data);
		return data;
	}

	async maximize () {
		await super.maximize();
		Obsidian._resizeMain(this.element);
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
		const win = $(this.form).closest('.obsidian-window');
		if (modal) {
			win.addClass('obsidian-background');
		} else {
			win.removeClass('obsidian-background');
		}
	}

	static uuid () {
		return ([1e7]+-1e3+-4e3+-8e3+-1e11)
			.replace(/[018]/g, c =>
				(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
	}

	/**
	 * @private
	 * @param {HTML} html
	 */
	_activateDialogs (html) {
		html.find('.obsidian-simple-dialog, [data-dialog]').click(evt => {
			const options = duplicate(evt.currentTarget.dataset);

			if (options.width !== undefined) {
				options.width = parseInt(options.width);
			}

			if (options.template !== undefined) {
				options.template = 'public/modules/obsidian/html/dialogs/' + options.template;
			}

			if (options.dialog === undefined) {
				new ObsidianDialog(this, options).render(true);
			} else {
				const dialog = eval(`Obsidian${options.dialog}Dialog.prototype.constructor`);
				new dialog(this, options).render(true);
			}
		});
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
	 */
	_contextMenu (html) {
		const del = {
			name: game.i18n.localize('OBSIDIAN.Delete'),
			icon: '<i class="fas fa-trash"></i>',
			callback: this._deleteItem.bind(this)
		};

		const edit = {
			name: game.i18n.localize('OBSIDIAN.Edit'),
			icon: '<i class="fas fa-edit"></i>',
			callback: this._editItem.bind(this)
		};

		const view = {
			name: game.i18n.localize('OBSIDIAN.View'),
			icon: '<i class="fas fa-eye"></i>',
			callback: this._viewItem.bind(this)
		};

		new ContextMenu(html, '.obsidian-tr.item:not(.obsidian-spell-tr)', [edit, view, del]);
		new ContextMenu(html, '.obsidian-inv-container', [edit, view, del]);
		new ContextMenu(html, '.obsidian-spell-tr.item', [edit, view]);
	}

	/**
	 * @private
	 * @param el {JQuery}
	 */
	async _deleteItem (el) {
		const id = Number(el.data('item-id'));
		const item = this.actor.items.find(item => item.id === id);
		await this.actor.deleteOwnedItem(id);
		this.actor.updateEquipment(item);
	}

	/**
	 * @private
	 * @param el {JQuery}
	 */
	_editItem (el) {
		const id = Number(el.data('item-id'));
		const Item = CONFIG.Item.entityClass;
		const item = new Item(this.actor.items.find(i => i.id === id), {actor: this.actor});
		item.sheet.render(true);
	}

	/**
	 * @private
	 */
	_findActiveTab () {
		if (!this.element) {
			return [];
		}

		const activeContainer = this.element.find('.obsidian-tab-container.active');
		let activeTab = activeContainer.find('.obsidian-tab-contents.active');
		if (activeTab.length < 1) {
			activeTab = activeContainer.find('.obsidian-tab-contents');
		}

		return activeTab;
	}

	/**
	 * @private
	 */
	_filterSpells () {
		const spellTab = this.element.find('[data-group="main-tabs"][data-tab="spells"]');
		const name = spellTab.find('.obsidian-input-search').val();
		const filter = spellTab.find('ul[data-group="spells"] li.active').data('tab').substring(6);

		spellTab.find('.obsidian-spell-table > h3, .obsidian-spell-table > .obsidian-table')
			.addClass('obsidian-hidden');

		spellTab.find('.obsidian-spell-table .obsidian-tr.item').each((_, el) => {
			const jqel = $(el);
			jqel.removeClass('obsidian-hidden');

			const nameMatch = name.length < 1 || el.dataset.name.toLowerCase().includes(name);
			const categoryMatch =
				filter === 'all'
				|| filter === el.dataset.level
				|| (filter === 'concentration' && el.dataset.concentration === 'true')
				|| (filter === 'ritual' && el.dataset.ritual === 'true');

			if (!categoryMatch || !nameMatch) {
				jqel.addClass('obsidian-hidden');
			}
		});

		spellTab.find('.obsidian-spell-table .obsidian-tr.item:not(.obsidian-hidden)')
			.closest('.obsidian-table').each((i, el) => {
				const jqel = $(el);
				jqel.removeClass('obsidian-hidden');
				jqel.prev().removeClass('obsidian-hidden');
			});
	}

	_injectHTML (html) {
		/**
		 * For some reason, the first time this dialog is opened, the heights
		 * of its elements are not calculated correctly until the dialog is
		 * fully visible, so our resize code, which is called after rendering,
		 * fails to calculate the height correctly as the dialog is still
		 * fading in.
		 *
		 * Application#_injectHTML does not provide a callback for its call to
		 * fadeIn so we must override it here in order to call our resize code
		 * at the correct time, once the dialog is fully visible.
		 */
		$('body').append(html);
		this._element = html;
		html.hide().fadeIn(200, Obsidian._resizeMain.bind(this, html));
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onAddAttack (evt) {
		evt.preventDefault();
		this.actor.createOwnedItem({
			type: 'weapon',
			name: game.i18n.localize('OBSIDIAN.NewAttack')
		}, {
			displaySheet: true
		});
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onAttackToggle (evt) {
		evt.preventDefault();
		const attackID = Number(evt.currentTarget.dataset.itemId);
		const attack = this.actor.getOwnedItem(attackID);
		const tags = attack.data.flags.obsidian.tags;
		const current = attack.data.flags.obsidian.mode;
		let mode = 'melee';

		if (tags.thrown && tags.versatile) {
			if (current === 'melee') {
				mode = 'ranged';
			} else if (current === 'ranged') {
				mode = 'versatile';
			}
		} else if (current === 'melee') {
			if (tags.thrown) {
				mode = 'ranged';
			} else if (tags.versatile) {
				mode = 'versatile';
			}
		}

		attack.update({'flags.obsidian.mode': mode});
	}

	_onDragItemStart (event) {
		const target = event.currentTarget;
		if (target.tagName === 'SUMMARY') {
			$(target).parents('.obsidian-tbody').children('details').each((i, el) => {
				this.details.set(el, el.open);
				el.open = false;
			});
		}

		return Obsidian.Reorder.dragStart(event);
	}

	_onDragOver (event) { return Obsidian.Reorder.dragOver(event); }

	_onDrop (event) {
		return Obsidian.Reorder.drop(this.actor, event, evt => super._onDrop(evt));
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
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onSlotClicked (evt) {
		const target = $(evt.currentTarget);
		const spellLevel = target.parent().data('spell-level');
		const spellKey = spellLevel === 'pact' ? 'pact' : `spell${spellLevel}`;
		const n = Number(target.data('n'));
		const spell = this.actor.data.data.spells[spellKey];

		if (spell === undefined) {
			return;
		}

		let uses = spell.value || spell.uses || 0;
		if (n > uses) {
			uses++;
		} else {
			uses--;
		}

		const update = {};
		update[`data.spells.${spellKey}.${spellLevel === 'pact' ? 'uses' : 'value'}`] = uses;
		this.actor.update(update);
	}

	/**
	 * @private
	 */
	_onUnfocusContentEditable () {
		setTimeout(() => {
			if (!$(':focus').length) {
				const update = {};
				this.element.find('.obsidian-char-box[contenteditable]')
					.each((i, el) => update[el.dataset.prop] = el.innerHTML);
				this.actor.update(update);
			}
		}, 25);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onUseClicked (evt) {
		const target = $(evt.currentTarget);
		const parent = target.parent();
		const featID = parent.data('feat-id');
		const prop = parent.data('prop');
		const n = Number(target.data('n'));
		const featIndex = this.actor.items.findIndex(feat => feat.id === featID);

		if (featIndex < 0) {
			return;
		}

		const feat = this.actor.items[featIndex];
		const max = getProperty(feat.flags.obsidian, prop).max;
		let used = max - getProperty(feat.flags.obsidian, prop).remaining;

		if (n > used) {
			used++;
		} else {
			used--;
		}

		const update = {};
		update[`items.${featIndex}.flags.obsidian.${prop}.remaining`] = max - used;
		return this.actor.update(update);
	}

	/**
	 * @private
	 */
	async _render (force = false, options = {}) {
		this._saveScrollPositions();
		await super._render(force, options);
		this._restoreScrollPositions();
	}

	/**
	 * @private
	 */
	static _resizeMain (html) {
		let total = 0;
		html.find('.obsidian-main-left > .obsidian-char-box-container')
			.each((i, el) => total += $(el).outerHeight(true));

		total -= html.find('.obsidian-conditions-box').outerHeight() + 13;
		html.find('.obsidian-main').css('height', `${total}px`);
		Obsidian._resizeTabs(html);
	}

	/**
	 * @private
	 */
	static _resizeTabs (html) {
		const total = html.find('.obsidian-main').outerHeight();
		html.find('.obsidian-tab-contents').each((i, el) => {
			const jqel = $(el);
			let innerTotal = 0;
			let current = jqel.prev();

			if (current.length < 1) {
				current = jqel.parent();
			}

			while (!current.hasClass('obsidian-main')) {
				if (!current.hasClass('obsidian-tab-contents')
					&& !current.hasClass('obsidian-tab-container'))
				{
					innerTotal += current.outerHeight(true);
				}

				const tmp = current.prev();
				if (tmp.length < 1) {
					current = current.parent();
				} else {
					current = tmp;
				}
			}

			jqel.css('height', `${total - innerTotal - 30}px`);
		});
	}

	/**
	 * @private
	 */
	_restoreScrollPositions () {
		if (this.form) {
			this.form.scrollTop = this.scroll.main;
		}

		const activeTab = this._findActiveTab();
		if (activeTab.length > 0) {
			activeTab[0].scrollTop = this.scroll.tab;
		}
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_saveContainerState (evt) {
		const target = evt.currentTarget;
		const id = Number(target.dataset.itemId);

		// Doesn't seem to be a way to do this without re-rendering the sheet,
		// which is unfortunate as this could easily just be passively saved.

		// The click event fires before the open state is toggled so we invert
		// it here to represent what the state will be right after this event.
		this.actor.updateOwnedItem({id: id, flags: {obsidian: {open: !target.parentNode.open}}});
	}

	/**
	 * @private
	 */
	_saveScrollPositions () {
		if (this.form) {
			this.scroll.main = this.form.scrollTop;
		}

		const activeTab = this._findActiveTab();
		if (activeTab.length > 0) {
			this.scroll.tab = activeTab[0].scrollTop;
		}
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
	 */
	_setGlobalRoll (roll) {
		const current = this.actor.data.flags.obsidian.sheet.roll;
		let result = 'reg';
		if (roll !== current) {
			result = roll;
		}

		this.actor.update({'flags.obsidian.sheet.roll': result});
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_setSaveProficiency (evt) {
		const save = $(evt.currentTarget).closest('.obsidian-save-item').data('value');
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
		let id = $(evt.currentTarget).closest('.obsidian-skill-item').data('skill-id');
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

		$(this.form).closest('.obsidian-window').width(this.position.width);
		this.settings.width = this.position.width;
		game.settings.set('obsidian', this.object.data._id, JSON.stringify(this.settings));
	}

	/**
	 * @private
	 * @param el {JQuery}
	 */
	_viewItem (el) {
		const id = Number(el.data('item-id'));
		new ObsidianViewDialog(id, this).render(true);
	}
}

Actors.registerSheet('dnd5e', Obsidian, {
	types: ['character'],
	makeDefault: true
});

Hooks.once('init', () => {
	loadTemplates([
		'public/modules/obsidian/html/obsidian.html',
		'public/modules/obsidian/html/tabs/actions.html',
		'public/modules/obsidian/html/tabs/attacks.html',
		'public/modules/obsidian/html/tabs/sub-actions.html',
		'public/modules/obsidian/html/tabs/spells.html',
		'public/modules/obsidian/html/tabs/sub-spells.html',
		'public/modules/obsidian/html/tabs/equipment.html',
		'public/modules/obsidian/html/components/damage.html',
		'public/modules/obsidian/html/components/dc.html',
		'public/modules/obsidian/html/components/hit.html',
		'public/modules/obsidian/html/components/spell-list.html',
		'public/modules/obsidian/html/components/uses.html',
		'public/modules/obsidian/html/components/charges.html',
		'public/modules/obsidian/html/components/spell-card.html',
		'public/modules/obsidian/html/components/inventory.html'
	]);
});
