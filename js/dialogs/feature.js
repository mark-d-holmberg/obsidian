class ObsidianFeatureDialog extends ObsidianDialog {
	constructor (parent, featureID) {
		super(parent, {
			title: game.i18n.localize('OBSIDIAN.EditFeature'),
			template: 'public/modules/obsidian/html/dialogs/feature.html',
			width: 460
		});

		this.featureID = featureID;
		Hooks.once('MCEInit-feature', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form), {richText: true}));
		});
	}

	getData () {
		const data = super.getData();
		data.featureID =
			this.parent.actor.data.flags.obsidian.features.custom.findIndex(feat =>
				feat.id === this.featureID);
		data.feature = this.parent.actor.data.flags.obsidian.features.custom[data.featureID];
		return data;
	}
}
