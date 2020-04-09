import {Rolls} from '../rules/rolls.js';
import {ObsidianStandaloneDialog} from './standalone.js';
import {ObsidianItems} from '../rules/items.js';
import {getSourceClass} from '../module/item.js';
import {OBSIDIAN} from '../global.js';

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
			const spells = getProperty(this._actor.data, spellKey);

			if ((spells.tmp || 0) > 0) {
				this._actor.update({[`${spellKey}.tmp`]: spells.tmp - 1});
			} else {
				this._actor.update({[`${spellKey}.value`]: Math.max(0, spells.value - 1)});
			}
		}

		if (this._item.type === 'spell') {
			// This is a bit of a hack purely to support having a limited use
			// resource on the spell itself rather than as a feature. The main
			// use case is NPCs where we don't want to have to create a whole
			// feature for each spell.

			if (this._effect) {
				const resource = this._effect.components.find(c => c.type === 'resource');
				if (resource) {
					const updates = [];
					ObsidianItems.useResource(
						this._actor, this._item, this._effect, resource, 1, {updates});

					OBSIDIAN.updateManyOwnedItems(this._actor, updates);
				}
			}

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
