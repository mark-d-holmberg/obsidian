import {ActorSheet5eNPC} from '../../../../systems/dnd5e/module/actor/sheets/npc.js';
import {Obsidian} from './obsidian.js';
import {ObsidianNPCDetailsDialog} from '../dialogs/npc-details.js';
import {OBSIDIAN} from '../global.js';
import {ObsidianItems} from '../rules/items.js';
import {ObsidianSpellsDialog} from '../dialogs/spells.js';

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

		this.form.ondragover = Obsidian.prototype._onDragOver.bind(this);
		this.form.ondrop = Obsidian.prototype._onDrop.bind(this);

		if (this.actor.limited) {
			return;
		}

		html.find('.obsidian-tab.item, .obsidian-sub-tab.item').removeAttr('draggable');
		html.find('.obsidian-search-spell-name').keyup(Obsidian.prototype._filterSpells.bind(this));
		html.find('.obsidian-search-inv-name').keyup(Obsidian.prototype._filterEquipment.bind(this));
		html.find('.obsidian-clear-inv-name')
			.click(Obsidian._clearSearch.bind(this, Obsidian.prototype._filterEquipment.bind(this)));

		html.find('.obsidian-clear-spell-name')
			.click(Obsidian._clearSearch.bind(this, Obsidian.prototype._filterSpells.bind(this)));

		Obsidian.prototype._filterSpells.apply(this);
		Obsidian.prototype._filterEquipment.apply(this);
		Obsidian.prototype._contextMenu.apply(this, [html, true]);

		if (!this.options.editable) {
			return;
		}

		html.on('dragend', () => {
			this.details.forEach((open, el) => el.open = open);
			if (this.element) {
				this.element.find('.obsidian-drag-indicator').css('display', 'none');
				this.element.find('.obsidian-inv-container').removeClass('obsidian-container-drop');
			}
		});

		html.find('[draggable]').each((i, el) =>
			el.addEventListener('dragstart', Obsidian.prototype._onDragItemStart.bind(this), false));

		html.find('.obsidian-char-header-minor').click(this._editDetails.bind(this));
		html.find('.obsidian-npc-hp-formula').click(this._enterHPFormula.bind(this));
		html.find('.obsidian-npc-cr').click(this._enterCR.bind(this));
		html.find('.obsidian-delete').click(Obsidian.prototype._onDeleteFeature.bind(this));
		html.find('.obsidian-attack-toggle').click(Obsidian.prototype._onAttackToggle.bind(this));
		html.find('.obsidian-add-spell').click(Obsidian.prototype._onAddSpell.bind(this));
		html.find('.obsidian-add-custom-item').click(Obsidian.prototype._onAddItem.bind(this));
		html.find('.obsidian-equip-action').click(Obsidian.prototype._onEquip.bind(this));
		html.find('.obsidian-attune').click(Obsidian.prototype._onAttune.bind(this));
		html.find('[data-roll]').click(Obsidian.prototype._onRoll.bind(this));
		html.find('.obsidian-npc-condition-grid .obsidian-radio-label')
			.click(Obsidian.prototype._setCondition.bind(this));
		html.find('.obsidian-exhaustion .obsidian-radio')
			.click(Obsidian.prototype._setAttributeLevel.bind(this, 'data.attributes.exhaustion'));
		html.find('.obsidian-death-successes .obsidian-radio')
			.click(Obsidian.prototype._setAttributeLevel.bind(this, 'data.attributes.death.success'));
		html.find('.obsidian-death-failures .obsidian-radio')
			.click(Obsidian.prototype._setAttributeLevel.bind(this, 'data.attributes.death.failure'));
		html.find('.obsidian-manage-spells').click(() =>
			new ObsidianSpellsDialog(this).render(true));
		html.find('.obsidian-effect-row .obsidian-radio')
			.click(Obsidian.prototype._onEffectToggled.bind(this));
		html.find('.obsidian-inv-container')
			.click(Obsidian.prototype._saveContainerState.bind(this));
		html.find('[data-uuid] .obsidian-feature-use')
			.click(Obsidian.prototype._onUseClicked.bind(this));
		html.find('[data-spell-level] .obsidian-feature-use')
			.click(Obsidian.prototype._onSlotClicked.bind(this));
		html.find('.obsidian-legendary-actions .obsidian-feature-use')
			.click(this._useLegendaryAction.bind(this));
		html.find('.obsidian-view')
			.click(evt => Obsidian.prototype._viewItem.apply(this, [$(evt.currentTarget)]));
		html.find('[contenteditable]')
			.focusout(Obsidian.prototype._onContenteditableUnfocus.bind(this));

		Obsidian.prototype._activateAbilityScores.apply(this, arguments);
		Obsidian.prototype._activateDialogs.apply(this, arguments);
	}

	getData () {
		const data = super.getData();
		data.ObsidianRules = OBSIDIAN.Rules;
		data.isNPC = this.actor.data.type === 'npc';
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
			} else if (item.type === 'weapon' && item.data.equipped) {
				cat = 'action';
			} else {
				continue;
			}

			let category = data.featCategories[cat];
			if (!category) {
				category = [];
				data.featCategories[item.data.activation.type] = category;
			}

			category.push(item);
			item.obsidian.attacks.forEach(Obsidian.prototype._reifyAttackLinks, this);
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

	_deleteItem () {
		Obsidian.prototype._deleteItem.apply(this, arguments);
	}

	_editDetails () {
		new ObsidianNPCDetailsDialog(this).render(true);
	}

	_editItem () {
		Obsidian.prototype._editItem.apply(this, arguments);
	}

	_enterCR (evt) {
		const target = $(evt.currentTarget);
		target.off();
		target.empty();
		target.append(
			$(`<input type="text" name="data.details.cr" value="${this.actor.data.data.details.cr}"`
				+ ` placeholder="${game.i18n.localize('OBSIDIAN.Challenge')}">`));

		target.find('input').focus().focusout(evt => {
			this._onSubmit(evt);
			const target = $(evt.currentTarget);
			let value = target.val();

			if (value === '') {
				value = '—';
			} else {
				value = `${value} <span class="obsidian-npc-subtle">(`
					+ Intl.NumberFormat().format(this.actor.getCRExp(Number(value)))
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

	_onAttune () {
		Obsidian.prototype._onAttune.apply(this, arguments);
	}

	_onChangeTab (event, tabs, active) {
		if (active.startsWith('equipment-')) {
			Obsidian.prototype._filterEquipment.apply(this);
		} else if (active.startsWith('spell-')) {
			Obsidian.prototype._filterSpells.apply(this);
		}
	}

	_onEquip () {
		Obsidian.prototype._onEquip.apply(this, arguments);
	}

	_onResize (event) {
		Obsidian.prototype._onResize.apply(this, arguments);
		this.element.find('.tox-tinymce').css('height', `${this._calculateEditorHeight()}px`);
	}

	_onRoll (evt) {
		ObsidianItems.roll(this.actor, evt.currentTarget.dataset);
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

	_splitItem () {
		Obsidian.prototype._splitItem.apply(this, arguments);
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

	_viewItem () {
		Obsidian.prototype._viewItem.apply(this, arguments);
	}
}
