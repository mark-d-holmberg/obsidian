import {OBSIDIAN} from '../rules/rules.js';
import {ObsidianItemSheet} from './item-sheet.js';
import {ObsidianDialog} from '../dialogs/dialog.js';

export class ObsidianWeaponSheet extends ObsidianItemSheet {
	constructor (...args) {
		super(...args);
		Hooks.once('MCEInit-weapon', init => {
			init.then(ObsidianDialog.recalculateHeight.bind(this, $(this.form)));
		});
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 560;
		options.template = 'modules/obsidian/html/sheets/weapon.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-attack-type').change(this._updateDisplay.bind(this));
		html.find('.obsidian-attack-tag').change(this._onModifyTags.bind(this));
		html.find('.obsidian-add-damage').click(this._onAddDamage.bind(this));
		html.find('.obsidian-rm-damage').click(this._onRemoveDamage.bind(this));
		html.find('.obsidian-add-tag').click(this._onAddTag.bind(this));
		html.find('.obsidian-rm-tag').click(this._onRemoveTag.bind(this));
		html.find('.obsidian-add-special').click(this._onAddSpecial.bind(this));
		html.find('.obsidian-rm-special').click(this._onRemoveSpecial.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	static enrichFlags (data) {
		if (data.type === 'weapon') {
			if (!data.flags.obsidian) {
				data.flags.obsidian = duplicate(OBSIDIAN.Schema.Weapon);
			}
		}
	}

	/**
	 * @private
	 */
	_adjustMode (formData, tags) {
		const current = this.item.data.flags.obsidian.mode;
		const type = formData[`flags.obsidian.type`];

		if (type === 'ranged' || type === 'unarmed') {
			return type;
		}

		if ((current === 'ranged' && !tags.thrown)
			|| (current === 'versatile' && !tags.versatile)
			|| current === 'unarmed')
		{
			return 'melee';
		}

		return current;
	}

	/**
	 * @private
	 */
	_collectTags () {
		const tags = duplicate(this.item.data.flags.obsidian.tags);
		Object.keys(tags).forEach(tag => tags[tag] = false);
		tags.custom = [];

		this.element.find('.obsidian-attack-tag').each((i, el) => {
			const jqel = $(el);
			const tag = jqel.val();

			if (tag === 'custom') {
				tags.custom.push(jqel.next().val());
			} else {
				tags[tag] = true;
			}
		});

		return tags;
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_onAddSpecial (evt) {
		evt.preventDefault();
		const formData = this._formData;
		let special = this.item.data.flags.obsidian.special;

		if (special === undefined) {
			special = [];
		}

		special.push({name: '', uses: {max: 0}});
		formData['flags.obsidian.special'] = special;
		this._updateObject(evt, formData);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onAddTag (evt) {
		evt.preventDefault();
		const tags = this.item.data.flags.obsidian.tags;

		let available = null;
		for (const tag of OBSIDIAN.Rules.WEAPON_TAGS) {
			if (!tags[tag]) {
				available = tag;
				break;
			}
		}

		const formData = this._formData;
		if (available === null || available === 'custom') {
			formData[`flags.obsidian.tags.custom.${tags.custom.length}`] = '';
		} else {
			formData[`flags.obsidian.tags.${available}`] = true;
		}

		const expanded = OBSIDIAN.updateArrays(this.item.data, formData);
		this.item.update(expanded);
	}

	/**
	 * @private
	 */
	_onModifyTags () {
		this.element.find('.obsidian-attack-tag').each((i, el) => {
			const jqel = $(el);
			const input = jqel.next();
			if (jqel.val() === 'custom') {
				input.removeClass('obsidian-hidden');
			} else {
				input.addClass('obsidian-hidden');
			}
		});

		this._updateDisplay();
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemoveSpecial (evt) {
		evt.preventDefault();
		await this._updateObject(evt, this._formData);
		this.item.update({
			'flags.obsidian.special':
				ObsidianDialog.removeRow(this.item.data.flags.obsidian.special, evt)
		});
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemoveTag (evt) {
		evt.preventDefault();
		const formData = this._formData;
		const tag = evt.currentTarget.dataset.key;
		const tags = duplicate(this.item.data.flags.obsidian.tags);

		if (tag === 'custom') {
			const idx = Number(evt.currentTarget.dataset.idx);
			tags.custom.splice(idx, 1);
		} else {
			tags[tag] = false;
		}

		formData['flags.obsidian.tags'] = tags;
		const expanded = OBSIDIAN.updateArrays(this.item.data, formData);
		this.item.update(expanded);
	}

	/**
	 * @private
	 */
	_updateDisplay () {
		const tags = this._collectTags();
		const range = this.element.find('.obsidian-range-row');
		const versatile = this.element.find('.obsidian-versatile-block');
		const type = this.element.find('.obsidian-attack-type').val();

		if (tags.thrown || type === 'ranged') {
			range.removeClass('obsidian-hidden');
		} else {
			range.addClass('obsidian-hidden');
		}

		if (tags.versatile) {
			versatile.removeClass('obsidian-hidden');
		} else {
			versatile.addClass('obsidian-hidden');
		}

		ObsidianDialog.recalculateHeight(this.element.find('form'));
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		const tags = this._collectTags();
		formData['flags.obsidian.tags'] = tags;
		formData['flags.obsidian.mode'] = this._adjustMode(formData, tags);
		super._updateObject(event, formData);
	}
}
