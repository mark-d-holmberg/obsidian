class ObsidianSkillsDialog extends ObsidianArrayDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 440;
		return options;
	}

	get cls () {
		return 'skill';
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
