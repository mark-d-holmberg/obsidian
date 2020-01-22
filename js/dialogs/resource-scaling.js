import {ObsidianDialog} from './dialog.js';
import {Effect} from '../module/effect.js';

export class ObsidianResourceScalingDialog extends ObsidianDialog {
	constructor (parent, item, effect, spell) {
		super(parent);
		this._item = item;
		this._effect = effect;
		this._spell = spell;
		this._resources = effect.components.filter(c => c.type === 'resource');
		this._consumers = effect.components.filter(c => c.type === 'consume');
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.template = 'modules/obsidian/html/dialogs/resource-scaling.html';
		options.submitOnClose = false;
		options.submitOnUnfocus = false;
		options.closeOnSubmit = true;
		options.width = 200;
		return options;
	}

	get title () {
		return this._effect.label;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('button').click(() => {
			this.parent._onRollEffect(this._effect, Number(html.find('input').val()), this._spell);
			this.close();
		});
	}

	getData () {
		const data = super.getData();
		data.available = 0;

		if (this._resources.length) {
			data.available = this._resources[0].remaining;
		} else if (this._consumers.length) {
			if (this._consumers[0].target === 'qty') {
				data.available = this._item.data.quantity;
			} else {
				const [, , resource] =
					Effect.getLinkedResource(this.parent.actor.data, this._consumers[0]);

				if (resource) {
					data.available = resource.remaining;
				}
			}
		}

		return data;
	}
}
