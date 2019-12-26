import {OBSIDIAN} from './rules.js';

class ObsidianSpellLists extends Application {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 800;
		options.height = 600;
		options.classes =
			options.classes.concat(['dialog', 'obsidian-window', 'obsidian-2-pane-window']);
		options.template = 'modules/obsidian/html/dialogs/spell-class-lists.html';
		options.title = game.i18n.localize('OBSIDIAN.SettingsConfSpellLists');
		return options;
	}

	constructor (...args) {
		super(...args);
		this._lists = JSON.parse(game.settings.get('obsidian', 'spell-class-lists'));
		this._tabs = {left: [], right: []};

		for (let i = 0; i < 10; i++) {
			['left', 'right'].forEach(k => this._tabs[k][i] = false);
		}
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('#obsidian-transfer-right').click(this._addToList.bind(this));
		html.find('#obsidian-transfer-left').click(this._removeFromList.bind(this));
		html.find('.obsidian-input-search').keyup(this._computeDifference.bind(this));
		html.find('#obsidian-class-list').change(this._computeDifference.bind(this));
		html.find('.obsidian-spell-level-tab').click(this._onLevelFilter.bind(this));
		html.find('#obsidian-manage-custom-lists').click(() =>
			new ObsidianCustomListManager(this).render(true));
		html.find('.obsidian-clear-search').click(evt => {
			$(evt.currentTarget).prev().prev().val('');
			this._computeDifference();
		});
		html.find('#obsidian-spell-list-import').click(() =>
			new ObsidianImportSpellListDialog(this).render(true));
		html.find('#obsidian-spell-list-export').click(() =>
			new ObsidianExportSpellListDialog().render(true));

		this._computeDifference();
	}

	getData (options) {
		const data = super.getData(options);
		data.lists = this._lists;
		data.spells = OBSIDIAN.Data.SPELLS_BY_SLUG;
		return data;
	}

	/**
	 * @private
	 */
	_computeDifference () {
		const matchesFilter = (filter, spell) => {
			const levels =
				this._tabs[filter].map((f, i) => [f, i]).filter(([f, _]) => f).map(([_, i]) => i);
			const name =
				this.element.find(`.obsidian-input-search[data-prop="${filter}"]`)
					.val().toLowerCase();

			if (name.length && !spell.name.toLowerCase().includes(name)) {
				return false;
			}

			return !(levels.length && !levels.includes(spell.data.level));
		};

		const allList = this.element.find('#obsidian-all-spells').empty();
		const clsList = this.element.find('#obsidian-class-spells').empty();
		const cls = this.element.find('#obsidian-class-list').val();
		let list = [];

		if (this._lists[cls]) {
			list = this._lists[cls];
		}

		for (const [slug, spell] of OBSIDIAN.Data.SPELLS_BY_SLUG) {
			const opt = $(`<option value="${slug}">${spell.name}</option>`);
			const inList = list.includes(slug);

			if (inList && matchesFilter('right', spell)) {
				clsList.append(opt);
			} else if (!inList && matchesFilter('left', spell)) {
				allList.append(opt);
			}
		}
	}

	/**
	 * @private
	 */
	_onLevelFilter (evt) {
		const key = evt.currentTarget.dataset.value;
		const prop = evt.currentTarget.closest('.obsidian-tab-bar').dataset.prop;
		this._tabs[prop][key] = !this._tabs[prop][key];
		this.element.find('.obsidian-spell-level-tab').removeClass('active');

		for (let i = 0; i < 10; i++) {
			['left', 'right'].forEach(k => {
				if (this._tabs[k][i]) {
					this.element
						.find(`ul[data-prop="${k}"] .obsidian-sub-tab[data-value="${i}"]`)
						.addClass('active');
				}
			});
		}

		this._computeDifference();
	}

	/**
	 * @private
	 */
	_addToList () {
		const selected = this.element.find('#obsidian-all-spells').val();
		const cls = this.element.find('#obsidian-class-list').val();

		if (!selected.length || !this._lists[cls]) {
			return;
		}

		this._lists[cls] = this._lists[cls].concat(selected);
		this._lists[cls].sort();
		game.settings.set('obsidian', 'spell-class-lists', JSON.stringify(this._lists));
		this._computeDifference();
	}

	/**
	 * @private
	 */
	_removeFromList () {
		const selected = this.element.find('#obsidian-class-spells').val();
		const cls = this.element.find('#obsidian-class-list').val();

		if (!selected || !this._lists[cls]) {
			return;
		}

		this._lists[cls] = this._lists[cls].filter(slug => !selected.includes(slug));
		game.settings.set('obsidian', 'spell-class-lists', JSON.stringify(this._lists));
		this._computeDifference();
	}
}

