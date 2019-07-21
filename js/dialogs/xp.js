class ObsidianXPDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/xp-dialog.html';
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('input[name="addRemoveXP"]').keypress((evt) => {
			if (evt.key === 'Enter') {
				this.close();
			}
		});
	}

	/**
	 * @private
	 */
	_onSubmit (event, {preventClose = false} = {}) {
		const xpDeltaStr = this.element.find('input[name="addRemoveXP"]').val();
		if (xpDeltaStr != null && xpDeltaStr !== '') {
			const delta = Number(xpDeltaStr);
			if (!isNaN(delta)) {
				this.element.find('input[name="data.details.xp.value"]')
					.val(Number(this.parent.actor.data.data.details.xp.value) + delta);
			}
		}

		return super._onSubmit(event, {preventClose: preventClose});
	}
}
