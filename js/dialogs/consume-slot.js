import {Rolls} from '../rules/rolls.js';
import {ObsidianStandaloneDialog} from './standalone.js';
import {ObsidianItems} from '../rules/items.js';
import {getSourceClass} from '../module/item.js';

export class ObsidianConsumeSlotDialog extends ObsidianStandaloneDialog {
	constructor (parent, actor, item, effect, min) {
		super({parent: parent, actor: actor});
		this._actor = actor;
		this._item = item;
		this._effect = effect;
		this._min = min;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 125;
		options.title = game.i18n.localize('OBSIDIAN.CastAtWhichLevel');
		options.template = 'modules/obsidian/html/dialogs/consume-slot.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.rollable').click(this._onUse.bind(this));
	}

	getData () {
		const data = super.getData();
		data.min = this._min ? this._min : this._item.type === 'spell' ? this._item.data.level : 1;
		data.ritual = false;
		data.pactAllowed =
			!this._actor.data.data.spells.pact
			|| this._actor.data.data.spells.pact.level >= data.min;

		if (this._item.type === 'spell' && getProperty(this._item, 'flags.obsidian.source')) {
			const cls = getSourceClass(this._actor.data, this._item.flags.obsidian.source);
			data.ritual = cls && getProperty(cls, 'flags.obsidian.spellcasting.rituals') !== 'none';
		}

		return data;
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onUse (evt) {
		const isRitual = evt.currentTarget.dataset.level === 'ritual';
		const isPact = evt.currentTarget.dataset.level === 'pact';
		let level = Number(evt.currentTarget.dataset.level);

		if (isPact) {
			level = this._actor.data.data.spells.pact.level;
		} else if (isRitual && this._item.type === 'spell') {
			level = this._item.data.level;
		}

		if (!isRitual) {
			const spellKey = isPact ? 'data.spells.pact' : `data.spells.spell${level}`;
			const usesKey = isPact ? 'uses' : 'value';
			const spells = getProperty(this._actor.data, spellKey);

			if ((spells.tmp || 0) > 0) {
				this._actor.update({[`${spellKey}.tmp`]: spells.tmp - 1});
			} else {
				this._actor.update({[`${spellKey}.${usesKey}`]: spells[usesKey] + 1});
			}
		}

		if (this._item.type === 'spell') {
			Rolls.create(this._actor, {
				roll: 'item',
				id: this._item._id,
				scaling: level - this._item.data.level
			});
		} else {
			ObsidianItems.rollEffect(this._actor, this._effect, {consumed: level});
		}

		this.close();
	}
}
