import {OBSIDIAN} from '../rules/rules.js';

export const Effect = {
	create: function () {
		return {
			name: game.i18n.localize('OBSIDIAN.NewEffect'),
			uuid: OBSIDIAN.uuid(),
			components: []
		};
	},

	newResource: function () {
		return {
			name: '',
			type: 'resource',
			uuid: OBSIDIAN.uuid(),
			recharge: 'long',
			bonus: 0,
			operator: 'plus',
			key: 'abl',
			min: 0,
			uses: 'fixed',
			fixed: 0
		};
	}
};
