import {OBSIDIAN} from '../global.js';
import {ObsidianDialog} from '../dialogs/dialog.js';

export class ObsidianItemSheet extends ItemSheet {
	constructor (...args) {
		super(...args);
		if (this.actor && this.actor.apps) {
			Object.values(this.actor.apps)
				.filter(app => app.setModal)
				.forEach(app => app.setModal(true));
		}

		this._numberFormatter = new Intl.NumberFormat();
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 520;
		options.classes = options.classes.concat(['item', 'dialog', 'obsidian-window']);
		options.resizable = false;
		options.submitOnChange = false;
		options.scrollY = (options.scrollY || []).concat('.window-content');
		return options;
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		console.debug(this.item);
		ObsidianDialog.initialiseComponents(html);

		html.find('input').focusout(this._delaySubmit.bind(this));
		html.find('select').change(this._onSubmit.bind(this));
		ObsidianDialog.prototype.activateLargeNumberInputs.call(this, html);
	}

	getData () {
		const data = super.getData();
		data.item = this.item.toObject(false);
		data.base = this.item.toObject();
		data.data = data.item.data;
		data.actor = this.actor;
		data.isNPC = this.actor?.type === 'npc';
		data.isCharacter = this.actor?.type === 'character';
		data.ObsidianConfig = OBSIDIAN.Config;
		data.ObsidianLabels = OBSIDIAN.Labels;

		if (data.actor) {
			data.actor.data.feats =
				data.actor.obsidian.itemsByType.get('feat').map(i => duplicate(i.toObject(false)));
		}

		return data;
	}

	async maximize () {
		await super.maximize();
		ObsidianDialog.recalculateHeight($(this.form));
	}

	async close () {
		await super.close();
		if (this.actor && this.actor.apps) {
			Object.values(this.actor.apps)
				.filter(app => app.setModal)
				.forEach(app => app.setModal(false));
		}
	}

	_delaySubmit (evt) {
		setTimeout(() => {
			if (!this.element.find('input:focus, select:focus').length) {
				this._onSubmit(evt);
			}
		}, 25);
	}

	activateEditor (name, options = {}, initialContent = '') {
		options.content_css = [
			...CONFIG.TinyMCE.content_css,
			OBSIDIAN.getFont(),
			'modules/obsidian/css/obsidian-mce.css'
		].join(',');
		super.activateEditor(name, options, initialContent);
	}

	formatLargeNumber (el) {
		ObsidianDialog.prototype.formatLargeNumber.call(this, el);
	}

	/**
	 * @private
	 */
	async _updateObject (event, formData) {
		ObsidianDialog.prototype.updateLargeNumberInputs.call(this, formData);
		return super._updateObject(event, OBSIDIAN.updateArrays(this.item.data._source, formData));
	}
}
