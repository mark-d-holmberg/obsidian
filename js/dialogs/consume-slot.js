import {Rolls} from '../rules/rolls.js';
import {ObsidianStandaloneDialog} from './standalone.js';
import {ObsidianItems} from '../rules/items.js';

export class ObsidianConsumeSlotDialog extends ObsidianStandaloneDialog {
	constructor (parent, actor, item, effect) {
		super({parent: parent, actor: actor});
		this._actor = actor;
		this._item = item;
		this._effect = effect;
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
		data.min = this._item.type === 'spell' ? this._item.data.level : 1;
		data.ritual = this._item.type === 'spell';
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
			const prop = isPact ? 'data.spells.pact.uses' : `data.spells.spell${level}.value`;
			this._actor.update({[`${prop}`]: getProperty(this._actor.data, prop) + 1});
		}

		if (this._item.type === 'spell') {
			Rolls.create(this._actor, {roll: 'item', id: this._item._id, scaling: level});
		} else {
			ObsidianItems.rollEffect(this._actor, this._effect, level);
		}

		this.close();
	}
}
