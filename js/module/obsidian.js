import {OBSIDIAN} from '../rules/rules.js';
import {Reorder} from './reorder.js';
import {Rolls} from '../rules/rolls.js';
import {Effect} from './effect.js';
import {ActorSheet5eCharacter} from '../../../../systems/dnd5e/module/actor/sheets/character.js';
import {ObsidianDialog} from '../dialogs/dialog.js';
import {ObsidianSaveDialog} from '../dialogs/save.js';
import {ObsidianSkillDialog} from '../dialogs/skill.js';
import {ObsidianSpellSlotDialog} from '../dialogs/spell-slot.js';
import {ObsidianSpellsDialog} from '../dialogs/spells.js';
import {ObsidianViewDialog} from '../dialogs/view.js';
import {ObsidianActionableDialog} from '../dialogs/actionable.js';
// These are all used in eval() for dynamic dialog creation.
// noinspection ES6UnusedImports
import {ObsidianArrayDialog} from '../dialogs/array.js';
// noinspection ES6UnusedImports
import {ObsidianHeaderDetailsDialog} from '../dialogs/char-header.js';
// noinspection ES6UnusedImports
import {ObsidianCurrencyDialog} from '../dialogs/currency.js';
// noinspection ES6UnusedImports
import {ObsidianDefensesDialog} from '../dialogs/defenses.js';
// noinspection ES6UnusedImports
import {ObsidianHDDialog} from '../dialogs/hd.js';
// noinspection ES6UnusedImports
import {ObsidianNewClassDialog} from '../dialogs/new-class.js';
// noinspection ES6UnusedImports
import {ObsidianProficienciesDialog} from '../dialogs/profs.js';
// noinspection ES6UnusedImports
import {ObsidianRollHDDialog} from '../dialogs/roll-hd.js';
// noinspection ES6UnusedImports
import {ObsidianSensesDialog} from '../dialogs/senses.js';
// noinspection ES6UnusedImports
import {ObsidianSkillsDialog} from '../dialogs/skills.js';
// noinspection ES6UnusedImports
import {ObsidianXPDialog} from '../dialogs/xp.js';

export class Obsidian extends ActorSheet5eCharacter {
	constructor (object, options) {
		if (!game.user.isGM && object.limited) {
			options.width = 880;
			options.height = 625;
			options.resizable = false;
		}

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
		return 'modules/obsidian/html/'
			+ (!game.user.isGM && this.actor.limited ? 'limited.html' : 'obsidian.html');
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
		if (!game.user.isGM && this.actor.limited) {
			return;
		}

		this._setCollapsed(this.settings.portraitCollapsed);
		html.find('.obsidian-collapser-container').click(this._togglePortrait.bind(this));

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
					} else if (group === 'equipment') {
						this._filterEquipment();
					}

