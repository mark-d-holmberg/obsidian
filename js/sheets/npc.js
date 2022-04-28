import ActorSheet5eNPC from '../../../../systems/dnd5e/module/actor/sheets/npc.js';
import {ObsidianCharacter} from './obsidian.js';
import {ObsidianNPCDetailsDialog} from '../dialogs/npc-details.js';
import {OBSIDIAN} from '../global.js';
import {Reorder} from '../module/reorder.js';
import {Sheet} from '../module/sheet.js';

export class ObsidianNPC extends ActorSheet5eNPC {
	constructor (...args) {
		super(...args);
		this.settings = {};

		if (this.actor.id) {
			game.settings.register('obsidian', this.actor.id, {
				default: '',
				scope: 'client',
				onChange: settings => this.settings = JSON.parse(settings)
			});

			this.settings = game.settings.get('obsidian', this.actor.id);
			if (this.settings === '') {
				this.settings = {spellsCollapsed: true};
			} else {
				this.settings = JSON.parse(this.settings);
			}
		}

		this.details = new Map();
	}

	get template () {
		const limited = !this.actor.isOwner && this.actor.limited;
		return `modules/obsidian/html/npc${limited ? '-limited' : ''}.html`;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		mergeObject(options, {
			width: 780,
			classes: options.classes.concat(['obsidian-window']),
			scrollY: ['.obsidian-scrollable'],
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

		if (!this.actor.isOwner && this.actor.limited) {
			return;
		}

		this._setCollapsed();
		html.find('.obsidian-tab.item, .obsidian-sub-tab.item').removeAttr('draggable');
		Sheet.activateFiltering(this, html);
		Sheet.contextMenu(this, html, true);

		if (!this.options.editable) {
			return;
		}

		Sheet.activateDragging(this, html);
		html.find('.obsidian-char-header-minor').click(this._editDetails.bind(this));
		html.find('.obsidian-npc-roll-hp').click(this._rollHP.bind(this));
		html.find('.obsidian-npc-roll-hd').click(this._rollHD.bind(this));
		html.find('.obsidian-legendary-actions .obsidian-feature-use')
			.click(this._useLegendaryAction.bind(this));

		const activateEditor =
			html.find('[data-edit="data.details.biography.value"]+.editor-edit')[0].onclick;

		html.find('.obsidian-edit-npc-notes').click(activateEditor.bind(this));
		html.find('.obsidian-spell-tab-toggle').click(this._toggleSpells.bind(this));

		Sheet.activateListeners(this, html);
		Sheet.activateAbilityScores(this, html);
		ObsidianCharacter.prototype._activateDialogs.apply(this, arguments);
	}

	getData () {
		const data = super.getData();
		data.actor = this.actor.toObject(false);
		data.base = this.actor.toObject();
		data.items = this.actor.items.map(item => item.toObject(false));
		data.items.sort((a, b) => a.sort - b.sort);
		data.ObsidianConfig = OBSIDIAN.Config;
		data.ObsidianLabels = OBSIDIAN.Labels;
		data.isObject = data.data.details?.type?.value === 'object';
		data.featCategories = {};
		data.skills = {};
		data.summonLevel = this._getSummonLevel();
		data.actor.obsidian.tempEffects = [];

		for (const skill of Object.values(data.actor.data.skills)) {
			if (skill?.value || skill?.override) {
				data.skills[skill.key] = skill;
			}
		}

		for (const item of data.items) {
			let cat = item.data.activation?.type;
			if (item.flags.obsidian?.activeEffect) {
				data.actor.obsidian.tempEffects.push(item);
				continue;
			}

			if (item.type === 'feat') {
				if (cat === 'special' || !cat.length) {
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
			item.obsidian.collection.attack.forEach(ObsidianCharacter.prototype._reifyAttackLinks, this);
		}

		if (data.featCategories.action) {
			const multiattack = game.i18n.localize('OBSIDIAN.Multiattack').toLowerCase();
			data.featCategories.action.sort((a, b) => {
				if (a.name.toLowerCase() === multiattack) {
					return -1;
				}

				if (b.name.toLowerCase() === multiattack) {
					return 1;
				}

				return a.name === b.name ? 0 : a.name > b.name ? 1 : -1;
			});
		}

		data.creatureType = this._formatCreatureType();
		Sheet.getSenses(data);
		Sheet.getRules(data);
		return data;
	}

	render (force = false, options = {}) {
		ObsidianCharacter.prototype._applySettings.apply(this);
		return super.render(force, options);
	}

	setModal () {
		ObsidianCharacter.prototype.setModal.apply(this, arguments);
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
		options.content_css = [
			...CONFIG.TinyMCE.content_css,
			OBSIDIAN.getFont(),
			'modules/obsidian/css/obsidian-mce.css'
		].join(',');

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

	_formatCreatureType () {
		const data = this.actor.data.data;
		const flags = this.actor.data.flags.obsidian;
		const derived = this.actor.obsidian;
		let mainType = '';
		let subtype = '';
		let comma = '';
		let alignment = '';

		if (data.details.type != null && typeof data.details.type === 'object') {
			let type = '';
			if (!OBSIDIAN.notDefinedOrEmpty(data.details.type.value)) {
				type = game.i18n.localize(`OBSIDIAN.CreatureType.${data.details.type.value}`);
			}

			if (!OBSIDIAN.notDefinedOrEmpty(data.details.type.swarm)) {
				type =
					game.i18n.localize('OBSIDIAN.CreatureSwarmPhrase')
						.format(
							game.i18n.localize(`OBSIDIAN.Size.${data.details.type.swarm}`),
							game.i18n.localize(
								`OBSIDIAN.CreatureTypePl.${data.details.type.value}`)
								.toLocaleLowerCase());
			}

			mainType = `<span>${type}</span>`;
		}

		if (data.details.type?.value !== 'object'
			&& (derived.details.tags || data.details.type?.subtype))
		{
			const tags =
				[derived.details.tags || '', data.details.type?.subtype || '']
					.filter(tag => tag.length)
					.map(tag => tag.toLocaleLowerCase())
					.join(', ');

			subtype = `<span style="margin-left: 3px;">(${tags})</span>`;
		}

		if (!OBSIDIAN.notDefinedOrEmpty(flags.details.alignment1)
			|| !OBSIDIAN.notDefinedOrEmpty(flags.details.alignment2)
			|| !OBSIDIAN.notDefinedOrEmpty(data.details.alignment))
		{
			comma = '<span>,</span> ';
			alignment =
				[1, 2].filter(n => !OBSIDIAN.notDefinedOrEmpty(flags.details[`alignment${n}`]))
					.map(n =>
						game.i18n.localize(
							`OBSIDIAN.AlignmentPt${n}.${flags.details[`alignment${n}`]}`))
					.join(' ');

			if (!alignment.length) {
				alignment = data.details.alignment;
			}

			if (alignment.length) {
				alignment = `<span>${alignment.toLocaleLowerCase()}</span>`;
			}
		}

		return `
			<span>${game.i18n.localize(`OBSIDIAN.Size.${data.traits.size}`)}</span>
			${mainType}${subtype}${comma}${alignment}
		`;
	}

	_getSummonLevel () {
		const level = this.actor.data.flags.obsidian?.summon?.spellLevel;
		if (level == null || level < 1) {
			return;
		}

		let n;
		if (level === 1) {
			n = game.i18n.localize('OBSIDIAN.FirstN');
		} else if (level === 2) {
			n = game.i18n.localize('OBSIDIAN.SecondN');
		} else if (level === 3) {
			n = game.i18n.localize('OBSIDIAN.ThirdN');
		} else {
			n = level + game.i18n.localize('OBSIDIAN.th');
		}

		return `${n} ${game.i18n.localize('OBSIDIAN.Level')}`;
	}

	_onChangeTab (event, tabs, active) {
		if (active.startsWith('equipment-')) {
			Sheet.filterEquipment(this);
		} else if (active.startsWith('spell-')) {
			Sheet.filterSpells(this);
		}
		this._setCollapsed();
	}

	_onResize (event) {
		ObsidianCharacter.prototype._onResize.apply(this, arguments);
		this.element.find('.tox-tinymce').css('height', `${this._calculateEditorHeight()}px`);
	}

	async _onSubmit (event, {updateData = null, preventClose = false, preventRender = false} = {}) {
		return ObsidianCharacter.prototype._onSubmit.apply(this, arguments);
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

	_setCollapsed () {
		const tab = this.form.querySelector('.obsidian-floating-tab[data-tab="spells"]');
		const active = this.settings.spellsCollapsed === false && this._tabs[0]?.active === 'stats';
		tab.classList.toggle('active', active);
		const toggle = this.form.querySelector('.obsidian-spell-tab-toggle object');
		toggle.dataset.fill = active ? '--obs-text-regular' : '--obs-mid';
		if (toggle.onload) {
			this._applySVGFill(toggle);
		} else {
			toggle.onload = () => this._applySVGFill(toggle);
		}
	}

	_toggleSpells () {
		if (this.settings.spellsCollapsed === undefined) {
			this.settings.spellsCollapsed = false;
		} else {
			this.settings.spellsCollapsed = !this.settings.spellsCollapsed;
		}
		this._setCollapsed();

		if (this.actor.id) {
			game.settings.set('obsidian', this.actor.id, JSON.stringify(this.settings));
		}
	}

	_applySVGFill (svg) {
		let fill = svg.dataset.fill;
		if (fill.startsWith('--')) {
			fill = getComputedStyle(document.documentElement).getPropertyValue(fill).trim();
		}

		const path = svg.contentDocument.documentElement.querySelector('path');
		path?.setAttribute('fill', fill);
	}

	async _updateObject (event, formData) {
		return super._updateObject(event, OBSIDIAN.updateArrays(this.actor.data._source, formData));
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
