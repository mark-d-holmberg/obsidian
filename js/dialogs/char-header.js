class ObsidianHeaderDetailsDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 420;
		options.title = game.i18n.localize('OBSIDIAN.EditDetails');
		return options;
	}

	get template () {
		return 'public/modules/obsidian/html/dialogs/header-details.html';
	}

	/**
	 * @param html {JQuery}
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-class').click(this._onAddClass.bind(this));
		html.find('.obsidian-rm-class').click(this._onRemoveClass.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	setModal (modal) {
		const win = $(this.form).closest('.obsidian-window');
		if (modal) {
			win.addClass('obsidian-background');
		} else {
			win.removeClass('obsidian-background');
		}
	}

	/**
	 * @private
	 */
	async _onAddClass (evt) {
		evt.preventDefault();
		evt.stopPropagation();
		new ObsidianNewClassDialog(this, {callback: this._onNewClass.bind(this)}).render(true);
	}

	/**
	 * @private
	 */
	async _onNewClass (dlg) {

	}

	/**
	 * @private
	 */
	async _onRemoveClass (evt) {
		evt.preventDefault();
		const classes = this.parent.actor.getFlag('obsidian', 'classes');
		const newClasses = ObsidianDialog.removeRow(classes, evt);
		const update = {'flags.obsidian.classes': newClasses};
		await this.parent.actor.updateClasses(classes, newClasses, update);
		await this.parent.actor.update(update);
		this.render(false);
	}
}
