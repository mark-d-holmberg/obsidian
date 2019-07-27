class ObsidianSaveDialog extends ObsidianDialog {
	constructor (parent, saveID) {
		super(parent, {
			title: `Manage Save: ${parent.actor.data.data.abilities[saveID].label}`,
			width: 250
		});

		this.saveID = saveID;
	}

	get template () {
		return 'public/modules/obsidian/html/save-dialog.html';
	}

	getData () {
		const data = super.getData();
		data.saveID = this.saveID;
		return data;
	}
}