					Obsidian._resizeTabs(html);
				}
			});
		});

		html.find('.obsidian-search-spell-name').keyup(this._filterSpells.bind(this));
		html.find('.obsidian-search-inv-name').keyup(this._filterEquipment.bind(this));
		html.find('.obsidian-clear-inv-name')
			.click(Obsidian._clearSearch.bind(this, this._filterEquipment));
		html.find('.obsidian-clear-spell-name')
			.click(Obsidian._clearSearch.bind(this, this._filterSpells));

		this._filterSpells();
		this._filterEquipment();
		this._contextMenu(html);
		Obsidian._resizeMain(html);

		if (!this.options.editable) {
			return;
		}

		console.debug(this.actor);

		html.on('dragend', () => {
			this.details.forEach((open, el) => el.open = open);
			if (this.element) {
				this.element.find('.obsidian-drag-indicator').css('display', 'none');
				this.element.find('.obsidian-inv-container').removeClass('obsidian-container-drop');
			}
		});

		html.find('[draggable]').each((i, el) =>
			el.addEventListener('dragstart', this._onDragItemStart.bind(this), false));
		html.find('.obsidian-inspiration')
			.click(this._toggleControl.bind(this, 'data.attributes.inspiration'));
		html.find('.obsidian-prof').click(this._setSkillProficiency.bind(this));
		html.find('.obsidian-conditions .obsidian-radio-label')
			.click(this._setCondition.bind(this));
		html.find('.obsidian-exhaustion .obsidian-radio').click(
			this._setAttributeLevel.bind(this, 'data.attributes.exhaustion'));
		html.find('.obsidian-death-successes .obsidian-radio').click(
			this._setAttributeLevel.bind(this, 'data.attributes.death.success'));
		html.find('.obsidian-death-failures .obsidian-radio').click(
			this._setAttributeLevel.bind(this, 'data.attributes.death.failure'));
		html.find('.obsidian-save-item .obsidian-radio').click(this._setSaveProficiency.bind(this));
		html.find('.obsidian-skill-mod').click(evt =>
			new ObsidianSkillDialog(
				this, $(evt.currentTarget).closest('.obsidian-skill-item').data('skill-id'))
				.render(true));
		html.find('.obsidian-save-mod').click(evt =>
			new ObsidianSaveDialog(
				this, $(evt.currentTarget).closest('.obsidian-save-item').data('value'))
				.render(true));
		html.find('.obsidian-manage-spells').click(() =>
			new ObsidianSpellsDialog(this).render(true));
		html.find('.obsidian-add-feat').click(this._onAddFeature.bind(this));
		html.find('.obsidian-add-spell').click(this._onAddSpell.bind(this));
		html.find('.obsidian-add-custom-item').click(this._onAddItem.bind(this));
		html.find('.obsidian-attack-toggle').click(this._onAttackToggle.bind(this));
		html.find('[data-uuid] .obsidian-feature-use').click(this._onUseClicked.bind(this));
		html.find('[data-spell-level] .obsidian-feature-use').click(this._onSlotClicked.bind(this));
		html.find('.obsidian-global-advantage').click(() => this._setGlobalRoll('adv'));
		html.find('.obsidian-global-disadvantage').click(() => this._setGlobalRoll('dis'));
		html.find('.obsidian-inv-container').click(this._saveContainerState.bind(this));
		html.find('.obsidian-equip-action').click(this._onEquip.bind(this));
		html.find('.obsidian-delete').click(this._onDeleteFeature.bind(this));
		html.find('[data-roll]').click(this._onRoll.bind(this));
		html.find('.obsidian-cast-spell').click(this._onCastSpell.bind(this));
		html.find('.obsidian-short-rest').click(this.actor.shortRest.bind(this.actor));
		html.find('.obsidian-long-rest').click(this.actor.longRest.bind(this.actor));
		html.find('.obsidian-view').click(evt => this._viewItem($(evt.currentTarget)));
		html.find('[contenteditable]').focusout(this._onContenteditableUnfocus.bind(this));

		this._activateDialogs(html);

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

	static _clearSearch (filter, evt) {
		const target = $(evt.currentTarget);
		const search = target.siblings('.obsidian-input-search');
		search.val('');
		filter();
	}

	getData () {
		const data = super.getData();
		data.ObsidianRules = OBSIDIAN.Rules;
		data.actor.obsidian.attacks.forEach(atk => {
			atk.parentEffect = this.actor.data.obsidian.effects.get(atk.parentEffect);
			atk.parentEffect.damage =
				atk.parentEffect.components.filter(c => c.type === 'damage' && !c.versatile);
			atk.parentEffect.versatile =
				atk.parentEffect.components.filter(c => c.type === 'damage' && c.versatile);
			atk.parentItem = this.actor.getEmbeddedEntity('OwnedItem', atk.parentEffect.parentItem);
		});
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
				options.template = 'modules/obsidian/html/dialogs/' + options.template;
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

		let menu;
		let noDelMenu;

		if (this.options.editable) {
			menu = [edit, view, del];
			noDelMenu = [edit, view];
		} else {
			menu = [view];
			noDelMenu = [view];
		}

		new ContextMenu(html, '.obsidian-tr.item:not(.obsidian-spell-tr):not(.obsidian-atk-tr)', menu);
		new ContextMenu(html, '.obsidian-inv-container', menu);
		new ContextMenu(html, '.obsidian-spell-tr.item, .obsidian-atk-tr.item', noDelMenu);
	}

	/**
	 * @private
	 */
	_consumeQuantity (consumer) {
		const effect = this.actor.data.obsidian.effects.get(consumer.parentEffect);
		if (!effect) {
			return;
		}

		const item = this.actor.getEmbeddedEntity('OwnedItem', effect.parentItem);
		if (!item) {
			return;
		}

		const quantity = item.data.quantity - 1;
		if (quantity >= 0) {
			this.actor.updateEmbeddedEntity(
				'OwnedItem',
				{_id: item._id, 'data.quantity': quantity});
		}
	}

	/**
	 * @private
	 * @param el {JQuery}
	 */
	async _deleteItem (el) {
		const id = el.data('item-id');
		const item = this.actor.data.items.find(item => item._id === id);
		await this.actor.deleteEmbeddedEntity('OwnedItem', id);
		this.actor.updateEquipment(item);
	}

	/**
	 * @private
	 * @param el {JQuery}
	 */
	_editItem (el) {
		this.actor.items.find(item => item.id === el.data('item-id')).sheet.render(true);
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
	_filterEquipment () {
		const invTab = this.element.find('[data-group="main-tabs"][data-tab="equipment"]');
		const name = invTab.find('.obsidian-input-search').val();
		const filter =
			invTab.find('ul[data-group="equipment"] li.active').data('tab').substring(10);

		invTab.find('.obsidian-tr.item').each((_, el) => {
			const jqel = $(el);
			jqel.removeClass('obsidian-hidden');

			const nameMatch = name.length < 1 || el.dataset.name.toLowerCase().includes(name);
			const categoryMatch =
				filter === 'all'
				|| el.dataset[`filter${filter.capitalise()}`] === 'true'
				|| (filter === 'other'
					&& !Object.keys(el.dataset).some(key => key.startsWith('filter')));

			if (!categoryMatch || !nameMatch) {
				jqel.addClass('obsidian-hidden');
			}
		});
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

		if (filter === 'all') {
			spellTab.find('.obsidian-spell-table > h3').removeClass('obsidian-hidden');
		}
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
	_onAddFeature (evt) {
		evt.preventDefault();
		const flags = {
			obsidian: {
				active: evt.currentTarget.dataset.active,
				action: evt.currentTarget.dataset.action
			}
		};

		if (evt.currentTarget.dataset.source) {
			flags.obsidian.source = {type: evt.currentTarget.dataset.source};
			if (flags.obsidian.source.type === 'class') {
				if (this.actor.data.obsidian.classes.length > 0) {
					flags.obsidian.source.class =
						this.actor.data.obsidian.classes[0]._id;
				} else {
					flags.obsidian.source.type = 'other';
				}
			}
		}

		this.actor.createEmbeddedEntity('OwnedItem', {
			type: 'feat',
			name: game.i18n.localize('OBSIDIAN.NewFeature'),
			flags: flags
		}, {displaySheet: true});
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onAddItem (evt) {
		evt.preventDefault();
		evt.stopPropagation();

		const name = game.i18n.localize('OBSIDIAN.Item');
		const dlg = await renderTemplate('templates/sidebar/entity-create.html', {
			upper: name,
			lower: name.toLocaleLowerCase(),
			types: ['weapon', 'equipment', 'consumable', 'backpack']
		});

		new Dialog({
			title: game.i18n.localize('OBSIDIAN.NewCustomItem'),
			content: dlg,
			buttons: {
				create: {
					icon: '<i class="fas fa-check"></i>',
					label: game.i18n.localize('OBSIDIAN.CreateItem'),
					callback: dlg =>
						this.actor.createEmbeddedEntity(
							'OwnedItem', validateForm(dlg[0].children[0]))
				}
			},
			default: 'create'
		}).render(true);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onAddSpell (evt) {
		evt.preventDefault();
		evt.stopPropagation();

		this.actor.createEmbeddedEntity('OwnedItem', {
			type: 'spell',
			name: game.i18n.localize('OBSIDIAN.NewSpell')
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
		const uuid = evt.currentTarget.dataset.uuid;
		const attack = this.actor.data.obsidian.components.get(uuid);
		const effect = this.actor.data.obsidian.effects.get(attack.parentEffect);
		const item = this.actor.getEmbeddedEntity('OwnedItem', effect.parentItem);
		const tags = item.flags.obsidian.tags;
		const current = attack.mode;
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

		const update = {
			_id: item._id,
			[`flags.obsidian.effects.${effect.idx}.components.${attack.idx}.mode`]: mode
		};

		this.actor.updateEmbeddedEntity('OwnedItem', OBSIDIAN.updateArrays(item, update));
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onCastSpell (evt) {
		if (!evt.currentTarget.dataset || !evt.currentTarget.dataset.spl) {
			return;
		}

		const spell =
			this.actor.data.items.find(item => item._id === evt.currentTarget.dataset.spl);

		if (!spell) {
			return;
		}

		if (spell.data.level < 1) {
			evt.currentTarget.dataset.roll = 'spl';
			evt.currentTarget.dataset.level = spell.data.level;
			Rolls.fromClick(this.actor, evt);
		} else {
			new ObsidianSpellSlotDialog(this, spell).render(true);
		}
	}

	/**
	 * @private
	 */
	_onContenteditableUnfocus (evt) {
		setTimeout(() => {
			if (!$(':focus').length) {
				this._onSubmit(evt);
			}
		}, 25);
	}

	/**
	 * @private
	 */
	async _onDeleteFeature (evt) {
		const target = $(evt.currentTarget);
		if (!target.hasClass('obsidian-alert')) {
			target.addClass('obsidian-alert');
			return;
		}

		await this.actor.deleteEmbeddedEntity('OwnedItem', target.closest('.item').data('item-id'));
	}

	_onDragItemStart (event) {
		const target = event.currentTarget;
		if (target.tagName === 'SUMMARY') {
			$(target).closest('.obsidian-tbody').children('details').each((i, el) => {
				this.details.set(el, el.open);
				el.open = false;
			});
		}

		return Reorder.dragStart(event);
	}

	_onDragOver (event) { return Reorder.dragOver(event); }
	_onDrop (event) { return Reorder.drop(this.actor, event); }

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onEquip (evt) {
		const id = $(evt.currentTarget).closest('.obsidian-tr').data('item-id');
		const item = this.actor.data.items.find(item => item._id === id);

		if (!item || !item.flags.obsidian) {
			return;
		}

		if (item.flags.obsidian.equippable) {
			this.actor.updateEmbeddedEntity(
				'OwnedItem',
				{_id: id, 'data.equipped': !item.data.equipped});
		} else if (item.flags.obsidian.consumable) {
			evt.currentTarget.dataset.roll = 'item';
			evt.currentTarget.dataset.id = id;
			this._onRoll(evt);
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
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onRoll (evt) {
		const uuid = evt.currentTarget.dataset.uuid;
		const effect = this.actor.data.obsidian.effects.get(uuid);

		if (effect) {
			const item = this.actor.getEmbeddedEntity('OwnedItem', effect.parentItem);
			const resources = effect.components.filter(component => component.type === 'resource');
			const consumers = effect.components.filter(component => component.type === 'consume');

			if (resources.length) {
				this._useResource(item, effect, resources[0]);
			}

			if (consumers.length) {
				const consumer = consumers[0];
				if (consumer.target === 'qty') {
					this._consumeQuantity(consumer);
				} else {
					const [refItem, refEffect, resource] =
						Effect.getLinkedResource(this.actor.data, consumers[0]);

					if (refItem && refEffect && resource) {
						this._useResource(refItem, refEffect, resource);
					}
				}
			}
		}

		if (evt.currentTarget.dataset.roll === 'item') {
			const item =
				this.actor.getEmbeddedEntity('OwnedItem', evt.currentTarget.dataset.id);

			if (item && item.obsidian) {
				if (item.obsidian.actionable.length > 1) {
					new ObsidianActionableDialog(this, item).render(true);
					return;
				} else if (item.obsidian.actionable.length) {
					evt.currentTarget.dataset.roll = 'fx';
					evt.currentTarget.dataset.uuid = item.obsidian.actionable[0].uuid;
					this._onRoll(evt);
					return;
				}
			}
		}

		Rolls.fromClick(this.actor, evt);
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
	async _onSubmit (event, {preventClose = false} = {}) {
		if (event.currentTarget && event.currentTarget.dataset) {
			const name = event.currentTarget.dataset.name;
			if (name && name.startsWith('items.')) {
				// Special case updates to items to avoid sending the whole item
				// array each time.
				const components = name.split('.');
				const idx = Number(components[1]);
				const item = this.actor.data.items[idx];
				const property = components.slice(2).join('.');
				const update = {_id: item._id};
				update[property] = event.currentTarget.value;
				return this.actor.updateEmbeddedEntity(
					'OwnedItem',
					OBSIDIAN.updateArrays(item, update));
			}
		}

		if (this.entity.isToken) {
			this.entity.token.data.actorData =
				mergeObject(this.actor.data, this.entity.token.data.actorData, {inplace: false});
		}

		return super._onSubmit(event, {preventClose: preventClose});
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onUseClicked (evt) {
		const target = $(evt.currentTarget);
		const parent = target.parent();
		const uuid = parent.data('uuid');
		const n = Number(target.data('n'));

		const resource = this.actor.data.obsidian.components.get(uuid);
		if (!resource) {
			return;
		}

		const effect = this.actor.data.obsidian.effects.get(resource.parentEffect);
		if (!effect) {
			return;
		}

		const item = this.actor.getEmbeddedEntity('OwnedItem', effect.parentItem);
		if (!item) {
			return;
		}

		const max = resource.max;
		let used = max - resource.remaining;

		if (n > used) {
			used++;
		} else {
			used--;
		}

		const update = {
			_id: item._id,
			[`flags.obsidian.effects.${effect.idx}.components.${resource.idx}.remaining`]:
			max - used
		};

		return this.actor.updateEmbeddedEntity('OwnedItem', OBSIDIAN.updateArrays(item, update));
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

			const offset = game.i18n.lang === 'ja' ? 29 : -30;
			jqel.css('height', `${total - innerTotal + offset}px`);
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
		const id = target.dataset.itemId;

		// Doesn't seem to be a way to do this without re-rendering the sheet,
		// which is unfortunate as this could easily just be passively saved.

		// The click event fires before the open state is toggled so we invert
		// it here to represent what the state will be right after this event.
		this.actor.updateEmbeddedEntity(
			'OwnedItem',
			{_id: id, flags: {obsidian: {open: !target.parentNode.open}}});
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

	_updateObject (event, formData) {
		// TODO: Handle tokens.
		super._updateObject(event, OBSIDIAN.updateArrays(this.actor.data, formData));
	}

	/**
	 * @private
	 */
	_useResource (item, effect, resource, n = 1) {
		let remaining = resource.remaining - n;
		if (remaining < 0) {
			remaining = 0;
		}

		const update = {
			_id: item._id,
			[`flags.obsidian.effects.${effect.idx}.components.${resource.idx}.remaining`]: remaining
		};

		this.actor.updateEmbeddedEntity('OwnedItem', OBSIDIAN.updateArrays(item, update));
	}

	/**
	 * @private
	 * @param el {JQuery}
	 */
	_viewItem (el) {
		const id = el.data('item-id');
		const existing =
			Object.values(this.actor.apps).find(app =>
				app.constructor === ObsidianViewDialog && app.item._id === id);

		if (existing) {
			existing.render(true);
		} else {
			new ObsidianViewDialog(id, this).render(true);
		}
	}
}
