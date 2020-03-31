export class ObsidianTabs {
	constructor (nav, {initial, callback}) {
		this._nav = nav;
		this._callback = callback;
		this._container = this._nav.closest('.app');
		initial =
			initial ? this._nav.children(`[data-tab="${initial}"]`) : this._nav.children('.active');

		if (!initial.length) {
			initial = this._nav.children().first();
		}

		this._toggle(initial);
		this._nav.on('click', '.item', evt => {
			evt.preventDefault();
			const tab = $(evt.currentTarget);
			this._toggle(tab);
			this._callback(tab);
		});
	}

	_toggle (tab) {
		const group = this._container.find(`.tab[data-group="${this._nav.data('group')}"]`);
		tab.siblings().removeClass('active');
		tab.addClass('active');
		group.removeClass('active');
		group.filter(`[data-tab="${tab.data('tab')}"]`).addClass('active');
	}
}
