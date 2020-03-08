export class ObsidianStandaloneDialog extends Application {
	constructor (config, options) {
		super(options);
		this._config = config;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.classes = ['form', 'dialog', 'obsidian-window'];
		options.submitOnClose = false;
		options.submitOnChange = false;
		options.closeOnSubmit = true;
		options.pinnable = false;
		return options;
	}

	getData (options) {
		const data = super.getData(options);
		data.ObsidianRules = OBSIDIAN.Rules;

		if (this._config.actor) {
			data.actor = duplicate(this._config.actor.data);
		}

		return data;
	}

	async close () {
		if (this._config.parent && this._config.parent.setModal) {
			this._config.parent.setModal(false);
		}

		return super.close();
	}

	render (force = false, options = {}) {
		if (this._config.parent && this._config.parent.setModal) {
			this._config.parent.setModal(true);
		}

		return super.render(force, options);
	}
}
