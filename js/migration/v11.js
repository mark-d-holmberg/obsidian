import {Rules} from '../rules/rules.js';

export const v11 = {
	convertSpeed: function (data) {
		if (data.type === 'vehicle') {
			return;
		}

		const oldSpeed = data.flags.obsidian.attributes.speed;
		const movement = data.data.attributes.movement;

		Rules.SPEEDS.forEach(spd => {
			if (oldSpeed[spd]) {
				movement[spd] = oldSpeed[spd].override;

				if (spd === 'fly') {
					movement.hover = oldSpeed.fly.hover;
				}
			}
		})
	}
};
