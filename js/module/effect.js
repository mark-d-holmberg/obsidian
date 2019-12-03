import {OBSIDIAN} from '../rules/rules.js';

export const Effect = {
	create: function () {
		return {
			name: game.i18n.localize('OBSIDIAN.NewEffect'),
			uuid: OBSIDIAN.uuid()
		};
	}
};
