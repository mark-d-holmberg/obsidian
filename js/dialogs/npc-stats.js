import {ObsidianDialog} from './dialog.js';
import {Rules} from '../rules/rules.js';
import {ObsidianItemSheet} from '../sheets/item-sheet.js';
import {ObsidianNPC} from '../module/npc.js';

export class ObsidianNPCStatsDialog extends ObsidianDialog {
	constructor (...args) {
		super(...args);
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 650;
		options.title = game.i18n.localize('OBSIDIAN.EditStats');
		options.template = 'modules/obsidian/html/dialogs/npc-stats.html';
		options.scrollY = ['.obsidian'];
		return options;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-save').click(this._onAddSave.bind(this));
		html.find('.obsidian-rm-save').click(this._onRemoveSave.bind(this));
		html.find('.obsidian-add-skill').click(this._onAddSkill.bind(this));
		html.find('.obsidian-rm-skill').click(this._onRemoveSkill.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	get _formData () {
		return Object.getOwnPropertyDescriptor(ObsidianItemSheet.prototype, '_formData')
			.get.apply(this);
	}

	async _onAddSave () {
		let key;
		for (const abl of Rules.ABILITIES) {
			const proficient = this.parent.actor.data.data.abilities[abl].proficient;
			const override = this.parent.actor.data.flags.obsidian.saves[abl].override;

			if (!proficient && !override) {
				key = abl;
				break;
			}
		}

		if (!key) {
			return;
		}

		const formData = this._formData;
		this._prepareUpdate(formData);
		formData[`data.abilities.${key}.proficient`] = 1;

		await this.parent.actor.update(formData);
		this.render(true);
	}

	async _onAddSkill () {
		let key;
		for (const skl of Rules.SKILLS) {
			const skill = this.parent.actor.data.flags.obsidian.skills[skl];
			if (!skill.value && !skill.override) {
				key = skl;
				break;
			}
		}

		if (!key) {
			return;
		}

		const formData = this._formData;
		this._prepareUpdate(formData);
		formData[`data.skills.${key}.value`] = 1;

		await this.parent.actor.update(formData);
		this.render(true);
	}

	async _onRemoveSave (evt) {
		const id = evt.currentTarget.closest('.obsidian-form-row').dataset.itemId;
		const formData = this._formData;
		this._prepareUpdate(formData);
		formData[`data.abilities.${id}.proficient`] = 0;
		formData[`flags.obsidian.saves.${id}.override`] = null;

		await this.parent.actor.update(formData);
		this.render(true);
	}

	async _onRemoveSkill (evt) {
		const id = evt.currentTarget.closest('.obsidian-form-row').dataset.itemId;
		const formData = this._formData;
		this._prepareUpdate(formData);
		formData[`data.skills.${id}.value`] = 0;
		formData[`flags.obsidian.skills.${id}.override`] = null;

		await this.parent.actor.update(formData);
		this.render(true);
	}

	_prepareUpdate (formData) {
		const saves = {};
		for (const prop in formData) {
			if (prop.startsWith('saves.')) {
				const [, id, key] = prop.split('.');
				if (!saves[id]) {
					saves[id] = {};
				}

				saves[id][key] = formData[prop];
				delete formData[prop];
			}
		}

		const skills = {};
		for (const prop in formData) {
			if (prop.startsWith('skills.')) {
				const [, id, key] = prop.split('.');
				if (!skills[id]) {
					skills[id] = {};
				}

				skills[id][key] = formData[prop];
				delete formData[prop];
			}
		}

		Rules.ABILITIES.forEach(abl => {
			formData[`data.abilities.${abl}.proficient`] = 0;
			formData[`flags.obsidian.saves.${abl}.override`] = null;
		});

		Rules.SKILLS.forEach(skl => {
			formData[`data.skills.${skl}.value`] = 0;
			formData[`flags.obsidian.skills.${skl}.override`] = null;
		})

		Object.values(saves).forEach(save => {
			formData[`data.abilities.${save.abl}.proficient`] = save.prof;
			formData[`flags.obsidian.saves.${save.abl}.override`] = save.override;
		});

		Object.values(skills).forEach(skill => {
			formData[`data.skills.${skill.skl}.value`] = skill.prof;
			formData[`flags.obsidian.skills.${skill.skl}.override`] = skill.override;
		});
	}

	_restoreScrollPositions (html, selectors) {
		ObsidianNPC.prototype._restoreScrollPositions.apply(this, arguments);
	}

	_updateObject (event, formData) {
		this._prepareUpdate(formData);
		super._updateObject(event, formData);
	}
}
