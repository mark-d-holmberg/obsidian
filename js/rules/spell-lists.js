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

	activateListeners (html) {
		super.activateListeners(html);
		html.find('#obsidian-class-list').change(this._computeDifference.bind(this));
		html.find('#obsidian-manage-custom-lists').click(() =>
			new ObsidianCustomListManager(this).render(true));
		this._computeDifference();
	}

	getData (options) {
		const data = super.getData(options);
		data.lists = JSON.parse(game.settings.get('obsidian', 'spell-class-lists'));
		data.spells = OBSIDIAN.Data.SPELLS_BY_SLUG;
		return data;
	}

	/**
	 * @private
	 */
	_computeDifference () {
		const allList = this.element.find('#obsidian-all-spells').empty();
		const clsList = this.element.find('#obsidian-class-spells').empty();
		const cls = this.element.find('#obsidian-class-list').val();
		const lists = JSON.parse(game.settings.get('obsidian', 'spell-class-lists'));
		let list = [];

		if (lists[cls]) {
			list = lists[cls];
		}

		for (const [slug, spell] of OBSIDIAN.Data.SPELLS_BY_SLUG) {
			const opt = $(`<option value="${slug}">${spell.name}</option>`);
			if (list.includes(slug)) {
				clsList.append(opt);
			} else {
				allList.append(opt);
			}
		}
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

export function addSettingsHook () {
	Hooks.on('renderSettingsConfig', (config, html) => {
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
