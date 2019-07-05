class ObsidianDialog extends Dialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.classes.push('obsidian-window');
		return options;
	}

	activateListeners (html) {
		super.activateListeners(html);
		if (this.data.close) {
			html.parents('.obsidian-window').find('a.close').click(this.data.close);
		}
	}
}

class ObsidianHeaderDetailsDialog extends ObsidianDialog {
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-class')
			.click(ObsidianHeaderDetailsDialog._addClass.bind(this, html));
	}

	/**
	 * @private
	 */
	static _addClass (html) {
		let siblings = html.find('.obsidian-form-row');
		if (siblings.length < 1) {
			siblings = html.find('label');
		}

		const sibling = siblings.last();
		const classes = Object.keys(ObsidianRules.ClassHitDice);
		const container = $('<div></div>');
		/** @type {JQuery} */ const classSelect = $('<select></select>').appendTo(container);
		$('<input class="obsidian-input-compact" type="text" name="subclass" '
			+ 'placeholder="Subclass">')
			.appendTo(container);
		$('<input class="obsidian-input-compact obsidian-input-num" type="text" name="level" '
			+ 'value="1">')
			.appendTo(container);
		/** @type {JQuery} */ const hdSelect = $('<select></select>').appendTo(container);
		const rmBtn = $('<button type="button" class="obsidian-btn-negative">Remove</button>');

		classSelect.change(ObsidianHeaderDetailsDialog._selectHD);
		rmBtn.click(ObsidianHeaderDetailsDialog._removeClass);
		classes.map(cls => $(`<option>${cls}</option>`)).forEach(opt => classSelect.append(opt));
		[12, 10, 8, 6]
			.map(die => $(`<option>d${die}</option>`))
			.forEach(opt => hdSelect.append(opt));

		/** @type {JQuery} */ const row =
			$('<div class="obsidian-form-row obsidian-inline"></div>')
				.append(container)
				.append(rmBtn)
				.insertAfter(sibling);

		const win = html.parents('.dialog');
		const winHeight = win.height();
		win.height(winHeight + row.height());
	}

	/**
	 * @private
	 */
	static _removeClass (evt) {
		/** @type {JQuery} */ const row = $(evt.currentTarget).parent();
		const win = row.parents('.dialog');
		const winHeight = win.height();
		win.height(winHeight - row.height());
		row.remove();
	}

	/**
	 * @private
	 */
	static _selectHD (evt) {
		const cls = $(evt.currentTarget);
		const hd = `d${ObsidianRules.ClassHitDice[cls.val()]}`;
		const hdSelect = cls.siblings('select')[0];

		for (let i = 0; i < hdSelect.childNodes.length; i++) {
			const opt = hdSelect.childNodes[i];
			if (opt.value === hd) {
				hdSelect.selectedIndex = i;
				break;
			}
		}
	}
}
