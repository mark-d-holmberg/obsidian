import {ObsidianDialog} from './dialog.js';
import {Reorder} from '../module/reorder.js';
import {Sheet} from '../module/sheet.js';
import {ObsidianItems} from '../rules/items.js';

export class ObsidianViewDialog extends ObsidianDialog {
	constructor (itemID, parent, options = {}) {
		const item = parent.actor.items.get(itemID);
		if (item.type === 'backpack') {
			options.width = 578;
			options.height = 600;
		}

		super(parent, options);
		this.item = item;

		if (item.type === 'backpack') {
			const hook = `renderObsidian${parent.actor.data.type === 'npc' ? 'NPC' : ''}`;
			this._hook = Hooks.on(hook, () => {
				this.item = this.parent.actor.items.get(itemID);
				this.render(false)
			});
		}
	}

	async close () {
		if (this._hook) {
			Hooks.off('renderObsidian', this._hook);
		}
		return super.close();
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 520;
		options.modal = false;
		return options;
	}

	get template () {
		return `modules/obsidian/html/dialogs/${this.item.type}-view.html`;
	}

	get title () {
		return this.item.name;
	}

	/**
	 * @param {JQuery} html
	 * @returns undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);

		html.on('dragend', () => {
			if (this.element) {
				this.element.find('.obsidian-drag-indicator').css('display', 'none');
			}
		});

		html.find('[draggable]').each((i, row) =>
			row.addEventListener('dragstart', Reorder.dragStart, false));

		this.form.ondragover = Reorder.dragOver;
		this.form.ondrop = () => Reorder.drop(this.parent.actor, event);

		html.find('.obsidian-feature-use').click(async evt => {
			await Sheet.onUseClicked(this.parent, evt);
			this.render(false);
		});

		html.find('[data-sheet]').click(() => {
			const Item = CONFIG.Item.documentClass;
			const item = new Item(this.item, {actor: this.parent.actor});
			item.sheet.render(true);
		});

		Sheet.contextMenu(this.parent, html);
		html.find('[data-name]').each((i, el) => el.name = el.dataset.name);
		html.find('.obsidian-equip-action').click(evt => Sheet.onEquip(this.parent, evt));
		html.find('.obsidian-attune').click(evt => Sheet.onAttune(this.parent, evt));
		html.find('[data-roll]')
			.click(evt => ObsidianItems.roll(this.parent.actor, evt.currentTarget.dataset));
	}

	getData () {
		const data = super.getData();
		data.item = this.item;
		return data;
	}
}
