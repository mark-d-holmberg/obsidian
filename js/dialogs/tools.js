import {ObsidianArrayDialog} from './array.js';

export class ObsidianToolsDialog extends ObsidianArrayDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 650;
		return options;
	}

	get cls () {
		return 'tool';
	}

	get flag () {
		return this.options.dataPath;
	}

	get item () {
		return {
			ability: 'str',
			bonus: 0,
			value: 0,
			label: '',
			custom: true
		};
	}
}
