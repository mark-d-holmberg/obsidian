Obsidian.Dialog.Save = class ObsidianSaveDialog extends Obsidian.Dialog {
	constructor (parent, saveID) {
		super(parent, {
			title: `Manage Save: ${parent.actor.data.data.abilities[saveID].label}`,
			width: 250
		});

		this.saveID = saveID;
	}

	get template () {
		return 'public/modules/obsidian/html/dialogs/save.html';
	}

	getData () {
		const data = super.getData();
		data.saveID = this.saveID;
		return data;
	}
};
