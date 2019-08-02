class ObsidianHDDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		options.title = 'Override HD';
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/hd-dialog.html';
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-hd').click(this._onAddHD.bind(this));
		html.find('.obsidian-rm-hd').click(this._onRemoveHD.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	/**
	 * @private
	 */
	async _onAddHD (evt) {
		evt.preventDefault();
		const hd = duplicate(this.parent.actor.data.flags.obsidian.attributes.hd);
		const existingHD = Object.keys(hd);
		const availableHD = ObsidianRules.HD.filter(x => !existingHD.includes(String(x)));

		if (availableHD.length > 0) {
			const newHD = availableHD[0];
			hd[newHD] = {
				max: 0,
				value: 0,
				override: 1
			};

			await this.parent.actor.update({'flags.obsidian.attributes.hd': hd});
			this.render(false);
		}
	}

	/**
	 * @private
	 */
	async _onRemoveHD (evt) {
		evt.preventDefault();
		const hd = duplicate(this.parent.actor.data.flags.obsidian.attributes.hd);
		const row = $(evt.currentTarget).parents('.obsidian-form-row');
		const hdVal = row.find('select').val();
		const removedHD = hd[hdVal];

		if (removedHD !== undefined) {
			delete removedHD.override;
			if (removedHD.max === 0) {
				delete hd[hdVal];
			}

			await this.parent.actor.update({'flags.obsidian.attributes.hd': hd});
			this.render(false);
		}
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		const total = {};
		this.element.find('select').each((i, el) => {
			const jqel = $(el);
			const hd = jqel.val();
			const add = parseInt(jqel.siblings().val());

			if (!isNaN(add)) {
				if (total[hd] === undefined) {
					total[hd] = add;
				} else {
					total[hd] += add;
				}
			}
		});

		const hd = duplicate(this.parent.actor.data.flags.obsidian.attributes.hd);
		for (const [key, val] of Object.entries(total)) {
			if (hd[key] === undefined) {
				hd[key] = {
					max: 0,
					value: 0,
					override: val
				};
			} else {
				hd[key].override = val;
			}
		}

		for (const key of Object.keys(hd)) {
			if (total[key] === undefined && hd[key].max === 0) {
				delete hd[key];
			}
		}

		formData = {'flags.obsidian.attributes.hd': hd};
		super._updateObject(event, formData);
	}
}
