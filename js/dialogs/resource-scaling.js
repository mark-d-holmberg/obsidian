import {Effect} from '../module/effect.js';
import {ObsidianStandaloneDialog} from './standalone.js';
import {ObsidianItems} from '../rules/items.js';

export class ObsidianResourceScalingDialog extends ObsidianStandaloneDialog {
	constructor (actor, options) {
		super({parent: options.parent, actor: actor});
		this._actor = actor;
		this._options = options;
		this._item = actor.data.obsidian.itemsByID.get(options.id);
		this._effect = actor.data.obsidian.effects.get(options.uuid);
		this._resources = this._effect.components.filter(c => c.type === 'resource');
		this._consumers = this._effect.components.filter(c => c.type === 'consume');
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.template = 'modules/obsidian/html/dialogs/resource-scaling.html';
		options.width = 200;
		return options;
	}

	get title () {
		return this._effect.label;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('button').click(() => {
			this._options.consumed = Number(html.find('input').val());
			ObsidianItems.roll(this._actor, this._options);
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
					Effect.getLinkedResource(this._actor.data, this._consumers[0]);

				if (resource) {
					data.available = resource.remaining;
				}
			}
		}

		return data;
	}
}
