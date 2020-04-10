import {ActorSheet5eNPC} from '../../../../systems/dnd5e/module/actor/sheets/npc.js';

export class ObsidianNPC extends ActorSheet5eNPC {
	get template () {
		return 'modules/obsidian/html/npc.html';
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(['obsidian-window']),
			scrollY: ['.obsidian'],
			tabs: [{
				navSelector: 'ul.obsidian-tab-bar',
				contentSelector: 'form.obsidian',
				initial: 'stats'
			}]
		});

		return options;
	}

	activateListeners (html) {
		super.activateListeners(html);
		console.debug(this.actor);
	}

	_createEditor (target, editorOptions, initialContent) {
		editorOptions.content_css =
			`${CONFIG.TinyMCE.css.join(',')},modules/obsidian/css/obsidian-mce.css`;
		super._createEditor(target, editorOptions, initialContent);
	}

	_restoreScrollPositions (html, selectors) {
		const positions = this._scrollPositions || {};
		for (const sel of selectors) {
			const el = this.element.find(sel);
			if (el.length === 1) {
				el[0].scrollTop = positions[sel] || 0;
			}
		}
	}
}
