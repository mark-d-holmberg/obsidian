import {ObsidianDialog} from './dialog.js';

export class ObsidianVehicleActionsDialog extends ObsidianDialog {
	static get defaultOptions () {
		return mergeObject(super.defaultOptions, {
			width: 300,
			title: game.i18n.localize('OBSIDIAN.ManageActions'),
			template: 'modules/obsidian/html/dialogs/vehicle-actions.html',
			submitOnClose: true,
			submitOnChange: true,
			closeOnSubmit: false
		});
	}

	async getData () {
		const data = await this.parent.getData();
		data.actions = Math.abs(this.object.data.data.attributes.actions.max ?? 0);
		return data;
	}

	async _render (force, options) {
		await super._render(force, options);
		ObsidianDialog.recalculateHeight($(this.form));
	}

	async _updateObject (event, formData) {
		const update = await super._updateObject(event, formData);
		this.render(true);
		return update;
	}
}
