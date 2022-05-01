import {ObsidianItemSheet} from './item-sheet.js';
import {OBSIDIAN} from '../global.js';

export class ObsidianClassSheet extends ObsidianItemSheet {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.template = 'modules/obsidian/html/sheets/class.html';
		return options;
	}

	get title () {
		return this.item.data.obsidian.label;
	}

	async close () {
		await super.close();
		Hooks.callAll('obsidian.classSheetClosed');
	}

	getData () {
		const data = super.getData();
		data.isCustom = !OBSIDIAN.Config.CLASSES.includes(this.item.identifier);
		data.identifier = this.item.identifier;

		if (this.item.isOwned) {
			data.rollData = this.item.actor.getRollData();
		}

		return data;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('[name="name"]').keyup(evt => {
			html.find('[name="data.identifier"]')
				.attr('placeholder', evt.currentTarget.value.slugify({strict: true}));
		});
	}
}
