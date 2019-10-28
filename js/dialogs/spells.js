class ObsidianSpellsDialog extends ObsidianDialog {
	constructor (...args) {
		super(...args);
		this._filters = [];
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 520;
		options.height = 700;
		options.title = game.i18n.localize('OBSIDIAN.ManageSpells');
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/dialogs/spells.html';
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-spell-action').click(this._onSpellAction.bind(this));
		html.find('.obsidian-input-search').keyup(this._filterOnName.bind(this));
		html.find('.obsidian-spell-level-tab').click(this._filterOnLevel.bind(this));
		html.find('.obsidian-clear-search').click(evt => {
			const target = $(evt.currentTarget);
			const search = target.siblings('input');
			search.val('');
			this._filterOnName({currentTarget: search[0]});
		});
	}

	getData () {
		const data = super.getData();
		data.ObsidianData = Obsidian.Data;

		const classByID =
			new Map(data.actor.flags.obsidian.classes.map(cls => {
				cls.totalCantrips = 0;
				cls.totalPrepared = 0;
				cls.totalKnown = 0;
				return [cls.id, cls];
			}));

		data.actor.obsidian.spells = {custom: []};
		Object.keys(Obsidian.Rules.CLASS_SPELL_MODS)
			.forEach(key => data.actor.obsidian.spells[key] = {known: [], prepared: [], book: []});

		for (const spell of Object.values(
			data.actor.items.filter(item => item.type === 'spell')))
		{
			const flags = spell.flags.obsidian;
			if (!flags || flags.source.type !== 'class') {
				data.actor.obsidian.spells.custom.push(spell);
				continue;
			}

			const cls = classByID.get(flags.source.class);
			if (cls === undefined) {
				data.actor.obsidian.spells.custom.push(spell);
				continue;
			}

			if (spell.data.level.value === 0) {
				cls.totalCantrips++;
			} else if (flags.known) {
				cls.totalKnown++;
			} else if (flags.prepared) {
				cls.totalPrepared++;
			}

			if (data.actor.obsidian.spells[cls.name]) {
				const clsSpells = data.actor.obsidian.spells[cls.name];
				if (spell.data.level.value === 0) {
					clsSpells.known.push(spell);
					clsSpells.prepared.push(spell);
					clsSpells.book.push(spell);
				} else if (cls.preparation === 'known' && flags.known) {
					clsSpells.known.push(spell);
				} else if (cls.preparation === 'prep' && flags.prepared) {
					clsSpells.prepared.push(spell);
				} else if (cls.preparation === 'book') {
					if (flags.book) {
						clsSpells.book.push(spell);
					}

					if (flags.prepared) {
						clsSpells.prepared.push(spell);
					}
				}
			} else {
				data.actor.obsidian.spells.custom.push(spell);
			}
		}

		Object.values(data.actor.obsidian.spells).forEach(entry => {
			if (Array.isArray(entry)) {
				entry.sort(Obsidian.spellComparator);
			} else {
				Object.values(entry).forEach(list => list.sort(Obsidian.spellComparator));
			}
		});

		return data;
	}

	/**
	 * @private
	 */
	_applyFilters () {
		const filterBlocks = this.element.find('.obsidian-spell-filter');
		filterBlocks.each((_, el) =>
			$(el).find('.obsidian-spell-level-tab').removeClass('obsidian-active'));

		this._filters.forEach((filter, id) => {
			const levels =
				filter.levels
					.map((on, lvl) => [lvl, on])
					.filter(([_, on]) => on)
					.map(([lvl, _]) => lvl);

			const filterBlock = $(filterBlocks[id]);
			filterBlock.find('.obsidian-spell-level-tab').each((_, el) => {
				if (levels.includes(Number(el.dataset.value))) {
					$(el).addClass('obsidian-active');
				}
			});

			filterBlock.next().find('details').each((i, el) => {
				el.className = '';
				if (filter.name !== undefined
					&& filter.name.length > 0
					&& !el.dataset.name.toLowerCase().includes(filter.name))
				{
					el.className = 'obsidian-hidden';
					return;
				}

				if (levels.length > 0 && !levels.includes(Number(el.dataset.level))) {
					el.className = 'obsidian-hidden';
				}
			});
		});
	}

	/**
	 * @private
	 * @param {JQuery} el
	 */
	_filterIDFromElement (el) {
		const allFilterBlocks = this.element.find('.obsidian-spell-filter');
		for (let i = 0; i < allFilterBlocks.length; i++) {
			if (el[0] === allFilterBlocks[i]) {
				return i;
			}
		}
	}

	/**
	 * @private
	 */
	_filterOnLevel (evt) {
		const target = $(evt.currentTarget);
		const level = Number(target.data('value'));
		const filter = this._getFilterFromEvent(evt);
		filter.levels[level] = !filter.levels[level];
		this._applyFilters();
	}

	/**
	 * @private
	 */
	_filterOnName (evt) {
		const target = $(evt.currentTarget);
		const filter = this._getFilterFromEvent(evt);
		filter.name = target.val();
		this._applyFilters();
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	_getFilterFromEvent (evt) {
		const target = $(evt.currentTarget);
		const filterBlock = target.closest('.obsidian-spell-filter');
		const filterID = this._filterIDFromElement(filterBlock);
		let filter = this._filters[filterID];

		if (filter === undefined) {
			filter = {levels: []};
			this._filters[filterID] = filter;
		}

		return filter;
	}

	/**
	 * @private
	 * @param {JQuery.TriggeredEvent} evt
	 */
	async _onSpellAction (evt) {
		const row = $(evt.currentTarget).closest('details');
		const id = Number(row.data('item-id'));
		const list = row.data('spell-list');
		const owned = list === '';
		let spell;

		if (owned) {
			spell = this.parent.actor.data.items.find(item => item.id === id);
		} else {
			spell = Obsidian.Data.SPELLS_BY_CLASS[list][id];
		}

		if (spell === undefined) {
			return;
		}

		const flags = spell.flags.obsidian;
		if (owned) {
			if (flags.source.type === 'class') {
				const cls =
					this.parent.actor.data.flags.obsidian.classes.find(cls =>
						cls.id === flags.source.class);

				if (cls) {
					if (spell.data.level.value === 0 || cls.preparation !== 'book') {
						await this.parent.actor.deleteOwnedItem(id);
					} else {
						flags.prepared = !flags.prepared;
					}
				}
			} else {
				await this.parent.actor.deleteOwnedItem(id);
			}
		} else {
			const exists =
				this.parent.actor.data.items.find(item =>
					item.type === 'spell' && item.name === spell.name);

			if (exists) {
				await this.parent.actor.deleteOwnedItem(exists.id);
			} else {
				flags.source.type = 'class';
				flags.source.class = list;
				await this.parent.actor.createOwnedItem(spell);
			}
		}

		this.render(false);
	}

	/**
	 * @private
	 */
	async _render (force = false, options = {}) {
		this._saveViewState();
		await super._render(force, options);
		this._restoreViewState();
	}

	/**
	 * @private
	 */
	_restoreViewState () {
		if (this.element && Array.isArray(this._detailState)) {
			this.element.find('.obsidian > details')
				.each((i, el) => {
					el.open = this._detailState[i];
				});
		}

		if (this.element && this._scroll !== undefined) {
			const win = this.element.find('.window-content');
			if (win.length > 0) {
				win[0].scrollTop = this._scroll;
			}
		}
	}

	/**
	 * @private
	 */
	_saveViewState () {
		if (this.element) {
			this._detailState =
				Array.from(this.element.find('.obsidian > details')).map(el => el.open);

			const win = this.element.find('.window-content');
			if (win.length > 0) {
				this._scroll = win[0].scrollTop;
			}
		}
	}
}
