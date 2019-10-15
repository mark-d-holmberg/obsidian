class ObsidianViewDialog extends ObsidianDialog {
	constructor (itemID, parent, options = {}) {
		const item = parent.actor.items.find(item => item.id === itemID);
		if (item.type === 'backpack') {
			options.width = 578;
			options.register = true;
		}

		super(parent, options);
		this.item = item;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 520;
		options.modal = false;
		return options;
	}

	get sizeSelector () {
		if (this.item.type === 'backpack') {
			return {topLevel: true};
		} else {
			return false;
		}
	}

	get template () {
		return `public/modules/obsidian/html/dialogs/${this.item.type}-view.html`;
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

		html.find('.obsidian-tr').each((i, row) => {
			row.setAttribute('draggable', 'true');
			row.addEventListener('dragstart', Obsidian.Reorder.dragStart, false);
		});

		this.form.ondragover = Obsidian.Reorder.dragOver;
		this.form.ondrop = () => Obsidian.Reorder.drop(this.parent.actor, event, () => {});

		html.find('.obsidian-feature-use').click(async evt => {
			await this.parent._onUseClicked.bind(this.parent)(evt);
			this.render(false);
		});

		html.find('[data-sheet]').click(() => {
			const Item = CONFIG.Item.entityClass;
			const item = new Item(this.item, {actor: this.parent.actor});
			item.sheet.render(true);
		});

		if (this.item.type === 'backpack') {
			ObsidianDialog.recalculateHeight(html, {topLevel: true});
		}
	}

	getData () {
		const data = super.getData();
		data.item = this.item;
		return data;
	}
}
