import ActorSheet5eVehicle from '../../../../systems/dnd5e/module/actor/sheets/vehicle.js';
import {Sheet} from '../module/sheet.js';
import {Reorder} from '../module/reorder.js';
import {ObsidianCharacter} from './obsidian.js';
import {ObsidianNPC} from './npc.js';
import {OBSIDIAN} from '../global.js';
import {ObsidianVehicleDetailsDialog} from '../dialogs/vehicle-details.js';

export class ObsidianVehicle extends ActorSheet5eVehicle {
	constructor (...args) {
		super(...args);
		this.settings = {};

		if (this.actor.id) {
			game.settings.register('obsidian', this.actor.id, {
				default: '',
				scope: 'client',
				onChange: settings => this.settings = JSON.parse(settings)
			});

			this.settings = game.settings.get('obsidian', this.actor.id);
			if (this.settings === '') {
				this.settings = {};
			} else {
				this.settings = JSON.parse(this.settings);
			}
		}

		this.details = new Map();
	}

	get template () {
		const limited = !this.actor.isOwner && this.actor.limited;
		return `modules/obsidian/html/vehicle${limited ? '-limited' : ''}.html`;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		mergeObject(options, {
			width: 768,
			classes: options.classes.concat(['obsidian-window']),
			scrollY: ['.obsidian-scrollable'],
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
		this.form.ondrop = evt => this._onDrop(evt);

		if (!this.actor.isOwner && this.actor.limited) {
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
		html.find('.obsidian-add-crew').click(this._onItemCreate.bind(this));
		html.find('.obsidian-rm-crew').click(this._onCrewDelete.bind(this));

		Sheet.activateListeners(this, html);
		Sheet.activateAbilityScores(this, html);
		ObsidianCharacter.prototype._activateDialogs.apply(this, arguments);
	}

	getData () {
		const data = super.getData();
		const type = data.actor.flags.obsidian.details.type;
		data.base = this.actor.toObject();
		data.items = this.actor.items.map(item => item.toObject(false));
		data.ObsidianConfig = OBSIDIAN.Config;
		data.ObsidianLabels = OBSIDIAN.Labels;
		data.landVehicle = type === 'land';
		data.waterVehicle = !type || type === 'water';
		data.featCategories = {};
		data.availableCrew = data.actor.data.cargo.crew.map(crew => crew.name);
		data.availableCrew.sort();

		for (const item of data.items) {
			let cat;
			if (item.type === 'feat') {
				cat = item.data.activation.type;
				if (cat === 'special' || cat === 'bonus' || !cat.length) {
					cat = 'none';
				}
			} else if (item.type === 'weapon') {
				cat = data.landVehicle ? 'action' : 'component';
			} else if (item.type === 'equipment' && item.flags.obsidian.subtype === 'vehicle') {
				cat = 'component';
			} else {
				continue;
			}

			let category = data.featCategories[cat];
			if (!category) {
				category = [];
				data.featCategories[cat] = category;
			}

			category.push(item);
			item.obsidian.collection.attack.forEach(ObsidianCharacter.prototype._reifyAttackLinks, this);
		}

		return data;
	}

	render (force = false, options = {}) {
		ObsidianCharacter.prototype._applySettings.apply(this);
		return super.render(force, options);
	}

	setModal () {
		ObsidianCharacter.prototype.setModal.apply(this, arguments);
	}

	async _addCrew (evt, data) {
		let section;
		let dest = 'crew';
		let current = evt.target;

		while (current && current.nodeType !== Node.DOCUMENT_NODE) {
			if (current.nodeType !== Node.ELEMENT_NODE) {
				current = current.parentNode;
				continue;
			}

			if (current.tagName === 'SECTION') {
				section = current;
				break;
			}

			current = current.parentNode;
		}

		if (section && section.classList.contains('obsidian-passengers-section')) {
			dest = 'passengers';
		}

		let name;
		if (data.pack) {
			const index = await game.packs.get(data.pack).getIndex();
			const entry = index.get(data.id);

			if (entry) {
				name = entry.name;
			}
		} else {
			const actor = game.actors.get(data.id);
			if (actor) {
				name = actor.name;
			}
		}

		if (!name) {
			return;
		}

		const collection = duplicate(this.actor.data.data.cargo[dest]);
		const index = collection.findIndex(entry => entry.name === name);

		if (index < 0) {
			const row = super.constructor.newCargo;
			row.name = name;
			collection.push(row);
		} else {
			collection[index].quantity++;
		}

		this.actor.update({[`data.cargo.${dest}`]: collection});
	}

	_calculateEditorHeight () {
		return ObsidianNPC.prototype._calculateEditorHeight.apply(this, arguments);
	}

	activateEditor (name, options = {}, initialContent = '') {
		ObsidianNPC.prototype.activateEditor.apply(this, arguments);
	}

	_editDetails () {
		new ObsidianVehicleDetailsDialog(this).render(true);
	}

	_onCrewDelete (evt) {
		if (!evt.currentTarget.classList.contains('obsidian-alert')) {
			return;
		}

		this._onItemDelete(evt);
	}

	_onChangeTab (event, tabs, active) {
		if (active.startsWith('equipment-')) {
			Sheet.filterEquipment(this);
		}
	}

	_onDrop (evt) {
		let data;
		try {
			data = JSON.parse(evt.dataTransfer.getData('text/plain'));
			if (data.type === 'Actor') {
				return this._addCrew(evt, data);
			}
		} catch (ignored) {}

		return Reorder.drop(this.actor, evt);
	}

	_onResize (event) {
		ObsidianNPC.prototype._onResize.apply(this, arguments);
	}

	async _onSubmit (event, {updateData = null, preventClose = false, preventRender = false} = {}) {
		return ObsidianCharacter.prototype._onSubmit.apply(this, arguments);
	}

	async _updateObject (event, formData) {
		return super._updateObject(event, OBSIDIAN.updateArrays(this.actor.data._source, formData));
	}
}
