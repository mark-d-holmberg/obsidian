import {OBSIDIAN} from '../global.js';
import {Reorder} from '../module/reorder.js';
import ActorSheet5eCharacter from '../../../../systems/dnd5e/module/actor/sheets/character.js';
import {ObsidianDialog} from '../dialogs/dialog.js';
import {ObsidianSaveDialog} from '../dialogs/save.js';
import {ObsidianSkillDialog} from '../dialogs/skill.js';
import {ObsidianSpellsDialog} from '../dialogs/spells.js';
import {Sheet} from '../module/sheet.js';
import {ObsidianTabs} from '../module/tabs.js';
import {Config} from '../data/config.js';

// These are all used in eval() for dynamic dialog creation.
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
// noinspection ES6UnusedImports
import {ObsidianNPCSavesDialog} from '../dialogs/npc-saves.js';
// noinspection ES6UnusedImports
import {ObsidianNPCSkillsDialog} from '../dialogs/npc-skills.js';
// noinspection ES6UnusedImports
import {ObsidianNPCFeaturesDialog} from '../dialogs/npc-features.js';
// noinspection ES6UnusedImports
import {ObsidianVehicleFeaturesDialog} from '../dialogs/vehicle-features.js';

export class ObsidianCharacter extends ActorSheet5eCharacter {
	constructor (object, options) {
		if (!game.user.isGM && object.limited) {
			options.width = 880;
			options.height = 625;
			options.resizable = false;
		}

		super(object, options);
		this.settings = {};

		if (this.actor.id) {
			game.settings.register('obsidian', this.actor.id, {
				name: 'Obsidian settings',
				default: '',
				type: String,
				scope: 'client',
				onChange: settings => this.settings = JSON.parse(settings)
			});

			this.settings = game.settings.get('obsidian', this.actor.id);
			if (this.settings === '') {
				this.settings = {};
				this.settings.portraitCollapsed = false;
				game.settings.set('obsidian', this.actor.id, JSON.stringify(this.settings));
			} else {
				this.settings = JSON.parse(this.settings);
			}
		}

		this.tabs = {};
		this.details = new Map();
	}

