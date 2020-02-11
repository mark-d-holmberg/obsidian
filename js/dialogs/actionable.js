import {ObsidianItems} from '../rules/items.js';
import {ObsidianStandaloneDialog} from './standalone.js';

export class ObsidianActionableDialog extends ObsidianStandaloneDialog {
	constructor (parent, actor, item) {
		super({parent: parent, actor: actor});
		this._actor = actor;
		this._item = item;
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
			ObsidianItems.roll(this._actor, evt.currentTarget.dataset);
			this.close();
		});
	}

	getData () {
		const data = super.getData();
		data.item = this._item;
		return data;
	}
}
