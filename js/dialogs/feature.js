class ObsidianFeatureDialog extends ObsidianDialog {
	constructor (parent, featureID) {
		super(parent, {
			title: game.i18n.localize('OBSIDIAN.EditFeature'),
			template: 'public/modules/obsidian/html/dialogs/feature.html',
			width: 460
		});

		this.featureID = parseInt(featureID);
		this.feature = this.parent.actor.getOwnedItem(this.featureID);

		Hooks.once('MCEInit-feature', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form), {richText: true}));
		});
	}

	getData () {
		const data = super.getData();
		data.featureID = this.featureID;
		data.feature = this.feature.data;
		return data;
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		this.feature.update(formData);
	}
}
