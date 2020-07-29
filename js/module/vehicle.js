import ActorSheet5eVehicle from '../../../../systems/dnd5e/module/actor/sheets/vehicle.js';
import {Sheet} from './sheet.js';
import {Reorder} from './reorder.js';
import {Obsidian} from './obsidian.js';
import {ObsidianNPC} from './npc.js';
import {OBSIDIAN} from '../global.js';
import {ObsidianVehicleDetailsDialog} from '../dialogs/vehicle-details.js';

export class ObsidianVehicle extends ActorSheet5eVehicle {
	constructor (...args) {
		super(...args);
		game.settings.register('obsidian', this.object.data._id, {
			default: '',
			scope: 'client',
			onChange: settings => this.settings = JSON.parse(settings)
		});

		this.settings = game.settings.get('obsidian', this.object.data._id);
		if (this.settings === '') {
			this.settings = {};
		} else {
			this.settings = JSON.parse(this.settings);
		}

		this.details = new Map();
	}

	get template () {
		return 'modules/obsidian/html/vehicle.html';
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		mergeObject(options, {
			width: 768,
			classes: options.classes.concat(['obsidian-window']),
			scrollY: ['.obsidian'],
			tabs: [{
				navSelector: 'ul.obsidian-tab-bar[data-group="main-tabs"]',
				contentSelector: 'form.obsidian',
				initial: 'stats'
			}, {
				navSelector: 'ul.obsidian-tab-bar[data-group="equipment"]',
				contentSelector: '.obsidian-inv-table',
				initial: 'equipment-all'
			}]
		});

		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		console.debug(this.actor);

		this.form.ondragover = Reorder.dragOver;
		this.form.ondrop = evt => Sheet.onDrop(this, evt);

		if (this.actor.limited) {
			return;
		}

		html.find('.obsidian-tab.item, .obsidian-sub-tab.item').removeAttr('draggable');
		Sheet.activateFiltering(this, html);
		Sheet.contextMenu(this, html);

		if (!this.options.editable) {
			return;
		}

		Sheet.activateDragging(this, html);
		html.find('.obsidian-char-header-minor').click(this._editDetails.bind(this));
		html.find('.obsidian-npc-condition-grid .obsidian-radio-label')
			.click(evt => Sheet.setCondition(this, evt));

		const activateEditor =
			html.find('[data-edit="data.details.biography.value"]+.editor-edit')[0].onclick;

		html.find('.obsidian-edit-npc-notes').click(activateEditor.bind(this));

		Sheet.activateListeners(this, html);
		Sheet.activateAbilityScores(this, html);
		Obsidian.prototype._activateDialogs.apply(this, arguments);
	}

	getData () {
		const data = super.getData();
		const type = data.actor.flags.obsidian.details.type;
		data.ObsidianRules = OBSIDIAN.Rules;
		data.landVehicle = type === 'land';
		data.waterVehicle = !type || type === 'water';
		data.featCategories = {};

		for (const item of data.actor.items) {
			let cat;
			if (item.type === 'feat') {
				cat = item.data.activation.type;
				if (cat === 'special' || cat === 'bonus' || !cat.length) {
					cat = 'none';
				}
			} else {
				continue;
			}

			let category = data.featCategories[cat];
			if (!category) {
				category = [];
				data.featCategories[cat] = category;
			}

			category.push(item);
		}

		return data;
	}

	render (force = false, options = {}) {
		Obsidian.prototype._applySettings.apply(this);
		return super.render(force, options);
	}

	setModal () {
		Obsidian.prototype.setModal.apply(this, arguments);
	}

	_calculateEditorHeight () {
		return ObsidianNPC.prototype._calculateEditorHeight.apply(this, arguments);
	}

	_createEditor (target, editorOptions, initialContent) {
		ObsidianNPC.prototype._createEditor.apply(this, arguments);
	}

	_editDetails () {
		new ObsidianVehicleDetailsDialog(this).render(true);
	}

	_onChangeTab (event, tabs, active) {
		if (active.startsWith('equipment-')) {
			Sheet.filterEquipment(this);
		}
	}

	_onResize (event) {
		ObsidianNPC.prototype._onResize.apply(this, arguments);
	}

	async _onSubmit (event, {updateData = null, preventClose = false, preventRender = false} = {}) {
		return Obsidian.prototype._onSubmit.apply(this, arguments);
	}

	_restoreScrollPositions (html, selectors) {
		ObsidianNPC.prototype._restoreScrollPositions.apply(this, arguments);
	}

	async _updateObject (event, formData) {
		return super._updateObject(event, OBSIDIAN.updateArrays(this.actor.data, formData));
	}
}
