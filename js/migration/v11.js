import {Config} from '../data/config.js';

export const v11 = {
	convertSpeed: function (data) {
		if (data.type === 'vehicle') {
			return;
		}

		const oldSpeed = data.flags.obsidian.attributes.speed;
		const movement = data.data.attributes.movement;

		Config.SPEEDS.forEach(spd => {
			if (oldSpeed[spd]) {
				movement[spd] = oldSpeed[spd].override;

				if (spd === 'fly') {
					movement.hover = oldSpeed.fly.hover;
				}
			}
		})
	}
};
