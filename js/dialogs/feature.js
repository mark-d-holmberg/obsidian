class ObsidianFeatureDialog extends ObsidianDialog {
	constructor (parent, featureID) {
		super(parent, {
			title: game.i18n.localize('OBSIDIAN.EditFeature'),
			template: 'public/modules/obsidian/html/dialogs/feature.html'
		});

		this.featureID = parseInt(featureID);
		Hooks.once('MCEInit-feature', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form), {richText: true}));
		});
	}

	getData () {
		const data = super.getData();
		data.featureID = this.featureID;
		data.feature = this.parent.actor.data.flags.obsidian.features.custom[this.featureID];
		return data;
	}
}
