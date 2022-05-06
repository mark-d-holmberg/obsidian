import {OBSIDIAN} from '../global.js';
import {toSlug} from '../data.js';

// noinspection JSClosureCompilerSyntax
export default class ObsidianSpellLists extends FormApplication {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 800;
		options.height = 600;
		options.classes =
			options.classes.concat(['dialog', 'obsidian-window', 'obsidian-2-pane-window']);
		options.template = 'modules/obsidian/html/dialogs/spell-class-lists.html';
		options.title = game.i18n.localize('OBSIDIAN.SettingsConfSpellLists');
		options.closeOnSubmit = false;
		options.submitOnClose = false;
		return options;
	}

	constructor (...args) {
		super(...args);
		this._lists = JSON.parse(game.settings.get('obsidian', 'spell-class-lists'));
		this._filters = {left: [], right: []};

		for (let i = 0; i < 10; i++) {
			['left', 'right'].forEach(k => this._filters[k][i] = false);
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

	async close () {
		OBSIDIAN.computeSpellsByClass(this._lists);
		return super.close();
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
				this._filters[filter]
					.map((f, i) => [f, i])
					.filter(([f]) => f)
					.map(([, i]) => i);

			const name =
				this.element.find(`.obsidian-input-search[data-prop="${filter}"]`)
					.val().toLowerCase();

			if (name.length && !spell.name.toLowerCase().includes(name)) {
				return false;
			}

			return !(levels.length && !levels.includes(spell.data.data.level));
		};

		const allList = this.element.find('#obsidian-all-spells').empty();
		const clsList = this.element.find('#obsidian-class-spells').empty();
		const cls = this.element.find('#obsidian-class-list').val();
		const [left, right] = [[], []];
		let list = [];

		if (this._lists[cls]) {
			list = this._lists[cls];
		}

		for (const [slug, spell] of OBSIDIAN.Data.SPELLS_BY_SLUG) {
			const inList = list.includes(slug);

			if (inList && matchesFilter('right', spell)) {
				right.push(spell);
			} else if (!inList && matchesFilter('left', spell)) {
				left.push(spell);
			}
		}

		const sort = (a, b) => a.name.localeCompare(b.name);
		left.sort(sort);
		right.sort(sort);

		[[left, allList], [right, clsList]].forEach(([spells, el]) => spells.forEach(spell =>
			el.append(`<option value="${toSlug(spell.name)}">${spell.name}</option>`)));
	}

	/**
	 * @private
	 */
	_onLevelFilter (evt) {
		const key = evt.currentTarget.dataset.value;
		const prop = evt.currentTarget.closest('.obsidian-tab-bar').dataset.prop;
		this._filters[prop][key] = !this._filters[prop][key];
		this.element.find('.obsidian-spell-level-tab').removeClass('obsidian-active');

		for (let i = 0; i < 10; i++) {
			['left', 'right'].forEach(k => {
				if (this._filters[k][i]) {
					this.element
						.find(`ul[data-prop="${k}"] .obsidian-sub-tab[data-value="${i}"]`)
						.addClass('obsidian-active');
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
				.filter(cls => !Object.values(OBSIDIAN.Config.CLASS_MAP).includes(cls));

		data.max = Math.max(data.classes.length, 9);
		return data;
	}

	/**
	 * @private
	 */
	async _onAddClass () {
		this.element.find('form').append($(`
			<div class="obsidian-form-row">
				<input type="text" class="obsidian-input-lg obsidian-input-max">
			</div>`));
	}

	/**
	 * @private
	 */
	_save () {
		const lists = JSON.parse(game.settings.get('obsidian', 'spell-class-lists'));
		const classes = Array.from(this.element.find('input')).reduce((acc, input) => {
			if (input.value.length) {
				acc.push(input.value);
			}

			return acc;
		}, []);

		for (const key of Object.keys(lists)) {
			if (!Object.values(OBSIDIAN.Config.CLASS_MAP).includes(key) && !classes.includes(key)) {
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
