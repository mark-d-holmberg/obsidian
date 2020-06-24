import {ObsidianDialog} from './dialog.js';

export class ObsidianDefensesDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 500;
		options.title = game.i18n.localize('OBSIDIAN.ManageDefenses');
		options.template = 'modules/obsidian/html/dialogs/defenses.html';
		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-dmg').click(this._onAddDamage.bind(this));
		html.find('.obsidian-rm-dmg').click(this._onRemoveDamage.bind(this));
		html.find('.obsidian-add-cond').click(this._onAddCondition.bind(this));
		html.find('.obsidian-rm-cond').click(this._onRemoveCondition.bind(this));
		html.find('.obsidian-def-bps-res').click(this._addBPS.bind(this, 'res'));
		html.find('.obsidian-def-bps-imm').click(this._addBPS.bind(this, 'imm'));
		ObsidianDialog.recalculateHeight(html);
	}

	async _addBPS (level) {
		const update = this._formData;
		this.parent.actor.data.flags.obsidian.defenses.damage.push(...[
			{level: level, dmg: 'blg', magic: 'non'},
			{level: level, dmg: 'prc', magic: 'non'},
			{level: level, dmg: 'slh', magic: 'non'}
		]);

		update['flags.obsidian.defenses.damage'] =
			duplicate(this.parent.actor.data.flags.obsidian.defenses.damage);

		await this.parent.actor.update(update);
		this.render(false);
	}

	/**
	 * @private
	 */
	get _formData () {
		const form = this.element.find('form');
		return {
			'flags.obsidian.defenses.disease':
				form.find('[name="flags.obsidian.defenses.disease"]').prop('checked'),
			'flags.obsidian.defenses.sleep':
				form.find('[name="flags.obsidian.defenses.sleep"]').prop('checked')
		};
	}

	/**
	 * @private
	 */
	async _onAddDamage () {
		const update = this._formData;
		this.parent.actor.data.flags.obsidian.defenses.damage.push({level: 'res', dmg: 'acd'});
		update['flags.obsidian.defenses.damage'] =
			duplicate(this.parent.actor.data.flags.obsidian.defenses.damage);
		await this.parent.actor.update(update);
		this.render(false);
	}

	/**
	 * @private
	 */
	async _onRemoveDamage (evt) {
		const update = this._formData;
		update['flags.obsidian.defenses.damage'] =
			ObsidianDialog.removeRow(this.parent.actor.data.flags.obsidian.defenses.damage, evt);
		await this.parent.actor.update(update);
		this.render(false);
	}

	/**
	 * @private
	 */
	async _onAddCondition () {
		const update = this._formData;
		const conditions = duplicate(this.parent.actor.data.flags.obsidian.defenses.conditions);
		conditions.push({level: 'imm', condition: 'charmed'});
		update['flags.obsidian.defenses.conditions'] = conditions;
		await this.parent.actor.update(update);
		this.render(false);
	}

	/**
	 * @private
	 */
	async _onRemoveCondition (evt) {
		const update = this._formData;
		update['flags.obsidian.defenses.conditions'] =
			ObsidianDialog.removeRow(
				this.parent.actor.data.flags.obsidian.defenses.conditions, evt);
		await this.parent.actor.update(update);
		this.render(false);
	}
}