class ObsidianCustomListManager extends Application {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		options.height = 400;
		options.classes = options.classes.concat(['dialog', 'obsidian-window']);
		options.template = 'modules/obsidian/html/dialogs/spell-list-classes.html';
		options.title = game.i18n.localize('OBSIDIAN.CustomClasses');
		return options;
	}

	constructor (parent, ...args) {
		super(...args);
		this._parent = parent;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-class').click(this._onAddClass.bind(this));
		html.find('.obsidian-rm-class').click(this._onRemoveClass.bind(this));
	}

	async close () {
		await this._save();
		this._parent._lists = JSON.parse(game.settings.get('obsidian', 'spell-class-lists'));
		this._parent.render(false);
		return super.close();
	}

	getData (options) {
		const data = super.getData(options);
		data.classes =
			Object.keys(JSON.parse(game.settings.get('obsidian', 'spell-class-lists')))
				.filter(cls => !OBSIDIAN.Rules.CLASSES.includes(cls));
		return data;
	}

	/**
	 * @private
	 */
	async _onAddClass () {
		await this._save();
		const lists = JSON.parse(game.settings.get('obsidian', 'spell-class-lists'));
		if (lists['']) {
			return;
		}

		lists[''] = [];
		await game.settings.set('obsidian', 'spell-class-lists', JSON.stringify(lists));
		this.render(false);
	}

	/**
	 * @private
	 */
	async _onRemoveClass (evt) {
		await this._save();
		const lists = JSON.parse(game.settings.get('obsidian', 'spell-class-lists'));
		const cls = $(evt.currentTarget).prev().val();
		delete lists[cls];
		await game.settings.set('obsidian', 'spell-class-lists', JSON.stringify(lists));
		this.render(false);
	}

	/**
	 * @private
	 */
	_save () {
		const lists = JSON.parse(game.settings.get('obsidian', 'spell-class-lists'));
		const classes = Array.from(this.element.find('input')).map(input => input.value);
		for (const key of Object.keys(lists)) {
			if (!OBSIDIAN.Rules.CLASSES.includes(key) && !classes.includes(key)) {
				delete lists[key];
			}
		}

		for (const cls of classes) {
			if (!Array.isArray(lists[cls])) {
				lists[cls] = [];
			}
		}

		return game.settings.set('obsidian', 'spell-class-lists', JSON.stringify(lists));
	}
}

class ObsidianTextBoxDialog extends Application {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 480;
		options.height = 640;
		options.classes = options.classes.concat(['dialog', 'obsidian-window']);
		options.template = 'modules/obsidian/html/dialogs/text-box.html';
		return options;
	}
}

class ObsidianImportSpellListDialog extends ObsidianTextBoxDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.title = game.i18n.localize('OBSIDIAN.ImportSpellLists');
		return options;
	}

	constructor (parent, ...args) {
		super(...args);
		this._parent = parent;
	}

	async close () {
		const json = this.element.find('.obsidian-json-dump').val();
		if (json.length) {
			try {
				this._parent._lists = JSON.parse(json);
				await game.settings.set('obsidian', 'spell-class-lists', json);
				this._parent.render(false);
			} catch (ignored) {}
		}

		return super.close();
	}
}

class ObsidianExportSpellListDialog extends ObsidianTextBoxDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.title = game.i18n.localize('OBSIDIAN.ExportSpellLists');
		return options;
	}

	getData (options) {
		const data = super.getData(options);
		data.json =
			JSON.stringify(JSON.parse(game.settings.get('obsidian', 'spell-class-lists')), null, 2);
		return data;
	}
}

export function addSettingsHook () {
	Hooks.on('renderSettingsConfig', (config, html) => {
		if (!game.user.isGM) {
			return;
		}

		const parent = html.find('[data-tab="modules"] .settings-list');
		const children = parent.children();

		if (children.length > 0
			&& children[0].tagName === 'p'
			&& children[0].className === 'notes')
		{
			parent.empty();
		}

		parent.append($(`
			<h2 class="module-header">Obsidian</h2>
			<div class="form-group">
				<label>${game.i18n.localize('OBSIDIAN.SettingsConfSpellLists')}</label>
				<button type="button" class="obsidian-btn-outline" id="obsidian-config-spell-lists">
					<i class="fas fa-cogs"></i>
					${game.i18n.localize('OBSIDIAN.Configure')}
				</button>
			</div>
		`));

		parent.find('#obsidian-config-spell-lists').click(() =>
			new ObsidianSpellLists().render(true));
	});
}
