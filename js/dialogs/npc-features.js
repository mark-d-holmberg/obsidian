import {ObsidianDialog} from './dialog.js';

export class ObsidianNPCFeaturesDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 400;
		options.title = game.i18n.localize('OBSIDIAN.ManageFeatures');
		options.template = 'modules/obsidian/html/dialogs/npc-features.html';
		options.submitOnClose = true;
		options.submitOnChange = true;
		options.closeOnSubmit = false;
		return options;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('button').click(this._onAddFeature.bind(this));
	}

	async _onAddFeature () {
		const selection = this.element.find('select').val();
		const created = await this.parent.actor.createEmbeddedDocuments('Item', [{
			name: game.i18n.localize('OBSIDIAN.NewFeature'),
			type: 'feat',
			data: {activation: {type: selection}}
		}]);

		const item = created.shift();
		item.sheet.render(true);
		this.close();
	}
}
