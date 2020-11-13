import {OBSIDIAN} from '../global.js';
import {Reorder} from './reorder.js';
import ActorSheet5eCharacter from '../../../../systems/dnd5e/module/actor/sheets/character.js';
import {ObsidianDialog} from '../dialogs/dialog.js';
import {ObsidianSaveDialog} from '../dialogs/save.js';
import {ObsidianSkillDialog} from '../dialogs/skill.js';
import {ObsidianSpellsDialog} from '../dialogs/spells.js';
import {Sheet} from './sheet.js';
import {ObsidianTabs} from './tabs.js';
import {Rules} from '../rules/rules.js';

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
import {ObsidianToolsDialog} from '../dialogs/tools.js';
// noinspection ES6UnusedImports
import {ObsidianXPDialog} from '../dialogs/xp.js';
// noinspection ES6UnusedImports
import {ObsidianNPCSavesDialog} from '../dialogs/npc-saves.js';
// noinspection ES6UnusedImports
import {ObsidianNPCSkillsDialog} from '../dialogs/npc-skills.js';
// noinspection ES6UnusedImports
import {ObsidianNPCFeaturesDialog} from '../dialogs/npc-features.js';
// noinspection ES6UnusedImports
import {ObsidianVehicleFeaturesDialog} from '../dialogs/vehicle-features.js';

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
			scope: 'client',
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
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);

		// Allow drag and drop even when limited to allow transferring items.
		this.form.ondragover = Reorder.dragOver;
		this.form.ondrop = evt => Sheet.onDrop(this, evt);

		if (this.actor.limited) {
			return;
		}

		this._setCollapsed(this.settings.portraitCollapsed);
		html.find('.obsidian-collapser-container').click(this._togglePortrait.bind(this));
		html.find('.obsidian-tab-bar').each((i, el) => {
			const bar = $(el);
			const group = bar.data('group');
			const active = this.tabs[group];
			new ObsidianTabs(bar, {
				initial: active,
				callback: clicked => {
					this.tabs[group] = clicked.data('tab');
					if (group === 'spells') {
						Sheet.filterSpells(this);
					} else if (group === 'equipment') {
						Sheet.filterEquipment(this);
					}

					Obsidian._resizeTabs(html);
				}
			});
		});

		html.find('.obsidian-tab.item, .obsidian-sub-tab.item').removeAttr('draggable');
		Sheet.activateFiltering(this, html);
		Sheet.contextMenu(this, html);
		Obsidian._resizeMain(html);

		if (!this.options.editable) {
			return;
		}

		console.debug(this.actor);

		Sheet.activateDragging(this, html);
		html.find('.obsidian-inspiration')
			.click(this._toggleControl.bind(this, 'data.attributes.inspiration'));
		html.find('.obsidian-prof').click(this._setSkillProficiency.bind(this));
		html.find('.obsidian-conditions .obsidian-radio-label')
			.click(evt => Sheet.setCondition(this, evt));
		html.find('.obsidian-save-item .obsidian-radio').click(this._setSaveProficiency.bind(this));
		html.find('.obsidian-skill-mod').click(evt =>
			new ObsidianSkillDialog(this, evt).render(true));
		html.find('.obsidian-save-mod').click(evt =>
			new ObsidianSaveDialog(
				this, $(evt.currentTarget).closest('.obsidian-save-item').data('value'))
				.render(true));
		html.find('.obsidian-manage-spells').click(() =>
			new ObsidianSpellsDialog(this).render(true));
		html.find('.obsidian-add-feat').click(this._onAddFeature.bind(this));
		html.find('h3[data-notes]').mouseup(this._onCollapseNotes.bind(this));
		html.find('.obsidian-speed').mouseup(this._cycleSpeed.bind(this));

		Sheet.activateListeners(this, html);
		Sheet.activateAbilityScores(this, html);
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

	getData () {
		const data = super.getData();
		data.base = duplicate(this.actor._data);
		data.ObsidianRules = OBSIDIAN.Rules;
		data.actor.obsidian.feats = duplicate(this.actor.data.obsidian.itemsByType.get('feat'));
		data.actor.obsidian.attacks.forEach(this._reifyAttackLinks, this);
		data.actor.obsidian.tempEffects =
			data.actor.obsidian.feats.filter(feat => feat.flags.obsidian?.activeEffect);

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
	 * @param {JQuery} html
	 */
	_activateDialogs (html) {
		html.find('.obsidian-simple-dialog, [data-dialog]').click(evt => {
			const options = duplicate(evt.currentTarget.dataset);

			if (options.dialog === 'RollHD' && evt.shiftKey) {
				this._rollHighestHD();
				return;
			}

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
	_cycleSpeed (evt) {
		if (evt.button !== 2) {
			return;
		}

		const currentSpeed = this.actor.data.flags.obsidian.attributes.speedDisplay || 'walk';
		const speeds = this.actor.data.flags.obsidian.attributes.speed;
		const startIdx = Rules.SPEEDS.indexOf(currentSpeed);
		let newSpeed = null;

		for (let i = 1; i < Rules.SPEEDS.length; i++) {
			const nextIdx = (startIdx + i) % Rules.SPEEDS.length;
			const speedKey = Rules.SPEEDS[nextIdx];
			const speed = speeds[speedKey];

			if (speed.override || speed.derived) {
				newSpeed = speedKey;
				break;
			}
		}

		if (newSpeed && newSpeed !== currentSpeed) {
			this.actor.update({'flags.obsidian.attributes.speedDisplay': newSpeed});
		}
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
		const flags = {obsidian: {}};

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
			data: {activation: {type: evt.currentTarget.dataset.action}},
			flags: flags
		}).then(item => this.actor.items.get(item._id).sheet.render(true));
	}

	_onCollapseNotes (evt) {
		if (evt.button !== 2) {
			return;
		}

		const note = evt.currentTarget.dataset.notes;
		const collapsed = !!getProperty(this.actor.data, `flags.obsidian.notes.${note}`);
		this.actor.update({[`flags.obsidian.notes.${note}`]: !collapsed});
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

				let value = event.currentTarget.value;
				if (event.currentTarget.dataset.dtype === 'Number') {
					value = Number(value);
				} else if (event.currentTarget.dataset.dtype === 'Boolean') {
					value = value === 'true';
				}

				update[property] = value;
				return this.actor.updateEmbeddedEntity(
					'OwnedItem',
					OBSIDIAN.updateArrays(item, update));
			}
		}

		return super._onSubmit(event, {preventClose: preventClose});
	}

	_reifyAttackLinks (atk) {
		atk.parentEffect = this.actor.data.obsidian.effects.get(atk.parentEffect);
		atk.parentEffect.damage =
			atk.parentEffect.components.filter(c => c.type === 'damage' && !c.versatile);
		atk.parentEffect.versatile =
			atk.parentEffect.components.filter(c => c.type === 'damage' && c.versatile);
		atk.parentItem = this.actor.data.obsidian.itemsByID.get(atk.parentEffect.parentItem);
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

	_rollHighestHD () {
		const highest = Rules.HD.reduce((max, hd) => {
			const actorHD = this.actor.data.flags.obsidian.attributes.hd[`d${hd}`];
			if (actorHD && actorHD.value && hd > max) {
				return hd;
			}

			return max;
		}, 0);

		if (highest > 0) {
			this.actor.rollHD([[1, highest]]);
		}
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
	_setSaveProficiency (evt) {
		const save = $(evt.currentTarget).closest('.obsidian-save-item').data('value');
		let state = this.actor._data.data.abilities[save].proficient;

		if (state === undefined || state === 0) {
			state = 1;
		} else {
			state = 0;
		}

		return this.actor.update({[`data.abilities.${save}.proficient`]: state});
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_setSkillProficiency (evt) {
		const item = evt.currentTarget.closest('.obsidian-skill-item');
		const id = item.dataset.skillId || item.dataset.toolId;
		const prop = item.dataset.skillId ? 'skills' : 'tools';
		const data = getProperty(this.actor.data.flags.obsidian, `${prop}.${id}`);

		let newValue = 0;
		if (data.value === 0) {
			newValue = 1;
		} else if (data.value === 1) {
			newValue = 2;
		}

		const update = {};
		if (id.includes('.')) {
			const [key, idx] = id.split('.');
			const newSkills = duplicate(this.actor.data.flags.obsidian[prop][key]);
			newSkills[idx].value = newValue;
			update[`flags.obsidian.${prop}.${key}`] = newSkills;
		} else {
			update[`flags.obsidian.${prop}.${id}.value`] = newValue;
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
}
