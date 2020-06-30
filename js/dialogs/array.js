import {ObsidianDialog} from './dialog.js';
import {ObsidianItemSheet} from '../sheets/item-sheet.js';

export class ObsidianArrayDialog extends ObsidianDialog {
	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find(`.obsidian-add-${this.cls}`).click(this._onAdd.bind(this));
		html.find(`.obsidian-rm-${this.cls}`).click(this._onRemove.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	get _formData () {
		const formData =
			Object.getOwnPropertyDescriptor(ObsidianItemSheet.prototype, '_formData').get
				.apply(this);

		const array = [];
		for (const p in formData) {
			if (p.startsWith(this.flag)) {
				const path = p.substr(this.flag.length + 1);
				setProperty(array, path, formData[p]);
				delete formData[p];
			}
		}

		formData[this.flag] = array;
		return formData;
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onAdd (evt) {
		evt.preventDefault();
		const array = duplicate(getProperty(this.parent.actor.data, this.flag));
		const item = this.item;
		if (item.id === undefined) {
			item.id = array.length;
		}

		const update = this._formData;
		update[this.flag].push(item);
		await this.parent.actor.update(update);
		this.render(false);
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onRemove (evt) {
		evt.preventDefault();
		const array = getProperty(this.parent.actor.data, this.flag);
		const update = this._formData;
		update[this.flag] = ObsidianDialog.removeRow(update[this.flag], evt);

		if (this.onRemove) {
			this.onRemove(array, update);
		}

		await this.parent.actor.update(update);
		this.render(false);
	}
}
