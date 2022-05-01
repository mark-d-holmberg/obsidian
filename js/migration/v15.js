import {OBSIDIAN} from '../global.js';

export const v15 = {
	convertClass: function (data) {
		if (data.type === 'class') {
			return;
		}

		if (data.name === 'custom' && data.flags.obsidian.custom) {
			data.name = data.flags.obsidian.custom;
		} else {
			const cls =
				Object.entries(OBSIDIAN.Config.CLASS_MAP).find(([, v]) => data.name === v)?.[0];

			if (cls) {
				data.name = game.i18n.localize(`OBSIDIAN.Class.${cls}`);
			}
		}
	}
};
