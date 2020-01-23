import {ObsidianItemSheet} from './item-sheet.js';
import {Effect} from '../module/effect.js';
import {OBSIDIAN} from '../rules/rules.js';
import {Schema} from '../module/schema.js';
import {ObsidianCurrencyDialog} from '../dialogs/currency.js';

const effectSelectMenu =
	'.obsidian-rm-effect, .obsidian-add-resource, .obsidian-add-attack, .obsidian-add-damage,'
	+ ' .obsidian-add-save, .obsidian-add-scaling, .obsidian-add-targets, .obsidian-add-consume,'
	+ ' .obsidian-add-spells, .obsidian-roll-modifier';

const subMenus = {rollMod: 'roll-modifier'};
const componentMenus = {attack: ['rollMod'], damage: ['rollMod']};

export class ObsidianEffectSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		this._addedClickHandler = false;
		this._anywhereClickHandler = evt => this._onClickAnywhere(evt);
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
		html.find('.obsidian-add-effect').click(this._onAddEffect.bind(this));
		html.find('.obsidian-add-resource')
			.click(this._onAddComponent.bind(this, Effect.newResource));
		html.find('.obsidian-add-attack').click(this._onAddComponent.bind(this, Effect.newAttack));
		html.find('.obsidian-add-damage').click(this._onAddComponent.bind(this, Effect.newDamage));
		html.find('.obsidian-add-save').click(this._onAddComponent.bind(this, Effect.newSave));
		html.find('.obsidian-add-scaling').click(this._onAddComponent.bind(this, Effect.newScaling));
		html.find('.obsidian-add-targets').click(this._onAddComponent.bind(this, Effect.newTarget));
		html.find('.obsidian-add-consume').click(this._onAddComponent.bind(this, Effect.newConsume));
		html.find('.obsidian-add-spells').click(this._onAddComponent.bind(this, Effect.newSpells));
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
		html.find('.obsidian-item-drop').on('dragover', evt => evt.preventDefault());
		html.find('.obsidian-item-drop').each((i, el) => el.ondrop = this._onDropSpell.bind(this));
		html.find('.obsidian-item-drop-pill-rm').click(this._onRemoveSpell.bind(this));
		html.find('.obsidian-item-drop-pill-body').click(this._onEditSpell.bind(this));

		if (!this._addedClickHandler) {
			document.addEventListener('click', this._anywhereClickHandler);
			this._addedClickHandler = true;
		}

		if (this._selectedEffect != null) {
			this._onEffectSelected(this._selectedEffect);
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
				.filter(c => c.type === 'consume')
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
	_onClickAnywhere (evt) {
		const closestEffect = evt.target.closest('.obsidian-effect');
		const closestTab = evt.target.closest('.obsidian-effects-tab');

		if (closestEffect == null
			&& (closestTab == null || $(closestTab).hasClass('obsidian-rm-effect')))
		{
			this._selectedEffect = null;
			this._selectedComponent = null;
			this.element.find('.obsidian-effect, .obsidian-effect fieldset')
				.removeClass('obsidian-selected');
			this.element.find(effectSelectMenu).addClass('obsidian-hidden');
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
		this.element.find(effectSelectMenu).addClass('obsidian-hidden');
		this.element.find('.obsidian-rm-effect').removeClass('obsidian-hidden');

		const component =
			this.item.data.flags.obsidian.effects
				.flatMap(e => e.components)
				.find(c => c.uuid === uuid);

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
			component.spells.push(
				(await this.actor.createEmbeddedEntity('OwnedItem', item.data))._id);
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
		this.element.find(effectSelectMenu).removeClass('obsidian-hidden');
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

		if (this._selectedEffect != null) {
			const idx = effects.findIndex(effect => effect.uuid === this._selectedEffect);
			if (idx < 0) {
				return;
			}

			effects.splice(idx, 1);
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
				effect.components.splice(idx, 1);
			}
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
