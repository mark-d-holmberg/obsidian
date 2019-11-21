class ObsidianViewDialog extends ObsidianDialog {
	constructor (itemID, parent, options = {}) {
		const item = parent.actor.data.items.find(item => item.id === itemID);
		if (item.type === 'backpack') {
			options.width = 578;
			options.register = true;
		}

		super(parent, options);
		this.item = item;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 520;
		options.modal = false;
		return options;
	}

	get template () {
		return `public/modules/obsidian/html/dialogs/${this.item.type}-view.html`;
	}

	get title () {
		return this.item.name;
	}

	/**
	 * @param {JQuery} html
	 * @returns undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);

		html.on('dragend', () => {
			if (this.element) {
				this.element.find('.obsidian-drag-indicator').css('display', 'none');
			}
		});

		html.find('.obsidian-tr').each((i, row) => {
			row.setAttribute('draggable', 'true');
			row.addEventListener('dragstart', Obsidian.Reorder.dragStart, false);
		});

		this.form.ondragover = Obsidian.Reorder.dragOver;
		this.form.ondrop = () => Obsidian.Reorder.drop(this.parent.actor, event);

		html.find('.obsidian-feature-use').click(async evt => {
			await this.parent._onUseClicked.bind(this.parent)(evt);
			this.render(false);
		});

		html.find('[data-sheet]').click(() => {
			const Item = CONFIG.Item.entityClass;
			const item = new Item(this.item, {actor: this.parent.actor});
			item.sheet.render(true);
		});

		if (this.item.type === 'backpack') {
			ObsidianDialog.recalculateHeight(html);
		}
	}

	getData () {
		const data = super.getData();
		data.item = this.item;
		return data;
	}

	async minimize () {
		await super.minimize();
		this.element
			.css('width', 300)
			.find('.obsidian-pin, .obsidian-roll, .obsidian-titlebar-uses')
			.show();

	}

	/**
	 * @private
	 */
	async _renderOuter (options) {
		const html = await super._renderOuter(options);
		const pin = $('<a class="obsidian-pin"><i class="fas fa-thumbtack"></i></a>');
		const close = html.find('a.close');
		close.html('<i class="fas fa-times"></i>');
		pin.insertBefore(close);

		let rollType = null;
		switch (this.item.type) {
			case 'weapon': rollType = 'atk'; break;
			case 'feat': rollType = 'feat'; break;
			case 'spell': rollType = 'spl'; break;
		}

		if (rollType) {
			const roll =
				$('<a class="obsidian-roll"><i class="fas fa-dice-d20"></i></a>')
					.insertBefore(pin);

			if (this.item.type === 'spell') {
				roll.click(this.parent.actor.sheet._onCastSpell.bind(this.parent.actor.sheet));
			} else {
				roll.click(evt => Obsidian.Rolls.fromClick(this.parent.actor, evt));
			}

			roll[0].dataset.roll = rollType;
			roll[0].dataset[rollType] = this.item.id;

			if (this.item.type === 'feat' && this.item.flags.obsidian.uses.enabled) {
				this._renderUses().insertBefore(roll);
			}
		}

		return html;
	}

	/**
	 * @private
	 * @return {JQuery}
	 */
	_renderUses () {
		const uses = $('<div class="obsidian-titlebar-uses"></div>');
		const remaining =
			$('<input type="text" data-dtype="Number">')
				.val(this.item.flags.obsidian.uses.remaining);

		uses.append(remaining)
			.append($('<span>&sol;</span>'))
			.append($(`<strong>${this.item.flags.obsidian.uses.max}</strong>`));

		remaining.focusout(async () => {
			const n = Number(remaining.val());
			await this.parent.actor.updateOwnedItem({
				id: this.item.id,
				flags: {obsidian: {uses: {remaining: n}}}
			});
			this.render(false);
		});

		remaining.keyup(evt => {
			if (evt.key === 'Enter') {
				remaining.blur();
			}
		});

		return uses;
	}
}
