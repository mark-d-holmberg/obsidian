import {ObsidianDialog} from './dialog.js';
import {Rolls} from '../rules/rolls.js';

export class ObsidianRollHDDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.submitOnClose = false;
		options.submitOnChange = false;
		options.width = 150;
		options.title = game.i18n.localize('OBSIDIAN.RollHD');
		options.template = 'modules/obsidian/html/dialogs/roll-hd.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('button').click(this._onRoll.bind(this));
	}

	/**
	 * @private
	 */
	_onRoll () {
		let totalDice = 0;
		const rolls =
			Array.from(this.element.find('input'))
				.map(el => {
					const n = Number(el.value);
					totalDice += n;
					return [n, Number(el.name.split('.')[1].substring(1))];
				}).filter(([n, _]) => n > 0);

		const conBonus = this.parent.actor.data.data.abilities.con.mod * totalDice;
		const results = Rolls.hd(this.parent.actor, rolls, conBonus);
		const total = results.reduce((acc, die) => acc + die.total, 0);
		const hp = this.parent.actor.data.data.attributes.hp;
		const hd = duplicate(this.parent.actor.data.flags.obsidian.attributes.hd);

		let newHP = hp.value + total + conBonus;
		if (newHP > hp.max) {
			newHP = hp.max;
		}

		rolls.forEach(([n, d]) => {
			const obj = hd[`d${d}`];
			obj.value -= n;

			if (obj.value < 0) {
				obj.value = 0;
			}
		});

		this.parent.actor.update({
			'data.attributes.hp.value': newHP,
			'flags.obsidian.attributes.hd': hd
		});

		this.close();
	}
}
