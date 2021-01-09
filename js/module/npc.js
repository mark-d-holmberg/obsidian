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
		return `modules/obsidian/html/npc${this.actor.limited ? '-limited' : ''}.html`;
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
				contentSelector: '.obsidian-spell-table',
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
		html.find('.obsidian-npc-dt').click(this._enterDT.bind(this));
		html.find('.obsidian-npc-cr').click(this._enterCR.bind(this));
		html.find('.obsidian-npc-roll-hp').click(this._rollHP.bind(this));
		html.find('.obsidian-npc-roll-hd').click(this._rollHD.bind(this));
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
		data.items = this.actor.items.map(i => duplicate(i.data));
		data.ObsidianRules = OBSIDIAN.Rules;
		data.isObject = data.actor.flags.obsidian?.details?.type === 'object';
		data.featCategories = {};
		data.skills = {};

		for (const skill of Object.values(data.actor.obsidian.skills)) {
			if (skill?.value || skill?.override) {
				data.skills[skill.key] = skill;
			}
		}

		for (const item of data.items) {
			let cat = item.data.activation?.type;
			if (item.type === 'feat') {
				if (cat === 'special' || cat === 'bonus' || !cat.length) {
					cat = 'none';
				}
			} else if (item.type === 'weapon' && item.data.equipped) {
				if (cat !== 'legendary' && cat !== 'lair') {
					cat = 'action';
				}
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

		Sheet.getSenses(data);
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

	activateEditor (name, options = {}, initialContent = '') {
		const editor = this.editors[name];
		options = mergeObject(editor.options, options);
		options.height = this._calculateEditorHeight();
		options.save_enablewhendirty = false;
		options.content_css =
			`${CONFIG.TinyMCE.content_css.join(',')},modules/obsidian/css/obsidian-mce.css`;

		TextEditor.create(options, initialContent || editor.initial).then(mce => {
			editor.mce = mce;
			editor.changed = false;
			editor.active = true;
			mce.focus();
			mce.on('change', () => editor.changed = true);
		});
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

	_enterDT (evt) {
		const target = $(evt.currentTarget);
		target.off();
		target.empty();
		target.append(
			$('<input type="text" name="flags.obsidian.attributes.dt" data-dtype="Number"'
				+ ` value="${this.actor.data.flags.obsidian.attributes.dt ?? ''}"`
				+ ' placeholder="0">'));

		target.find('input').focus().focusout(evt => {
			this._onSubmit(evt);
			const target = $(evt.currentTarget);
			target.parent()
				.text(`${game.i18n.localize('OBSIDIAN.DT')} ${(target.val())}`)
				.click(this._enterDT.bind(this));
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

	_rollHD () {
		const hd = this.actor.data.flags.obsidian.attributes.hd;
		if (!hd.value || !hd.max) {
			return;
		}

		this.actor.rollHD([[1, this.actor.data.obsidian.attributes.hd.die]]);
	}

	_rollHP (evt) {
		this.actor.rollHP(evt.shiftKey);
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
