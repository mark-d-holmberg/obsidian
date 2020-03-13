import {ObsidianItemSheet} from './item-sheet.js';
import {Effect} from '../module/effect.js';
import {OBSIDIAN} from '../global.js';
import {Schema} from '../module/schema.js';
import {ObsidianCurrencyDialog} from '../dialogs/currency.js';

const subMenus = {rollMod: 'roll-modifier'};
const componentMenus = {attack: ['rollMod'], damage: ['rollMod']};
const TRAY_STATES = Object.freeze({START: 1, EFFECT: 2, COMPONENT: 3});
const COMPONENT_MAP = {
	'add-resource': Effect.newResource,
	'add-attack': Effect.newAttack,
	'add-damage': Effect.newDamage,
	'add-save': Effect.newSave,
	'add-scaling': Effect.newScaling,
	'add-targets': Effect.newTarget,
	'add-consume': Effect.newConsume,
	'add-produce': Effect.newProduce,
	'add-spells': Effect.newSpells,
	'add-bonus': Effect.newBonus,
	'add-filter': Effect.newFilter,
	'add-duration': Effect.newDuration
};

export class ObsidianEffectSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
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
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		Object.entries(COMPONENT_MAP).forEach(([cls, fn]) =>
			html.find(`.obsidian-${cls}`).click(this._onAddComponent.bind(this, fn)));

		html.find('.obsidian-add-effect').click(this._onAddEffect.bind(this));
		html.find('.obsidian-roll-modifier')
			.click(this._onAddComponent.bind(this, Effect.newRollMod, 'rollMod'));
		html.find('.obsidian-rm-effect').click(this._onRemoveSelected.bind(this));
		html.find('.obsidian-rm-roll-modifier').click(this._onRemoveSelected.bind(this, 'rollMod'));
		html.find('.obsidian-effect').click(evt =>
			this._onEffectSelected(evt.currentTarget.dataset.uuid));
		html.find('.obsidian-effect legend').click(evt => {
			evt.stopPropagation();
			this._onComponentSelected(evt.currentTarget.parentNode.dataset.uuid);
		});

		html.find('.fancy-checkbox').click(this._onCheckBoxClicked.bind(this));
		html.find('.obsidian-add-remove').keypress(ObsidianCurrencyDialog.onAddRemove);
		html.find('.obsidian-spell-drop').on('dragover', evt => evt.preventDefault());
		html.find('.obsidian-spell-drop').each((i, el) => el.ondrop = this._onDropSpell.bind(this));
		html.find('.obsidian-rm-provide-spell').click(this._onRemoveSpell.bind(this));
		html.find('.obsidian-provide-spell-body').click(this._onEditSpell.bind(this));
		html.find('.obsidian-add-filter-collection').click(this._onAddToFilterCollection.bind(this));
		html.find('.obsidian-rm-filter-collection').click(this._onRemoveFromFilterCollection.bind(this));
		html.find('summary').click(this._saveCategoryStates.bind(this));

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

	getData () {
		const data = super.getData();
		data.equipTypes = Schema.EquipTypes;
		data.spellLists = Object.keys(OBSIDIAN.Data.SPELLS_BY_CLASS);

		if (data.actor && data.item.flags && data.item.flags.obsidian
			&& data.item.flags.obsidian.effects)
		{
			const hasResource = item =>
				item.flags && item.flags.obsidian && item.flags.obsidian.effects
				&& item.flags.obsidian.effects.some(e =>
					e.components.some(c => c.type === 'resource'));

			data.itemsWithResources =
				data.actor.data.items
					.filter(item =>
						!['class', 'spell', 'feat'].includes(item.type) && hasResource(item));

			data.featsWithResources =
				data.actor.data.items.filter(item => item.type === 'feat' && hasResource(item));

			data.item.flags.obsidian.effects
				.flatMap(e => e.components)
				.filter(c => c.type === 'consume' || c.type === 'produce')
				.forEach(component => {
					const item =
						data.actor.data.obsidian.itemsByID.get(
							component.target === 'feat' ? component.featID : component.itemID);

					if (item) {
						component.itemResourceComponents =
							item.flags.obsidian.effects
								.flatMap(e => e.components)
								.filter(c => c.type === 'resource');
					}
				});

			data.item.flags.obsidian.effects
				.flatMap(e => e.components)
				.filter(c => c.type === 'filter')
				.forEach(component => {
					component.isMulti = Effect.determineMulti(component);
					component.isCollection = component.isMulti && component.multi === 'some';
					component.availableSelections = this._generateFilterSelections(component);
				});

			if (this.actor) {
				data.item.flags.obsidian.effects
					.flatMap(e => e.components)
					.filter(c => c.type === 'spells')
					.forEach(component =>
						component.spells = component.spells.map(id =>
							this.actor.data.obsidian.itemsByID.get(id)));
			}
		}

		return data;
	}

	/**
	 * @private
	 */
	_createEditor (target, editorOptions, initialContent) {
		editorOptions.content_css =
			`${CONFIG.TinyMCE.css.join(',')},modules/obsidian/css/obsidian-mce.css`;
		TextEditor.create(editorOptions, initialContent)
			.then(mce => mce[0].on('change', () => this.editors[target].changed = true));
	}

	get _formData () {
		const formData = super._formData;
		const expanded = OBSIDIAN.updateArrays(this.item.data, formData);

		if (Object.keys(expanded).length > 0) {
			return expanded;
		}

		return formData;
	}

	/**
	 * @private
	 */
	_generateFilterSelections (component) {
		let rule;
		let i18n;
		const selections = {};

		if (component.filter === 'score') {
			if (component.score === 'ability') {
				rule = OBSIDIAN.Rules.ABILITIES;
				i18n = 'OBSIDIAN.Ability';
			} else if (component.score === 'speed') {
				rule = OBSIDIAN.Rules.SPEEDS;
				i18n = 'OBSIDIAN.Speed';
			} else if (component.score === 'passive') {
				rule = OBSIDIAN.Rules.SKILLS;
				i18n = 'OBSIDIAN.Skill';
			} else if (component.score === 'dc') {
				rule = OBSIDIAN.Rules.EFFECT_ABILITIES;
				i18n = 'OBSIDIAN.Ability';
			}
		} else {
			if (component.roll === 'attack') {
				rule = OBSIDIAN.Rules.EFFECT_FILTER_ATTACKS;
				i18n = 'OBSIDIAN.Attack';
			} else if (component.roll === 'check') {
				if (component.check === 'ability') {
					rule = OBSIDIAN.Rules.ABILITIES;
					i18n = 'OBSIDIAN.Ability';
				} else if (component.check === 'skill') {
					rule = OBSIDIAN.Rules.SKILLS;
					i18n = 'OBSIDIAN.Skill';
				}
			} else if (component.roll === 'save') {
				rule = OBSIDIAN.Rules.EFFECT_FILTER_SAVES;
				i18n = 'OBSIDIAN.Ability';
			} else if (component.roll === 'damage') {
				if (component.dmg === 'damage') {
					rule = OBSIDIAN.Rules.EFFECT_DAMAGE_TYPES;
					i18n = 'OBSIDIAN.Damage';
				} else if (component.dmg === 'attack') {
					rule = OBSIDIAN.Rules.EFFECT_FILTER_ATTACKS;
					i18n = 'OBSIDIAN.Attack';
				}
			}
		}

		if (rule && i18n) {
			rule.forEach(k => selections[k] = game.i18n.localize(`${i18n}-${k}`));
		}

		if (this.actor
			&& getProperty(this.actor, 'data.flags.obsidian.skills.custom.length')
			&& ((component.filter === 'score' && component.score === 'passive')
				|| (component.filter === 'roll'
					&& component.roll === 'check'
					&& component.check === 'skill')))
		{
			this.actor.data.flags.obsidian.skills.custom.forEach((v, i) =>
				selections[`custom.${i}`] = v.label);
		}

		if (this.actor
			&& getProperty(this.actor, 'data.flags.obsidian.skills.tools.length')
			&& component.filter === 'roll'
			&& component.roll === 'check'
			&& component.check === 'tool')
		{
			this.actor.data.flags.obsidian.skills.tools.forEach((v, i) =>
				selections[`tools.${i}`] = v.label);
		}

		return selections;
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
		this.item.update(formData);
	}

	/**
	 * @private
	 */
	async _onAddComponent (generator, prop) {
		if (this._selectedEffect == null && this._selectedComponent == null) {
			return;
		}

		const formData = this._formData;
		const effects = formData['flags.obsidian.effects'];
		const effect = effects.find(effect => effect.uuid === this._selectedEffect);

		if (effect) {
			effect.components.push(generator());
		} else {
			const component =
				effects.flatMap(e => e.components).find(c => c.uuid === this._selectedComponent);

			if (component) {
				component[prop] = generator();
			} else {
				return;
			}
		}

		this.item.update(formData);
	}

	/**
	 * @private
	 */
	_onAddToFilterCollection (evt) {
		const uuid = evt.currentTarget.closest('fieldset').dataset.uuid;
		const target = $(evt.currentTarget);
		const selection = target.next();
		const formData = this._formData;
		const effects = formData['flags.obsidian.effects'];

		if (!effects) {
			return;
		}

		const component = effects.flatMap(e => e.components).find(c => c.uuid === uuid);
		if (!component) {
			return;
		}

		component.collection.push({
			key: selection.val(),
			label: selection.find('option:selected').text()
		});

		this.item.update(formData);
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

		const range = this.element.find('.obsidian-range-row');
		if (!range.length) {
			return;
		}

		const thrown = this.element.find('input[name="flags.obsidian.tags.thrown"]');
		if (thrown.length && thrown.prop('checked')) {
			range.removeClass('obsidian-hidden');
		} else if (this.item.data.flags.obsidian.type !== 'ranged') {
			range.addClass('obsidian-hidden');
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
	async _onDropSpell (evt) {
		evt.preventDefault();
		let data;

		try {
			data = JSON.parse(evt.dataTransfer.getData('text/plain'));
		} catch (ignored) {}

		if (!data || !data.pack) {
			return false;
		}

		const pack = game.packs.find(pack => pack.collection === data.pack);
		if (!pack) {
			return false;
		}

		const item = await pack.getEntity(data.id);
		if (!item || item.type !== 'spell') {
			return false;
		}

		const effects = duplicate(this.item.data.flags.obsidian.effects);
		const fieldset = evt.target.closest('fieldset');
		const effectDiv = fieldset.closest('.obsidian-effect');
		const effect = effects.find(e => e.uuid === effectDiv.dataset.uuid);

		if (!effect) {
			return false;
		}

		const component = effect.components.find(c => c.uuid === fieldset.dataset.uuid);
		if (!component) {
			return false;
		}

		if (!item.data.flags) {
			item.data.flags = {};
		}

		if (!item.data.flags.obsidian) {
			item.data.flags.obsidian = {};
		}

		item.data.flags.obsidian.isEmbedded = true;
		item.data.flags.obsidian.parentComponent = component.uuid;
		item.data.flags.obsidian.source = {
			type: 'item',
			item: this.item.data._id,
			display: this.item.data.name
		};

		if (this.actor) {
			const created = await this.actor.createEmbeddedEntity('OwnedItem', item.data);
			if (this.actor.isToken) {
				// For some reason, if this is a token, we get the entire token
				// back from createEmbeddedEntity instead of the actual entity
				// we tried to create. Instead we assume the last item in the
				// items array is what was just created. This might be a race
				// condition but also perhaps not because of how the event loop
				// works.
				component.spells.push(created.actorData.items.last()._id);
			} else {
				component.spells.push(created._id);
			}
		} else {
			component.spells.push(item.data);
		}

		this.item.update({'flags.obsidian.effects': effects});
	}

	/**
	 * @private
	 */
	_onEditSpell (evt) {
		if (this.actor) {
			const item =
				this.actor.items.find(item =>
					item.id === evt.currentTarget.closest('.obsidian-item-drop-pill').dataset.id);

			if (!item) {
				return;
			}

			item.sheet.render(true);
		} else {
			const pill = evt.currentTarget.closest('.obsidian-item-drop-pill');
			const fieldset = pill.closest('fieldset');
			const component =
				this.item.data.flags.obsidian.effects
					.flatMap(e => e.components)
					.find(c => c.uuid === fieldset.dataset.uuid);

			if (!component) {
				return;
			}

			const spell = component.spells.find(spell => spell._id === pill.dataset.id);
			if (!spell) {
				return;
			}

			const item = new CONFIG.Item.entityClass(spell, {
				parentComponent: component.uuid,
				parentItem: this.item
			});

			item.sheet.render(true);
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
	_onRemoveFromFilterCollection (evt) {
		const uuid = evt.currentTarget.closest('fieldset').dataset.uuid;
		const key = evt.currentTarget.closest('.obsidian-item-drop-pill').dataset.key;
		const formData = this._formData;
		const effects = formData['flags.obsidian.effects'];

		if (!effects) {
			return;
		}

		const component = effects.flatMap(e => e.components).find(c => c.uuid === uuid);
		if (!component) {
			return;
		}

		const idx = component.collection.findIndex(element => element.key === key);
		component.collection.splice(idx, 1);
		this.item.update(formData);
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
			await this.actor.deleteManyEmbeddedEntities('OwnedItem', orphanedSpells);
		}

		this.item.update(formData);
	}

	/**
	 * @private
	 */
	async _onRemoveSpell (evt) {
		const effects = duplicate(this.item.data.flags.obsidian.effects);
		const pill = evt.currentTarget.closest('.obsidian-item-drop-pill');
		const fieldset = pill.closest('fieldset');
		const effectDiv = fieldset.closest('.obsidian-effect');
		const effect = effects.find(e => e.uuid === effectDiv.dataset.uuid);
		const component = effect.components.find(c => c.uuid === fieldset.dataset.uuid);

		if (this.actor) {
			component.spells = component.spells.filter(spell => spell !== pill.dataset.id);
		} else {
			component.spells = component.spells.filter(spell => spell._id !== pill.dataset.id);
		}

		await this.item.update({'flags.obsidian.effects': effects});

		if (this.actor) {
			this.actor.deleteEmbeddedEntity('OwnedItem', pill.dataset.id);
		}
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
			this.element.find('.obsidian-effects-pill:not(.obsidian-effects-pill-rm)')
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

			const menu = componentMenus[component.type];
			if (!menu) {
				return;
			}

			menu.forEach(prop => {
				const css = subMenus[prop];
				if (!css) {
					return;
				}

				if (component[prop] === undefined) {
					this.element.find(`.obsidian-${css}`).removeClass('obsidian-hidden');
					this.element.find(`.obsidian-rm-${css}`).addClass('obsidian-hidden');
				} else {
					this.element.find(`.obsidian-${css}`).addClass('obsidian-hidden');
					this.element.find(`.obsidian-rm-${css}`).removeClass('obsidian-hidden');
				}
			});
		}
	}

	/**
	 * @private
	 */
	async _updateObject (event, formData) {
		if (getProperty(this.item, 'data.flags.obsidian.isEmbedded')
			&& this.item.options.parentItem
			&& this.item.options.parentComponent
			&& !this.actor)
		{
			const newData =
				mergeObject(
					this.item.data,
					expandObject(OBSIDIAN.updateArrays(this.item.data, formData)),
					{inplace: false});

			const effects = duplicate(this.item.options.parentItem.data.flags.obsidian.effects);
			const component =
				effects
					.flatMap(e => e.components)
					.find(c => c.uuid === this.item.options.parentComponent);

			const idx = component.spells.findIndex(spell => spell._id === this.item.data._id);
			component.spells[idx] = newData;

			await this.item.options.parentItem.update({'flags.obsidian.effects': effects});
			this.item.data = newData;
			this.render(false);
		} else {
			super._updateObject(event, formData);
		}
	}
}
