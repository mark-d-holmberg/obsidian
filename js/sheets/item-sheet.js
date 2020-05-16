import {OBSIDIAN} from '../global.js';
import {ObsidianDialog} from '../dialogs/dialog.js';

export class ObsidianItemSheet extends ItemSheet {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 520;
		options.classes = options.classes.concat(['item', 'dialog', 'obsidian-window']);
		options.resizable = false;
		options.submitOnChange = false;
		return options;
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		if (this.actor && this.actor.apps) {
			Object.values(this.actor.apps)
				.filter(app => app.setModal)
				.forEach(app => app.setModal(true));
		}

		super.activateListeners(html);
		console.debug(this.item);
		ObsidianDialog.initialiseComponents(html);

		html.find('input').focusout(this._delaySubmit.bind(this));
		html.find('select').change(this._onSubmit.bind(this));
	}

	getData () {
		const data = super.getData();
		data.actor = this.actor;
		data.isNPC = this.actor?.data.type === 'npc';
		data.ObsidianRules = OBSIDIAN.Rules;

		if (data.actor) {
			data.actor.data.feats = data.actor.data.items.filter(item => item.type === 'feat');
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

	_createEditor (target, editorOptions, initialContent) {
		editorOptions.content_css =
			`${CONFIG.TinyMCE.css.join(',')},modules/obsidian/css/obsidian-mce.css`;
		super._createEditor(target, editorOptions, initialContent);
	}

	get _formData () {
		const formData = this._getFormData(this.element.find('form')[0]);
		const types = formData._dtypes;

		return Array.from(formData).reduce((data, [key, val]) => {
			const type = types[key];
			if (type === 'Number') {
				data[key] = val === '' ? null : Number(val);
			} else if (type === 'Boolean') {
				data[key] = val === 'true';
			} else if (type === 'Radio') {
				data[key] = JSON.parse(val);
			} else {
				data[key] = val;
			}

			return data;
		}, {});
	}

	/**
	 * @private
	 */
	_saveScrollPosition () {
		if (this.element) {
			this._scroll = this.element.find('.window-content').prop('scrollTop');
		}
	}

	/**
	 * @private
	 */
	async _render (force = false, options = {}) {
		this._saveScrollPosition();
		await super._render(force, options);
		this._restoreScrollPosition();
	}

	/**
	 * @private
	 */
	_restoreScrollPosition () {
		if (this.element) {
			this.element.find('.window-content').prop('scrollTop', this._scroll);
		}
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		super._updateObject(event, OBSIDIAN.updateArrays(this.item.data, formData));
	}
}
