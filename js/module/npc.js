import ActorSheet5eNPC from '../../../../systems/dnd5e/module/actor/sheets/npc.js';
import {Obsidian} from './obsidian.js';
import {ObsidianNPCDetailsDialog} from '../dialogs/npc-details.js';
import {OBSIDIAN} from '../global.js';
import {Reorder} from './reorder.js';
import {Sheet} from './sheet.js';

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

		this.details = new Map();
	}

	get template () {
		return 'modules/obsidian/html/npc.html';
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		mergeObject(options, {
			width: 768,
			classes: options.classes.concat(['obsidian-window']),
			scrollY: ['.obsidian'],
			tabs: [{
				navSelector: 'ul.obsidian-tab-bar[data-group="main-tabs"]',
				contentSelector: 'form.obsidian',
				initial: 'stats'
			}, {
				navSelector: 'ul.obsidian-tab-bar[data-group="spells"]',
				contentSelector: '.obsidian-spell-tabls',
				initial: 'spell-all'
			}, {
				navSelector: 'ul.obsidian-tab-bar[data-group="equipment"]',
				contentSelector: '.obsidian-inv-table',
				initial: 'equipment-all'
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

		this.form.ondragover = Reorder.dragOver;
		this.form.ondrop = evt => Sheet.onDrop(this, evt);

		if (this.actor.limited) {
			return;
		}

		html.find('.obsidian-tab.item, .obsidian-sub-tab.item').removeAttr('draggable');
		Sheet.activateFiltering(this, html);
		Sheet.contextMenu(this, html, true);

		if (!this.options.editable) {
			return;
		}

		Sheet.activateDragging(this, html);
		html.find('.obsidian-char-header-minor').click(this._editDetails.bind(this));
		html.find('.obsidian-npc-hp-formula').click(this._enterHPFormula.bind(this));
		html.find('.obsidian-npc-cr').click(this._enterCR.bind(this));
		html.find('.obsidian-npc-condition-grid .obsidian-radio-label')
			.click(evt => Sheet.setCondition(this, evt));
		html.find('.obsidian-legendary-actions .obsidian-feature-use')
			.click(this._useLegendaryAction.bind(this));

		const activateEditor =
			html.find('[data-edit="data.details.biography.value"]+.editor-edit')[0].onclick;

		html.find('.obsidian-edit-npc-notes').click(activateEditor.bind(this));

		Sheet.activateListeners(this, html);
		Sheet.activateAbilityScores(this, html);
		Obsidian.prototype._activateDialogs.apply(this, arguments);
	}

	getData () {
		const data = super.getData();
		data.ObsidianRules = OBSIDIAN.Rules;
		data.featCategories = {};
		data.skills = {};

		for (const skl in data.data.skills) {
			const skill = data.actor.flags.obsidian.skills[skl];
			if (skill?.value || skill?.override) {
				data.skills[skl] = skill;
			}
		}

		for (const item of data.actor.items) {
			let cat;
			if (item.type === 'feat') {
				cat = item.data.activation.type;
				if (!cat.length) {
					cat = 'none';
				}

				if (cat === 'special') {
					cat = 'none';
				}
			} else if (item.type === 'weapon' && item.data.equipped) {
				cat = 'action';
			} else {
				continue;
			}

			let category = data.featCategories[cat];
			if (!category) {
				category = [];
				data.featCategories[cat] = category;
			}

			category.push(item);
			item.obsidian.collection.attack.forEach(Obsidian.prototype._reifyAttackLinks, this);
		}

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

	_enterCR (evt) {
		const crs = {0: '0', .125: '1/8', .25: '1/4', .5: '1/2'};
		const cr = this.actor.data.data.details.cr;
		const target = $(evt.currentTarget);
		target.off();
		target.empty();
		target.append(
			$(`<input type="text" name="data.details.cr" value="${crs[cr] || cr}"`
				+ ` placeholder="${game.i18n.localize('OBSIDIAN.Challenge')}">`));

		target.find('input').focus().focusout(evt => {
			this._onSubmit(evt);
			const target = $(evt.currentTarget);
			let value = target.val();

			if (value === '') {
				value = '—';
			} else {
				let cr = Number(value);
				if (isNaN(cr) && value.includes('/')) {
					const [nom, denom] = value.split('/');
					cr = nom / denom;
				}

				value = `${value} <span class="obsidian-npc-subtle">(`
					+ Intl.NumberFormat().format(this.actor.getCRExp(cr))
					+ ` ${game.i18n.localize('OBSIDIAN.XP')})</span>`;
			}

			target.parent().html(value).click(this._enterCR.bind(this));
		});
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

	_onChangeTab (event, tabs, active) {
		if (active.startsWith('equipment-')) {
			Sheet.filterEquipment(this);
		} else if (active.startsWith('spell-')) {
			Sheet.filterSpells(this);
		}
	}

	_onResize (event) {
		Obsidian.prototype._onResize.apply(this, arguments);
		this.element.find('.tox-tinymce').css('height', `${this._calculateEditorHeight()}px`);
	}

	async _onSubmit (event, {updateData = null, preventClose = false, preventRender = false} = {}) {
		return Obsidian.prototype._onSubmit.apply(this, arguments);
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

	_updateObject (event, formData) {
		super._updateObject(event, OBSIDIAN.updateArrays(this.actor.data, formData));
	}

	_useLegendaryAction (evt) {
		let used = this.actor.data.data.resources.legact.value;
		const n = Number(evt.currentTarget.dataset.n);

		if (n > used) {
			used++;
		} else {
			used--;
		}

		this.actor.update({'data.resources.legact.value': used});
	}
}
