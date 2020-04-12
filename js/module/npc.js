import {ActorSheet5eNPC} from '../../../../systems/dnd5e/module/actor/sheets/npc.js';
import {Obsidian} from './obsidian.js';

export class ObsidianNPC extends ActorSheet5eNPC {
	constructor (...args) {
		super(...args);
		game.settings.register('obsidian', this.object.data._id, {
			default: '',
			scope: 'client',
			onChange: settings => this.settings = JSON.parse(settings)
		});

		this.settings = game.settings.get('obsidian', this.object.data._id);
		if (this.settings === '') {
			this.settings = {};
		} else {
			this.settings = JSON.parse(this.settings);
		}
	}

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

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */

	activateListeners (html) {
		super.activateListeners(html);
		console.debug(this.actor);
		html.find('[contenteditable]')
			.focusout(Obsidian.prototype._onContenteditableUnfocus.bind(this));
	}

	render (force = false, options = {}) {
		Obsidian.prototype._applySettings.apply(this);
		return super.render(force, options);
	}

	_createEditor (target, editorOptions, initialContent) {
		editorOptions.content_css =
			`${CONFIG.TinyMCE.css.join(',')},modules/obsidian/css/obsidian-mce.css`;
		super._createEditor(target, editorOptions, initialContent);
	}

	_onResize (event) {
		Obsidian.prototype._onResize.apply(this, event);
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
