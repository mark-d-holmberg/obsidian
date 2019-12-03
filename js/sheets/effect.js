import {ObsidianItemSheet} from './item-sheet.js';
import {Effect} from '../module/effect.js';

export class ObsidianEffectSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		this._addedClickHandler = false;
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
		html.find('.obsidian-rm-effect').click(this._onRemoveEffect.bind(this));
		html.find('.obsidian-effect').click(evt =>
			this._onEffectSelected(evt.currentTarget.dataset.uuid));

		if (!this._addedClickHandler) {
			document.addEventListener('click', this._onClickAnywhere.bind(this));
			this._addedClickHandler = true;
		}

		if (this._selectedEffect != null) {
			this._onEffectSelected(this._selectedEffect);
		}
	}

	/**
	 * @private
	 */
	_onAddEffect () {
		let effects = this.item.data.flags.obsidian.effects;
		if (!effects) {
			effects = [];
		}

		effects.push(Effect.create());
		this.item.update({'flags.obsidian.effects': effects});
	}

	/**
	 * @private
	 */
	_onClickAnywhere (evt) {
		const closest = evt.target.closest('.obsidian-effect');
		if (closest == null) {
			this._selectedEffect = null;
			$('.obsidian-effect').removeClass('obsidian-selected');
			$('.obsidian-rm-effect').addClass('obsidian-hidden');
		}
	}

	/**
	 * @private
	 */
	_onEffectSelected (uuid) {
		this._selectedEffect = uuid;
		$('.obsidian-effect').removeClass('obsidian-selected');
		$(`[data-uuid="${uuid}"]`).addClass('obsidian-selected');
		$('.obsidian-rm-effect').removeClass('obsidian-hidden');
	}

	/**
	 * @private
	 */
	_onRemoveEffect () {
		if (this._selectedEffect == null) {
			return;
		}

		const effects = this.item.data.flags.obsidian.effects;
		if (!effects) {
			return;
		}

		const idx = effects.findIndex(effect => effect.uuid === this._selectedEffect);
		if (idx < 0) {
			return;
		}

		effects.splice(idx, 1);
		this.item.update({'flags.obsidian.effects': effects});
	}
}
