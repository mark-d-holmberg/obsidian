import {CONVERT} from './convert.js';

export const v5 = {
	convertActivation: function (data) {
		if (data.flags.obsidian.active === 'passive') {
			data.data.activation.type = 'none';
		} else {
			data.data.activation.type = CONVERT.activation[data.flags.obsidian.action];
		}
	},

	convertProficiencies: function (data) {
		const traits = data.data.traits;
		['weaponProf', 'armorProf', 'languages'].forEach(prop => {
			const prof = getProperty(traits, `${prop}.value`);
			if (!Array.isArray(prof)) {
				return;
			}

			traits[prop].value = prof.map(prof => {
				const convert = CONVERT.profs[prop];
				const key = convert.get(prof.toLowerCase());

				if (key) {
					return key;
				}

				return prof;
			});
		});
	}
};
