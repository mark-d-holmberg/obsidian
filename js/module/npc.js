import {ActorSheet5eNPC} from '../../../../systems/dnd5e/module/actor/sheets/npc.js';
import {Obsidian} from './obsidian.js';
import {ObsidianNPCDetailsDialog} from '../dialogs/npc-details.js';
import {OBSIDIAN} from '../global.js';
import {ObsidianItems} from '../rules/items.js';

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
			width: 768,
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
		html.find('.obsidian-npc-cr').click(this._enterCR.bind(this));
		html.find('.obsidian-delete').click(Obsidian.prototype._onDeleteFeature.bind(this));
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
			if (item.type !== 'feat') {
				continue;
			}

			let category = data.featCategories[item.data.activation.type];
			if (!category) {
				category = [];
				data.featCategories[item.data.activation.type] = category;
			}

			category.push(item);
			item.obsidian.attacks.forEach(atk => {
				atk.parentEffect = this.actor.data.obsidian.effects.get(atk.parentEffect);
				atk.parentEffect.damage =
					atk.parentEffect.components.filter(c => c.type === 'damage');
			});
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
