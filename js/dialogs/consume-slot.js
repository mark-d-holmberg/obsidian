import {ObsidianDialog} from './dialog.js';

export class ObsidianConsumeSlotDialog extends ObsidianDialog {
	constructor (parent, effect) {
		super(parent);
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
		data.effect = this._effect;
		return data;
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onUse (evt) {
		const isPact = evt.currentTarget.dataset.level === 'pact';
		let level = Number(evt.currentTarget.dataset.level);

		if (isPact) {
			level = this.parent.actor.data.data.spells.pact.level;
		}

		const prop = isPact ? 'data.spells.pact.uses' : `data.spells.spell${level}.value`;
		this.parent.actor.update({[`${prop}`]: getProperty(this.parent.actor.data, prop) + 1});

		this.parent._onRollEffect(this._effect, level);
		this.close();
	}
}
