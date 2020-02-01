import {ObsidianDialog} from './dialog.js';
import {Reorder} from '../module/reorder.js';

export class ObsidianViewDialog extends ObsidianDialog {
	constructor (itemID, parent, options = {}) {
		const item = parent.actor.data.obsidian.itemsByID.get(itemID);
		if (item.type === 'backpack') {
			options.width = 578;
			options.height = 600;
		}

		super(parent, options);
		this.item = item;

		if (item.type === 'backpack') {
			this._hook = Hooks.on('renderObsidian', () => {
				this.item = this.parent.actor.data.obsidian.itemsByID.get(itemID);
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
			await this.parent._onUseClicked.bind(this.parent)(evt);
			this.render(false);
		});

		html.find('[data-sheet]').click(() => {
			const Item = CONFIG.Item.entityClass;
			const item = new Item(this.item, {actor: this.parent.actor});
			item.sheet.render(true);
		});

		html.find('[data-name]').each((i, el) => el.name = el.dataset.name);
		html.find('[data-roll]').click(this.parent._onRoll.bind(this.parent));
		html.find('.obsidian-equip-action').click(this.parent._onEquip.bind(this.parent));
	}

	getData () {
		const data = super.getData();
		data.item = this.item;
		return data;
	}
}
