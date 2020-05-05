import {OBSIDIAN} from '../global.js';
import {Effect} from '../module/effect.js';

export const v1 = {
	convertAttack: function (attack, type, category, magic = 0) {
		const component = Effect.newAttack();
		component.attack = type;
		component.category = category;
		component.ability = attack.stat;
		component.bonus = attack.bonus + magic;
		component.proficient = attack.proficient;
		return component;
	},

	convertConsumableUses: function (data, effect) {
		const uses = data.flags.obsidian.uses;
		if (uses.limit === 'unlimited') {
			data.flags.obsidian.unlimited = true;
		} else {
			const component = Effect.newResource();
			component.calc = 'formula';
			component.key = uses.ability;
			component.bonus = uses.bonus;
			component.recharge.time = 'never';
			component.name = game.i18n.localize('OBSIDIAN.Uses');
			effect.components.push(component);
		}
	},

	convertCharges: function (charges) {
		const component = Effect.newResource();
		component.fixed = charges.max;
		component.recharge.time = charges.recharge;
		component.recharge.calc = charges.rechargeType;
		component.recharge.ndice = charges.ndice;
		component.recharge.die = charges.die;
		component.recharge.bonus = charges.bonus;
		component.remaining = charges.remaining || 0;
		component.name = game.i18n.localize('OBSIDIAN.Charges');
		return component;
	},

	convertDamage: function (dmg, versatile = false, magic = 0) {
		const component = Effect.newDamage();
		component.ndice = dmg.ndice;
		component.ncrit = dmg.ncrit;
		component.die = dmg.die;
		component.ability = dmg.stat;
		component.bonus = dmg.bonus + magic;
		component.damage = dmg.type;
		component.versatile = versatile;

		return component;
	},

	convertSave: function (save) {
		const component = Effect.newSave();
		component.target = save.target;
		component.effect = save.effect;

		if (OBSIDIAN.notDefinedOrEmpty(save.fixed)) {
			component.calc = 'formula';
			component.ability = save.ability;
			component.prof = save.prof;
			component.bonus = save.bonus;
		} else {
			component.fixed = Number(save.fixed);
		}

		return component;
	},

	convertUses: function (uses, classMap) {
		let component;
		if (uses.type === 'formula') {
			component = Effect.newResource();
			component.recharge.time = uses.recharge;
			component.name = game.i18n.localize('OBSIDIAN.Uses');

			if (OBSIDIAN.notDefinedOrEmpty(uses.fixed)) {
				component.calc = 'formula';
				component.bonus = uses.bonus;
				component.operator = uses.operator;
				component.min = uses.min;
				component.key = uses.key;
				component.ability = uses.ability;

				const cls = classMap.get(uses.class);
				if (cls) {
					component.class = cls._id;
				} else {
					component.key = 'chr';
				}
			} else {
				component.fixed = Number(uses.fixed);
			}
		} else {
			// Unfortunately, item IDs have all been wiped by this point during
			// the core migration so we cannot re-link the resources.
			component = Effect.newConsume();
		}

		return component;
	}
};
