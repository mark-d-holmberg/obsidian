import {Schema} from '../data/schema.js';
import {ObsidianDialog} from './dialog.js';
import {toSlug} from '../data.js';

export class ObsidianSkillsDialog extends ObsidianDialog {
	activateListeners (html) {
		super.activateListeners(html);
		const property = this.options.property.substr(0, this.options.property.length - 1);
		html.find(`.obsidian-add-${property}`).click(this._onAdd.bind(this));
		html.find(`.obsidian-rm-${property}`).click(this._onRemove.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	getData () {
		const data = super.getData();
		const items = this.parent.actor.data.data[this.options.property];
		data.custom = [];

		if (items) {
			data.custom.push(...Object.values(items).filter(item => item.custom));
		}

		return data;
	}

	get _formData () {
		const data = FormApplication.prototype._getSubmitData.apply(this);
		const expanded = expandObject(data);
		const items = expanded.flags.obsidian[this.options.property];
		const custom = Object.entries(items).filter(([, item]) => item.custom);

		if (this.options.property === 'tools') {
			// Make sure any tool that is enabled is automatically marked as
			// proficient if it's not already.
			Object.entries(items).forEach(([key, item]) => {
				if (item.custom || !item.enabled) {
					return;
				}

				const original = this.parent.actor.getFlag('obsidian', `tools.${key}`);
				if (!original?.value) {
					item.value = 1;
				}
			});
		}

		if (!custom.length) {
			return flattenObject(expanded);
		}

		const newData = {};
		for (const [id, item] of custom) {
			const key = toSlug(item.label);
			if (id === key) {
				continue;
			}

			items[key] = item;
			delete items[id];
			newData[`flags.obsidian.${this.options.property}.-=${id}`] = null;
		}

		return {...newData, ...flattenObject(expanded)};
	}

	async _onAdd (evt) {
		evt.preventDefault();
		const item = this._newItem();
		item.key = toSlug(item.label);
		const update = this._formData;
		update[`flags.obsidian.${this.options.property}.${item.key}`] = item;
		await this.parent.actor.update(update);
		this.render(false);
	}

	async _onRemove (evt) {
		evt.preventDefault();
		const id = evt.currentTarget.closest('.obsidian-form-row').dataset.itemId;
		const update = this._formData;
		const property = `flags.obsidian.${this.options.property}.${id}`;

		for (const p in update) {
			if (p.startsWith(property)) {
				delete update[p];
			}
		}

		update[`flags.obsidian.${this.options.property}.-=${id}`] = null;
		await this.parent.actor.update(update);
		this.render(false);
	}

	_newItem () {
		const property =
			this.options.property.capitalize().substr(0, this.options.property.length - 1);

		const schema = duplicate(Schema[property]);
		schema.custom = true;
		schema.label = game.i18n.localize(`OBSIDIAN.Custom${property}`);
		return schema;
	}

	async _updateObject (event, formData) {
		return this.parent._updateObject(event, this._formData);
	}
}
