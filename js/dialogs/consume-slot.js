import {ObsidianStandaloneDialog} from './standalone.js';
import {getSourceClass} from '../module/item.js';
import {ObsidianItems} from '../rules/items.js';

export class ObsidianConsumeSlotDialog extends ObsidianStandaloneDialog {
	constructor (actor, options, min) {
		super({parent: options.parent, actor: actor});
		this._actor = actor;
		this._options = options;
		this._min = min;
		this._item = actor.data.obsidian.itemsByID.get(options.id);
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
		data.min = this._min;
		data.ritual = false;
		data.pactAllowed =
			this._actor.data.data.spells.pact
			&& this._actor.data.data.spells.pact.level >= data.min;

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
			const spells = getProperty(this._actor.data, spellKey);

			// Maybe this should be moved out into the final resolution stage
			// where other resources are consumed.
			if ((spells.tmp || 0) > 0) {
				this._actor.update({[`${spellKey}.tmp`]: spells.tmp - 1});
			} else {
				this._actor.update({[`${spellKey}.value`]: Math.max(0, spells.value - 1)});
			}
		}

		this._options.spellLevel = level;
		ObsidianItems.roll(this._actor, this._options);
		this.close();
	}
}
