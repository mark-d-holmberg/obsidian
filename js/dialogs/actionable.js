import {ObsidianStandaloneDialog} from './standalone.js';
import {ObsidianItems} from '../rules/items.js';

export class ObsidianActionableDialog extends ObsidianStandaloneDialog {
	constructor (actor, options) {
		super({parent: options.parent, actor: actor});
		this._actor = actor;
		this._options = options;
		this._item = actor.items.get(options.id);
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.template = 'modules/obsidian/html/dialogs/actionable.html';
		options.width = 200;
		return options;
	}

	get title () {
		return this._item.name;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('button').click(evt => {
			ObsidianItems.rollActionable(
				this._actor, Number(evt.currentTarget.dataset.index), this._options);

			this.close();
		});
	}

	getData () {
		const data = super.getData();
		data.item = this._item.data;
		return data;
	}
}
