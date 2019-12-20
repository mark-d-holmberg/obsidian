import {ObsidianItemSheet} from './item-sheet.js';
import {Effect} from '../module/effect.js';
import {OBSIDIAN} from '../rules/rules.js';
import {Schema} from '../module/schema.js';
import {ObsidianCurrencyDialog} from '../dialogs/currency.js';

const effectSelectMenu =
	'.obsidian-rm-effect, .obsidian-add-resource, .obsidian-add-attack, .obsidian-add-damage,'
	+ ' .obsidian-add-save, .obsidian-add-scaling, .obsidian-add-targets';

export class ObsidianEffectSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		this._addedClickHandler = false;
		this._anywhereClickHandler = evt => this._onClickAnywhere(evt);
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.classes.push('obsidian-2-pane-window');
		options.width = 1024;
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
		html.find('.obsidian-rm-effect').click(this._onRemoveSelected.bind(this));
		html.find('.obsidian-effect').click(evt =>
			this._onEffectSelected(evt.currentTarget.dataset.uuid));
		html.find('.obsidian-effect legend').click(evt => {
			evt.stopPropagation();
			this._onComponentSelected(evt.currentTarget.parentNode.dataset.uuid);
		});

		html.find('.fancy-checkbox').click(this._onCheckBoxClicked.bind(this));
		html.find('.obsidian-add-remove').keypress(ObsidianCurrencyDialog.onAddRemove);

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
		return data;
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
	async _onAddComponent (generator) {
		if (this._selectedEffect == null) {
			return;
		}

		const formData = this._formData;
		const effects = formData['flags.obsidian.effects'];
		const effect = effects.find(effect => effect.uuid === this._selectedEffect);

		if (!effect) {
			return;
		}

		effect.components.push(generator());
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
		$('.obsidian-effect, .obsidian-effect fieldset').removeClass('obsidian-selected');
		$(`[data-uuid="${uuid}"]`).addClass('obsidian-selected');
		$(effectSelectMenu).addClass('obsidian-hidden');
		$('.obsidian-rm-effect').removeClass('obsidian-hidden');
	}

	/**
	 * @private
	 */
	_onEffectSelected (uuid) {
		this._selectedEffect = uuid;
		this._selectedComponent = null;
		$('.obsidian-effect, .obsidian-effect fieldset').removeClass('obsidian-selected');
		$(`[data-uuid="${uuid}"]`).addClass('obsidian-selected');
		$(effectSelectMenu).removeClass('obsidian-hidden');
	}

	/**
	 * @private
	 */
	async _onRemoveSelected () {
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
			const effectUUID = $(`[data-uuid="${this._selectedComponent}"]`).parent().data('uuid');
			const effect = effects.find(effect => effect.uuid === effectUUID);

			if (!effect) {
				return;
			}

			const idx = effect.components.findIndex(component =>
				component.uuid === this._selectedComponent);

			if (idx < 0) {
				return;
			}

			effect.components.splice(idx, 1);
		}

		this.item.update(formData);
	}
}
