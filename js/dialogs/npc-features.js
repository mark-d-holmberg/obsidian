import {ObsidianDialog} from './dialog.js';

export class ObsidianNPCFeaturesDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 400;
		options.title = game.i18n.localize('OBSIDIAN.ManageFeatures');
		options.template = 'modules/obsidian/html/dialogs/npc-features.html';
		options.submitOnClose = false;
		options.submitOnChange = false;
		options.closeOnSubmit = true;
		return options;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('button').click(this._onSubmit.bind(this));
	}

	async _onSubmit (event, {updateData = null, preventClose = false, preventRender = false} = {}) {
		const selection = this.element.find('select').val();
		const item = await this.parent.actor.createEmbeddedEntity('OwnedItem', {
			name: game.i18n.localize('OBSIDIAN.NewFeature'),
			type: 'feat',
			data: {activation: {type: selection}}
		});

		Item.createOwned(item, this.parent.actor).sheet.render(true);
		this.close();
	}
}
