import {ActorSheet5eNPC} from '../../../../systems/dnd5e/module/actor/sheets/npc.js';
import {Obsidian} from './obsidian.js';
import {ObsidianNPCDetailsDialog} from '../dialogs/npc-details.js';
import {OBSIDIAN} from '../global.js';

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
		html.find('.obsidian-char-header-minor').click(this._editDetails.bind(this));
		html.find('.obsidian-npc-hp-formula').click(this._enterHPFormula.bind(this));
		html.find('[contenteditable]')
			.focusout(Obsidian.prototype._onContenteditableUnfocus.bind(this));

		Obsidian.prototype._activateDialogs.apply(this, arguments);
	}

	getData () {
		const data = super.getData();
		data.ObsidianRules = OBSIDIAN.Rules;
		return data;
	}

	render (force = false, options = {}) {
		Obsidian.prototype._applySettings.apply(this);
		return super.render(force, options);
	}

	setModal () {
		Obsidian.prototype.setModal.apply(this, arguments);
	}

	_calculateEditorHeight () {
		const windowHeight = this.element.find('.window-content').outerHeight(true);
		const tabBarHeight = this.element.find('.obsidian-tab-bar').outerHeight(true);
		const topSectionHeight = this.element.find('[data-tab="desc"] section').outerHeight(true);
		const padding = parseInt($(this.form).css('padding-top'));
		const headerHeight =
			this.element.find('[data-tab="desc"] section:last-child h3').outerHeight(true);

		return windowHeight - tabBarHeight - topSectionHeight - headerHeight - padding * 2;
	}

	_createEditor (target, editorOptions, initialContent) {
		editorOptions.height = this._calculateEditorHeight();
		editorOptions.save_enablewhendirty = false;
		editorOptions.content_css =
			`${CONFIG.TinyMCE.css.join(',')},modules/obsidian/css/obsidian-mce.css`;
		super._createEditor(target, editorOptions, initialContent);
	}

	_editDetails () {
		new ObsidianNPCDetailsDialog(this).render(true);
	}

	_enterHPFormula (evt) {
		const target = $(evt.currentTarget);
		target.off();
		target.empty();
		target.append(
			$('<input type="text" name="data.attributes.hp.formula"'
				+ ` value="${this.actor.data.data.attributes.hp.formula}"`
				+ ` placeholder="${game.i18n.localize('OBSIDIAN.Formula')}">`));

		target.find('input').focus().focusout(evt => {
			this._onSubmit(evt);
			const target = $(evt.currentTarget);
			let value = target.val();

			if (value === '') {
				value = game.i18n.localize('OBSIDIAN.Formula').toLowerCase();
			}

			target.parent().text(`(${value})`).click(this._enterHPFormula.bind(this));
		});
	}

	_onResize (event) {
		Obsidian.prototype._onResize.apply(this, arguments);
		this.element.find('.tox-tinymce').css('height', `${this._calculateEditorHeight()}px`);
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
