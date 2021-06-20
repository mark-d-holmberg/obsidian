import {ObsidianItemSheet} from './item-sheet.js';
import {Categories, Components, Effect} from '../module/effect.js';
import {OBSIDIAN} from '../global.js';
import {Schema} from '../data/schema.js';
import {ObsidianCurrencyDialog} from '../dialogs/currency.js';
import {Config} from '../data/config.js';
import {ObsidianStandaloneDialog} from '../dialogs/standalone.js';
import {ObsidianActor} from '../module/actor.js';
import {DND5E} from '../../../../systems/dnd5e/module/config.js';

const TRAY_STATES = Object.freeze({START: 1, EFFECT: 2, COMPONENT: 3});
const FILTER_SELECTIONS = {
	score: {
		ability: ['ABILITIES', 'Ability'],
		speed: ['SPEEDS', 'Speed'],
		passive: ['SKILLS', 'Skill'],
		dc: ['EFFECT_ABILITIES', 'Ability']
	},
	roll: {
		attack: ['EFFECT_FILTER_ATTACKS', 'Attack'],
		save: ['EFFECT_FILTER_SAVES', 'Ability'],
		check: {
			ability: ['ABILITIES', 'Ability'],
			skill: ['SKILLS', 'Skill']
		},
		damage: {
			damage: ['EFFECT_DAMAGE_TYPES', 'Damage'],
			attack: ['EFFECT_FILTER_ATTACKS', 'Attack']
		}
	}
};

let categories = null;
function lazyInitialiseCategories () {
	if (categories != null) {
		return categories;
	}

	categories = new Map(Categories.map(cat => [cat, {
		label: game.i18n.localize(`OBSIDIAN.${cat.capitalize()}`),
		components: []
	}]));

	categories.set('none', {components: []});
	Object.entries(Components).forEach(([type, component]) => {
		let labels =
			Array.isArray(component.metadata.tray)
				? component.metadata.tray
				: [component.metadata.tray];

		labels = labels.map(i18n => game.i18n.localize(`OBSIDIAN.${i18n}`));

		const category = component.metadata.category || 'none';
		const components = categories.get(category).components;
		components.push({type: type, mode: 'add', label: labels[0]});

		if (labels.length > 1) {
			components.push({type: type, mode: 'rm', label: labels[1]});
		}
	});

	return categories;
}

