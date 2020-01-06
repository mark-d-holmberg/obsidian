import {ObsidianDialog} from './dialog.js';

export class ObsidianActionableDialog extends ObsidianDialog {
	constructor (parent, item) {
		super(parent);
		this._item = item;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.template = 'modules/obsidian/html/dialogs/actionable.html';
		options.submitOnClose = false;
		options.submitOnUnfocus = false;
		options.closeOnSubmit = true;
		options.width = 200;
		return options;
	}

	get title () {
		return this._item.name;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('button').click(evt => {
			this.parent._onRoll(evt);
			this.close();
		});
	}

	getData () {
		const data = super.getData();
		data.item = this._item;
		return data;
	}
}