	get template () {
		return 'modules/obsidian/html/'
			+ (!this.actor.isOwner && this.actor.limited ? 'limited.html' : 'obsidian.html');
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(['actor', 'character-sheet', 'obsidian-window']),
			width: 1170,
			height: 720,
			showUnpreparedSpells: true,
			scrollY: ['form.obsidian', '.obsidian-scrollable']
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

		if (!this.actor.isOwner && this.actor.limited) {
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
				}
			});
		});

		html.find('.obsidian-tab.item, .obsidian-sub-tab.item').removeAttr('draggable');
		Sheet.activateFiltering(this, html);
		Sheet.contextMenu(this, html);

		// Since foundry disables the local cache and forces a request to the
		// server to verify cache status, image elements always load in after
		// the initial sheet render. When the image pops in, it causes the
		// scrollHeight of the container to be recalculated which undoes the
		// scroll position restoration that was just completed post-render, so
		// we have to add the following as a workaround.
		this.form.querySelector('img.obsidian-profile-img').onload = () =>
			this._restoreScrollPositions(html);

		if (!this.options.editable) {
			return;
		}

		console.debug(this.actor);

		Sheet.activateDragging(this, html);
		html.find('.obsidian-inspiration')
			.click(this._toggleControl.bind(this, 'data.attributes.inspiration'));
		html.find('.obsidian-prof').click(this._setSkillProficiency.bind(this));
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
		html.find('.obsidian-sidebar .obsidian-char-box-text')
			.mouseup(this._onCollapseDetails.bind(this));
		html.find('.obsidian-speed').mouseup(this._cycleSpeed.bind(this));
		html.find('.obsidian-skill-mod, .obsidian-save-mod').hover(function () {
			this._obs_content = this.textContent;
			this.textContent = '\uF013';
		}, function () {
			if (this._obs_content) {
				this.textContent = this._obs_content;
			}
		});

		Sheet.activateListeners(this, html);
		Sheet.activateAbilityScores(this, html);
		this._activateDialogs(html);
	}

	getData () {
		const data = {
			owner: this.actor.isOwner,
			limited: !this.actor.isOwner && this.actor.limited,
			options: this.options,
			editable: this.isEditable,
			cssClass: this.actor.isOwner ? 'editable' : 'locked',
			isCharacter: true,
			config: CONFIG.DND5E,
			rollData: this.actor.getRollData.bind(this.actor),
			detailsCollapsed: this.settings.detailsCollapsed,
			abilityRows: Math.ceil(Object.keys(CONFIG.DND5E.abilities).length / 2)
		};

		data.actor = this.actor.toObject(false);
		data.base = this.actor.toObject();
		data.data = data.actor.data;
		data.ObsidianConfig = OBSIDIAN.Config;
		data.ObsidianLabels = OBSIDIAN.Labels;
		data.items = data.actor.items;
		this._prepareItems(data);

		for (const [id, skill] of Object.entries(data.data.skills)) {
			// Undo some upstream overwriting of skill labels
			skill.label = this.actor.data.data.skills[id].label;
		}

		data.actor.obsidian.feats =
			this.actor.obsidian.itemsByType.get('feat').map(i => i.toObject(false));

		data.actor.obsidian.attacks.forEach(this._reifyAttackLinks, this);
		data.actor.obsidian.tempEffects =
			data.actor.obsidian.feats.filter(feat => feat.flags.obsidian?.activeEffect);

		data.speed = {label: data.actor.flags.obsidian.attributes.speedDisplay};

		if (!data.speed.label) {
			data.speed.label = 'walk';
		}

		data.speed.value = this.actor.data.data.attributes.movement[data.speed.label];
		Sheet.getSenses(data);
		Sheet.getRules(data);
		console.debug(data);
		return data;
	}

	render (force = false, options = {}) {
		this._applySettings();
		return super.render(force, options);
	}

	_saveScrollPositions (html) {
		return super._saveScrollPositions(html.parent());
	}

	_restoreScrollPositions (html) {
		super._restoreScrollPositions(html.parent());
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

			evt.stopPropagation();
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
		const speeds = this.actor.data.data.attributes.movement;
		const startIdx = Config.SPEEDS.indexOf(currentSpeed);
		let newSpeed = null;

		for (let i = 1; i < Config.SPEEDS.length; i++) {
			const nextIdx = (startIdx + i) % Config.SPEEDS.length;
			const speedKey = Config.SPEEDS[nextIdx];
			const speed = speeds[speedKey];

			if (speed) {
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
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onAddFeature (evt) {
		evt.preventDefault();
		const flags = {obsidian: {}};

		if (evt.currentTarget.dataset.source) {
			flags.obsidian.source = {type: evt.currentTarget.dataset.source};
			if (flags.obsidian.source.type === 'class') {
				if (this.actor.obsidian.classes.length) {
					flags.obsidian.source.class = this.actor.obsidian.classes[0].id;
				} else {
					flags.obsidian.source.type = 'other';
				}
			}
		}

		this.actor.createEmbeddedDocuments('Item', [{
			type: 'feat',
			name: game.i18n.localize('OBSIDIAN.NewFeature'),
			data: {activation: {type: evt.currentTarget.dataset.action}},
			flags: flags
		}]).then(items => items.shift().sheet.render(true));
	}

	_onCollapseDetails (evt) {
		if (evt.button !== 2) {
			return;
		}

		const detail = evt.currentTarget.dataset.detail;
		const collapsed = !!this.settings.detailsCollapsed?.[detail];
		evt.currentTarget.parentElement.classList.toggle('obsidian-collapsed', !collapsed);

		if (!this.settings.detailsCollapsed) {
			this.settings.detailsCollapsed = {};
		}

		this.settings.detailsCollapsed[detail] = !collapsed;

		if (this.actor.id) {
			game.settings.set('obsidian', this.actor.id, JSON.stringify(this.settings));
		}
	}

	_onCollapseNotes (evt) {
		if (evt.button !== 2) {
			return;
		}

		const note = evt.currentTarget.dataset.notes;
		const collapsed = !!this.actor.getFlag('obsidian', `notes.${note}`);
		this.actor.setFlag('obsidian', `notes.${note}`, !collapsed);
	}

	/**
	 * @private
	 */
	_onResize (event) {
		super._onResize(event);
		this.settings.width = this.position.width;
		this.settings.height = this.position.height;

		if (this.actor.id) {
			game.settings.set('obsidian', this.actor.id, JSON.stringify(this.settings));
		}
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
				const item = this.actor.data._source.items[idx];
				const property = components.slice(2).join('.');
				const update = {_id: item._id};

				let value = event.currentTarget.value;
				if (event.currentTarget.dataset.dtype === 'Number') {
					value = Number(value);
				} else if (event.currentTarget.dataset.dtype === 'Boolean') {
					value = value === 'true';
				}

				update[property] = value;
				return this.actor.updateEmbeddedDocuments(
					'Item', [OBSIDIAN.updateArrays(item, update)]);
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
		atk.parentItem = this.actor.items.get(atk.parentEffect.parentItem).data;
	}

	_rollHighestHD () {
		const highest = Config.HD.reduce((max, hd) => {
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
		let state = this.actor.data._source.data.abilities[save].proficient;

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
			const newSkills = duplicate(this.actor.data._source.flags.obsidian[prop][key]);
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

		if (this.actor.id) {
			game.settings.set('obsidian', this.actor.id, JSON.stringify(this.settings));
		}
	}

	async _updateObject (event, formData) {
		return super._updateObject(event, OBSIDIAN.updateArrays(this.actor.data._source, formData));
	}
}
