import {Effect} from '../module/effect.js';

export const v10 = {
	convertAmmo: function (data) {
		if (data.flags?.obsidian?.ammo?.id) {
			data.flags.obsidian.ammo = data.flags.obsidian.ammo.id;
		}
	},

	convertBonuses: function (data) {
		for (const effect of data.flags.obsidian.effects) {
			const newBonuses = [];
			for (const component of effect.components) {
				if (component.type !== 'bonus') {
					continue;
				}

				component.method = 'dice';
				const dice = component.ndice !== 0 || component.bonus !== 0;
				const formula = component.constant !== 0 || component.value !== '';

				if (!formula) {
					continue;
				}

				if (formula && !dice) {
					component.method = 'formula';
					continue;
				}

				const bonus = Effect.createComponent('bonus');
				bonus.formula = true;
				bonus.method = 'formula';
				bonus.constant = component.constant;
				bonus.value = component.value;
				bonus.ability = component.ability;
				bonus.class = component.class;
				newBonuses.push(bonus);
			}

			effect.components.push(...newBonuses);
		}
	}
};