export class ObsidianEffectSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		this._interacting = false;
		this._addedClickHandler = false;
		this._anywhereClickHandler = evt => this._onClickAnywhere(evt);
		game.settings.register('obsidian', 'effects-categories', {default: [], scope: 'client'});
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.classes.push('obsidian-effects-window');
		options.width = 560;
		options.height = 768;
		options.template = 'modules/obsidian/html/sheets/effect.html';
		options.scrollY = options.scrollY.concat('.obsidian-effects-tray');
		return options;
	}

	get _categories () {
		return lazyInitialiseCategories();
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		Effect.metadata.components.forEach(type => {
			const component = Components[type];
			html.find(`.obsidian-add-${type}, .obsidian-rm-${type}`)
				.mousedown(this._preventSubmit.bind(this));

			const addon = component.metadata.addon;
			html.find(`.obsidian-rm-${type}`).click(this._onRemoveSelected.bind(this, addon));
			html.find(`.obsidian-add-${type}`).click(this._onAddComponent.bind(this, type, addon));
		});

		html.find('.obsidian-add-effect, .obsidian-rm-effect')
			.mousedown(this._preventSubmit.bind(this));

		html.find('.obsidian-add-effect').click(this._onAddEffect.bind(this));
		html.find('.obsidian-rm-effect').click(this._onRemoveSelected.bind(this));
		html.find('.obsidian-effect').click(evt =>
			this._onEffectSelected(evt.currentTarget.dataset.uuid));
		html.find('.obsidian-effect legend').click(evt => {
			evt.stopPropagation();
			this._onComponentSelected(evt.currentTarget.parentNode.dataset.uuid);
		});

		html.find('.fancy-checkbox').mousedown(this._preventSubmit.bind(this));
		html.find('.fancy-checkbox').click(() => {
			this._onCheckBoxClicked(this);
			this._interacting = false;
		});

		html.find('legend .obsidian-edit').click(this._editDescription.bind(this));
		html.find('.obsidian-add-remove').keypress(ObsidianCurrencyDialog.onAddRemove);
		html.find('.obsidian-spell-drop').on('dragover', evt => evt.preventDefault());
		html.find('.obsidian-spell-drop').each((i, el) => el.ondrop = this._onDropSpell.bind(this));
		html.find('.obsidian-rm-provide-spell').click(this._onRemoveSpell.bind(this));
		html.find('.obsidian-provide-spell-body').click(this._onEditSpell.bind(this));
		html.find('.obsidian-table-drop').on('dragover', evt => evt.preventDefault());
		html.find('.obsidian-table-drop').each((i, el) => el.ondrop = this._onDropTable.bind(this));
		html.find('.obsidian-rm-roll-table').click(this._onRemoveTable.bind(this));
		html.find('.obsidian-roll-table-body')
			.click(evt => this._openEmbeddedEntity(evt, 'tables', 'RollTable'));
		html.find('.obsidian-actor-drop').on('dragover', evt => evt.preventDefault());
		html.find('.obsidian-actor-drop').each((i, el) => el.ondrop = this._onDropActor.bind(this));
		html.find('.obsidian-rm-provide-actor').click(this._onRemoveActor.bind(this));
		html.find('.obsidian-provide-actor-body').click(this._onEditActor.bind(this));
		html.find('summary').click(this._saveCategoryStates.bind(this));

		this._onCheckBoxClicked();
		if (!this._addedClickHandler) {
			document.addEventListener('click', this._anywhereClickHandler);
			this._addedClickHandler = true;
		}

		if (this._selectedEffect != null) {
			this._onEffectSelected(this._selectedEffect);
		} else if (this._selectedComponent != null) {
			this._onComponentSelected(this._selectedComponent);
		} else {
			this._setTrayState(TRAY_STATES.START);
		}
	}

	async close () {
		if (this._addedClickHandler) {
			document.removeEventListener('click', this._anywhereClickHandler);
			this._addedClickHandler = false;
		}

		super.close();
	}

	async getData () {
		const data = super.getData();
		data.equipTypes = Schema.EquipTypes;
		data.spellLists = Object.keys(OBSIDIAN.Data.SPELLS_BY_CLASS);
		data.categories = this._categories;
		data.uncategorised = data.categories.get('none').components;
		data.isVehicle = data.actor?.type === 'vehicle';
		data.config = {cover: DND5E.cover};

		if (this.actor && data.item.flags?.obsidian?.effects) {
			const hasResource = item =>
				item.data.flags?.obsidian?.effects?.some(e =>
					e.components.some(c => c.type === 'resource'));

			data.itemsWithResources =
				this.actor.obsidian.itemsByType.not('class', 'spell', 'feat')
					.filter(hasResource);

			data.featsWithResources =
				this.actor.obsidian.itemsByType.get('feat').filter(hasResource);

			data.item.flags.obsidian.effects
				.flatMap(e => e.components)
				.filter(c => c.type === 'spells')
				.forEach(component =>
					component.spells = component.spells.map(id =>
						this.actor.items.get(id).toObject(false)));
		}

		if (data.item.flags?.obsidian?.effects?.length) {
			const components = data.item.flags.obsidian.effects.flatMap(e => e.components);
			components.filter(c => c.type === 'consume' || c.type === 'produce')
				.forEach(component => {
					let item = data.item;
					if (data.actor) {
						item =
							data.actor.items.get(
								component.target === 'feat' ? component.featID : component.itemID)
								.toObject(false);
					}

					if (item) {
						component.itemResourceComponents =
							item.flags.obsidian.effects
								.flatMap(e => e.components)
								.filter(c => c.type === 'resource');
					}

					if (!data.actor) {
						component.itemResourceComponents.forEach(c =>
							c.label =
								c.name.length ? c.name : game.i18n.localize('OBSIDIAN.Unnamed'));
					}
				});

			components.filter(c => c.type === 'filter').forEach(component => {
				component.isMulti = Effect.determineMulti(component);
				component.isCollection = component.isMulti && component.multi === 'some';
				component.availableSelections = this._generateFilterSelections(component);
			});

			const resolving = [];
			components.filter(c => c.type === 'summon').forEach(component => {
				component.processed = [];
				component.actors.forEach(uuid => {
					const parts = uuid.split('.');
					if (parts[0] === 'Compendium' && parts.length < 4) {
						parts.shift();
						const pack = game.packs.get(parts.join('.'));

						if (pack) {
							resolving.push(
								Promise.resolve({
									uuid: uuid,
									entity: 'Compendium',
									name: pack.metadata.label
								}).then(entry => component.processed.push(entry)));
						}

						return;
					}

					resolving.push(fromUuid(uuid).then(entity => {
						if (!entity) {
							return;
						}

						component.processed.push({
							uuid: uuid,
							entity: entity.documentName,
							name: entity.name
						});
					}));
				});
			});

			await Promise.all(resolving);
		}

		if (this.item.isOwned) {
			data.rollData = this.item.actor.getRollData();
		}

		data.usesAbilities = {};
		Config.ABILITIES.forEach(abl => data.usesAbilities[abl] = `OBSIDIAN.Ability.${abl}`);
		return data;
	}

	async maximize () {
		Application.prototype.maximize.apply(this, arguments);
	}

	_delaySubmit (evt) {
		if (this._interacting) {
			return;
		}

		this._submitTimeout = setTimeout(() => {
			if (!this.element.find('input:focus, select:focus').length) {
				this._onSubmit(evt);
			}
		}, 50);
	}

	_editDescription (evt) {
		const target = evt.currentTarget;
		const effects = duplicate(this.item.data.flags.obsidian.effects);
		const effect =
			effects.find(e => e.uuid === target.closest('.obsidian-effect').dataset.uuid);

		if (!effect) {
			return;
		}

		const component =
			effect.components.find(c => c.uuid === target.closest('fieldset').dataset.uuid);

		if (!component) {
			return;
		}

		const dialog = new ObsidianStandaloneDialog({}, {
			width: 560,
			height: 300,
			title: game.i18n.localize('OBSIDIAN.EditDescription'),
			template: 'modules/obsidian/html/dialogs/description.html'
		});

		dialog.activateEditor = super.activateEditor;
		dialog.editors = {};

		dialog.activateListeners = html => {
			html.find('.editor-content[data-edit]').each((i, div) =>
				FormApplication.prototype._activateEditor.apply(dialog, [div]));
		};

		dialog.close = async () => {
			const editors = Object.values(dialog.editors);
			if (editors.length) {
				const ed = editors[0];
				if (ed.mce) {
					component.raw = ed.mce.getContent();
					await this._updateEffects(
						null,
						OBSIDIAN.updateArrays(
							this.item.data._source, {'flags.obsidian.effects': effects}));
				}
			}

			this.render(false);
			Application.prototype.close.apply(dialog, arguments);
		};

		dialog.getData = () => {
			return {existingContent: component.raw};
		};

		dialog.render(true);
	}

	get _formData () {
		const expanded = OBSIDIAN.updateArrays(this.item.data._source, this._getSubmitData());
		if (!expanded['flags.obsidian.effects']) {
			return expanded;
		}

		for (const effect of expanded['flags.obsidian.effects']) {
			for (const component of effect.components) {
				if (component.type !== 'filter' || !component.collection) {
					continue;
				}

				const collection = [];
				for (const prop in component.collection) {
					if (component.collection.hasOwnProperty(prop) && component.collection[prop]) {
						collection.push({key: prop});
					}
				}

				component.collection = collection;
			}
		}

		return expanded;
	}

	/**
	 * @private
	 */
	_generateFilterSelections (component) {
		const selections = {};
		let current = FILTER_SELECTIONS;
		let filter = component.filter;

		do {
			current = current[filter];
			filter = component[filter] || component.dmg;
		} while (!Array.isArray(current) && current !== undefined);

		const [rule, i18n] = current || [];
		if (rule && i18n) {
			Config[rule].forEach(k => selections[k] = game.i18n.localize(`OBSIDIAN.${i18n}.${k}`));
		}

		if (component.filter === 'roll'
			&& component.roll === 'check'
			&& component.check === 'tool')
		{
			const tools = Config.PROF_TOOLS
				.concat(Config.PROF_TOOLS_GAME)
				.concat(Config.PROF_TOOLS_ARTISAN)
				.concat(Config.PROF_TOOLS_INSTRUMENT)
				.map(key => [key, game.i18n.localize(`OBSIDIAN.ToolProf.${key}`)]);

			tools.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
			tools.forEach(([key, label]) => selections[key] = label);
		}

		return selections;
	}

	_openEmbeddedEntity (evt, collection, entity) {
		const pill = evt.currentTarget.closest('.obsidian-item-drop-pill');
		const fieldset = pill.closest('fieldset');
		const component =
			this.item.data._source.flags.obsidian.effects
				.flatMap(e => e.components)
				.find(c => c.uuid === fieldset.dataset.uuid);

		if (!component) {
			return;
		}

		const data = component[collection].find(i => i._id === pill.dataset.id);
		if (!data) {
			return;
		}

		const item = new CONFIG[entity].documentClass(data);
		// Temporary stopgap for getting it working in 0.8.
		item.options = {
			parentComponent: component.uuid,
			parentItem: this.item
		};

		item.sheet.render(true);
	}

	/**
	 * @private
	 */
	async _onAddEffect () {
		const formData = this._formData;
		let effects = formData['flags.obsidian.effects'];

		if (!effects) {
			effects = [];
			formData['flags.obsidian.effects'] = effects;
		}

		effects.push(Effect.create());
		this._updateEffects(null, formData);
		this._interacting = false;
	}

	/**
	 * @private
	 */
	async _onAddComponent (type, prop) {
		if (this._selectedEffect == null && this._selectedComponent == null) {
			return;
		}

		const formData = this._formData;
		const effects = formData['flags.obsidian.effects'];
		const effect = effects.find(effect => effect.uuid === this._selectedEffect);

		if (effect) {
			effect.components.push(Effect.createComponent(type));
		} else {
			const component =
				effects.flatMap(e => e.components).find(c => c.uuid === this._selectedComponent);

			if (component) {
				component[prop] = Effect.createComponent(type);
			} else {
				return;
			}
		}

		this._updateEffects(null, formData);
		this._interacting = false;
	}

	/**
	 * @private
	 */
	_onClickAnywhere (evt) {
		const closestEffect = evt.target.closest('.obsidian-effect');
		const closestPill = evt.target.closest('.obsidian-effects-pill');
		const closestSummary = evt.target.closest('.obsidian-effects-cat > summary');

		if (closestEffect == null && closestSummary == null
			&& (closestPill == null || closestPill.classList.contains('obsidian-rm-effect')))
		{
			this._selectedEffect = null;
			this._selectedComponent = null;
			this.element.find('.obsidian-effect, .obsidian-effect fieldset')
				.removeClass('obsidian-selected');
			this._setTrayState(TRAY_STATES.START);
		}
	}

	/**
	 * @private
	 */
	_onCheckBoxClicked () {
		if (this.item.type !== 'weapon') {
			return;
		}

		const range = this.element.find('.obsidian-range-part');
		const consume = this.element.find('[data-bound="flags.obsidian.consumeThrown"]');
		const magic = this.element.find('.obsidian-magic-item');

		range.addClass('obsidian-hidden');
		consume.addClass('obsidian-hidden');
		magic.removeClass('obsidian-stacked-row');
		const thrown = this.element.find('input[name="flags.obsidian.tags.thrown"]');

		if (thrown.length && thrown.prop('checked')) {
			range.removeClass('obsidian-hidden');
			consume.removeClass('obsidian-hidden');
			magic.addClass('obsidian-stacked-row');
		}

		if (this.item.data.flags.obsidian?.type === 'ranged') {
			range.removeClass('obsidian-hidden');
			magic.addClass('obsidian-stacked-row');
		}
	}

	/**
	 * @private
	 */
	_onComponentSelected (uuid) {
		this._selectedEffect = null;
		this._selectedComponent = uuid;
		this.element.find('.obsidian-effect, .obsidian-effect fieldset')
			.removeClass('obsidian-selected');

		this.element.find(`[data-uuid="${uuid}"]`).addClass('obsidian-selected');
		this._setTrayState(TRAY_STATES.COMPONENT);
	}

	/**
	 * @private
	 */
	async _onDropActor (evt) {
		evt.preventDefault();
		let data;

		try {
			data = JSON.parse(evt.dataTransfer.getData('text/plain'));
		} catch (ignored) {}

		if (!data || !['Actor', 'Compendium'].includes(data.type)
			|| (data.type === 'Compendium' && data.entity !== 'Actor'))
		{
			return;
		}

		const effects = duplicate(this.item.data._source.flags.obsidian.effects);
		const fieldset = evt.target.closest('fieldset');
		const effectDiv = fieldset.closest('.obsidian-effect');
		const effect = effects.find(e => e.uuid === effectDiv.dataset.uuid);

		if (!effect) {
			return;
		}

		const component = effect.components.find(c => c.uuid === fieldset.dataset.uuid);
		if (!component) {
			return;
		}

		if (data.type === 'Compendium') {
			component.actors.push(`Compendium.${data.id}`);
		} else {
			let entity;
			if (data.pack) {
				const pack = game.packs.get(data.pack);
				entity = await pack.getDocument(data.id);
			} else {
				entity = game.actors.get(data.id);
			}

			if (!entity) {
				return;
			}

			component.actors.push(entity.uuid);
		}

		this._updateEffects(null, {'flags.obsidian.effects': effects});
	}

	/**
	 * @private
	 */
	async _onDropSpell (evt) {
		const [effects, component, item] = await this._processDrop(evt);
		if (item?.type !== 'spell') {
			return false;
		}

		item.data._source.flags.obsidian.source = {
			type: 'item',
			item: this.item.id,
			display: this.item.name
		};

		if (this.actor) {
			const created = await this.actor.createEmbeddedDocuments('Item', [item.toJSON()]);
			component.spells.push(created.shift().id);
		} else {
			component.spells.push(item.data._source);
		}

		this._updateEffects(null, {'flags.obsidian.effects': effects});
	}

	/**
	 * @private
	 */
	async _onDropTable (evt) {
		const [effects, component, item] = await this._processDrop(evt, 'RollTable');
		if (!item) {
			return false;
		}

		component.tables.push(item.data._source);
		this._updateEffects(null, {'flags.obsidian.effects': effects});
	}

	/**
	 * @private
	 */
	async _onEditActor (evt) {
		const pill = evt.currentTarget.closest('.obsidian-item-drop-pill');
		const parts = pill.dataset.id.split('.');

		if (parts[0] === 'Compendium' && parts.length < 4) {
			parts.shift();

			const pack = game.packs.get(parts.join('.'));
			if (!pack) {
				return;
			}


			pack.render(true);
			return;
		}

		const entity = await fromUuid(pill.dataset.id);
		if (!entity) {
			return;
		}

		entity.sheet.render(true);
	}

	/**
	 * @private
	 */
	_onEditSpell (evt) {
		if (this.actor) {
			const item =
				this.actor.items.get(
					evt.currentTarget.closest('.obsidian-item-drop-pill').dataset.id);

			if (!item) {
				return;
			}

			item.sheet.render(true);
		} else {
			this._openEmbeddedEntity(evt, 'spells', 'Item');
		}
	}

	/**
	 * @private
	 */
	_onEffectSelected (uuid) {
		this._selectedEffect = uuid;
		this._selectedComponent = null;
		this.element.find('.obsidian-effect, .obsidian-effect fieldset')
			.removeClass('obsidian-selected');

		this.element.find(`[data-uuid="${uuid}"]`).addClass('obsidian-selected');
		this._setTrayState(TRAY_STATES.EFFECT);
	}

	/**
	 * @private
	 */
	async _onRemoveSelected (prop) {
		if (this._selectedEffect == null && this._selectedComponent == null) {
			return;
		}

		const formData = this._formData;
		const effects = formData['flags.obsidian.effects'];

		if (!effects) {
			return;
		}

		const orphanedSpells = [];
		if (this._selectedEffect != null) {
			const idx = effects.findIndex(effect => effect.uuid === this._selectedEffect);
			if (idx < 0) {
				return;
			}

			const effect = effects[idx];
			effects.splice(idx, 1);
			orphanedSpells.push(
				...effect.components.filter(c => c.type === 'spells').flatMap(c => c.spells));
		} else if (this._selectedComponent != null) {
			const effectUUID =
				this.element.find(`[data-uuid="${this._selectedComponent}"]`).parent().data('uuid');

			const effect = effects.find(effect => effect.uuid === effectUUID);
			if (!effect) {
				return;
			}

			const idx = effect.components.findIndex(component =>
				component.uuid === this._selectedComponent);

			if (idx < 0) {
				return;
			}

			if (typeof prop === 'string') {
				delete effect.components[idx][prop];
			} else {
				const component = effect.components[idx];
				effect.components.splice(idx, 1);

				if (component.type === 'spells') {
					orphanedSpells.push(...component.spells);
				}
			}
		}

		if (orphanedSpells.length && this.actor) {
			await this.actor.deleteEmbeddedDocuments('Item', orphanedSpells);
		}

		this._updateEffects(null, formData);
		this._interacting = false;
	}

	/**
	 * @private
	 */
	async _onRemoveActor (evt) {
		return this._removeEmbeddedEntity(evt, (component, rm) =>
			component.actors = component.actors.filter(uuid => uuid !== rm));
	}

	/**
	 * @private
	 */
	async _onRemoveSpell (evt) {
		let extractID;
		await this._removeEmbeddedEntity(evt, (component, id) => {
			extractID = id;
			if (this.actor) {
				component.spells = component.spells.filter(spell => spell !== id);
			} else {
				component.spells = component.spells.filter(spell => spell._id !== id);
			}
		});

		if (this.actor) {
			return this.actor.deleteEmbeddedDocuments('Item', [extractID]);
		}
	}

	/**
	 * @private
	 */
	_onRemoveTable (evt) {
		return this._removeEmbeddedEntity(evt, (component, id) =>
			component.tables = component.tables.filter(table => table._id !== id));
	}

	_preventSubmit () {
		clearTimeout(this._submitTimeout);
		this._interacting = true;
	}

	async _processDrop (evt, entity = 'Item') {
		evt.preventDefault();
		let data;

		try {
			data = JSON.parse(evt.dataTransfer.getData('text/plain'));
		} catch (ignored) {}

		if (!data || data.type !== entity) {
			return [];
		}

		let item;
		if (data.pack) {
			const pack = game.packs.get(data.pack);
			if (!pack) {
				return [];
			}

			item = await pack.getDocument(data.id);
		} else {
			item = CONFIG[entity].collection.instance.get(data.id);
		}

		if (!item) {
			return [];
		}

		const dupe = ObsidianActor.duplicateItem(item, entity);
		const effects = duplicate(this.item.data._source.flags.obsidian.effects);
		const fieldset = evt.target.closest('fieldset');
		const effectDiv = fieldset.closest('.obsidian-effect');
		const effect = effects.find(e => e.uuid === effectDiv.dataset.uuid);

		if (!effect) {
			return [];
		}

		const component = effect.components.find(c => c.uuid === fieldset.dataset.uuid);
		if (!component) {
			return [];
		}

		setProperty(dupe.data._source, 'flags.obsidian.isEmbedded', true);
		setProperty(dupe.data._source, 'flags.obsidian.parentComponent', component.uuid);
		return [effects, component, dupe];
	}

	_removeEmbeddedEntity (evt, remove) {
		const effects = duplicate(this.item.data._source.flags.obsidian.effects);
		const pill = evt.currentTarget.closest('.obsidian-item-drop-pill');
		const fieldset = pill.closest('fieldset');
		const effectDiv = fieldset.closest('.obsidian-effect');
		const effect = effects.find(e => e.uuid === effectDiv.dataset.uuid);
		const component = effect.components.find(c => c.uuid === fieldset.dataset.uuid);
		remove(component, pill.dataset.id);
		return this._updateEffects(null, {'flags.obsidian.effects': effects});
	}

	/**
	 * @private
	 */
	async _render (force = false, options = {}) {
		await super._render(force, options);
		this._restoreCategoryStates();
	}

	/**
	 * @private
	 */
	_saveCategoryStates (evt) {
		const key = evt.currentTarget.closest('details').dataset.key;
		const state = game.settings.get('obsidian', 'effects-categories');
		const idx = state.indexOf(key);

		if (idx < 0) {
			state.push(key);
		} else {
			state.splice(idx, 1);
		}

		game.settings.set('obsidian', 'effects-categories', state);
	}

	/**
	 * @private
	 */
	_restoreCategoryStates () {
		this.element.find('details').prop('open', false);
		const state = game.settings.get('obsidian', 'effects-categories');
		state.forEach(key => this.element.find(`details[data-key="${key}"]`).prop('open', true));
	}

	/**
	 * @private
	 */
	_setTrayState (newState) {
		this.element.find('details').prop('open', true);
		this.element.find('summary').addClass('obsidian-hidden');
		this.element.find('.obsidian-effects-pill').addClass('obsidian-hidden');
		this.element.find('.obsidian-add-effect').removeClass('obsidian-hidden');

		if (newState === TRAY_STATES.EFFECT) {
			this.element.find('summary').removeClass('obsidian-hidden');
			this.element.find('details .obsidian-effects-pill:not(.obsidian-effects-pill-rm)')
				.removeClass('obsidian-hidden');
			this.element.find('.obsidian-rm-effect').removeClass('obsidian-hidden');
			this._restoreCategoryStates();
		} else if (newState === TRAY_STATES.COMPONENT) {
			this.element.find('.obsidian-rm-effect').removeClass('obsidian-hidden');
			const component =
				this.item.data.flags.obsidian.effects
					.flatMap(e => e.components)
					.find(c => c.uuid === this._selectedComponent);

			if (!component) {
				return;
			}

			const addons = Components[component.type].metadata.addons;
			if (!addons) {
				return;
			}

			addons.forEach(sub => {
				const addon = Components[sub].metadata.addon;
				if (component[addon] === undefined) {
					this.element.find(`.obsidian-add-${sub}`).removeClass('obsidian-hidden');
					this.element.find(`.obsidian-rm-${sub}`).addClass('obsidian-hidden');
				} else {
					this.element.find(`.obsidian-add-${sub}`).addClass('obsidian-hidden');
					this.element.find(`.obsidian-rm-${sub}`).removeClass('obsidian-hidden');
				}
			});
		}
	}

	/**
	 * @private
	 */
	async _updateObject (event, formData) {
		return this._updateEffects(event, this._formData);
	}

	async _updateEffects (event, data) {
		if (this.item.getFlag('obsidian', 'isEmbedded')
			&& this.item.options.parentItem
			&& this.item.options.parentComponent
			&& !this.actor)
		{
			const newData =
				mergeObject(this.item.data._source, expandObject(data), {inplace: false});

			const effects =
				duplicate(this.item.options.parentItem.data._source.flags.obsidian.effects);

			const component =
				effects
					.flatMap(e => e.components)
					.find(c => c.uuid === this.item.options.parentComponent);

			const idx = component.spells.findIndex(spell => spell._id === this.item.id);
			component.spells[idx] = newData;

			await this.item.options.parentItem.setFlag('obsidian', 'effects', effects);
			this.item.data.update(newData);
			this.render(false);
			return this.item;
		} else {
			return super._updateObject(event, data);
		}
	}
}
