import {ObsidianDialog} from './dialog.js';

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
		const rolls =
			Array.from(this.element.find('input'))
				.map(el => [Number(el.value), Number(el.name.split('.')[1].substring(1))])
				.filter(([n, _]) => n > 0);

		this.parent.actor.rollHD(rolls);
		this.close();
	}
}
