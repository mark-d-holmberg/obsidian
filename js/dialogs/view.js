class ObsidianViewDialog extends ObsidianDialog {
	constructor (itemID, parent, options) {
		super(parent, options);
		this.item = parent.actor.items.find(item => item.id === itemID);
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 520;
		options.modal = false;
		return options;
	}

	get template () {
		if (this.item.type === 'weapon') {
			return 'public/modules/obsidian/html/dialogs/weapon-view.html';
		} else if (this.item.type === 'spell') {
			return 'public/modules/obsidian/html/dialogs/spell-view.html';
		}
	}

	get title () {
		return this.item.name;
	}

	getData () {
		const data = super.getData();
		data.item = this.item;
		return data;
	}
}
