import {OBSIDIAN} from '../global.js';
import {Effect} from '../module/effect.js';

export const v6 = {
	convertBonuses: function (data) {
		for (const effect of data.flags.obsidian.effects) {
			for (const component of effect.components) {
				if (component.type !== 'bonus' || component.formula) {
					continue;
				}

				const bonuses = [];
				if (component.prof > 0) {
					bonuses.push('prof');
				}

				if (!OBSIDIAN.notDefinedOrEmpty(component.ability)) {
					bonuses.push('abl');
				}

				if (!OBSIDIAN.notDefinedOrEmpty(component.level)) {
					bonuses.push('level');
				}

				let newBonus;
				if (bonuses.length) {
					newBonus = makeBonus(component, bonuses.shift());
					['uuid', 'name', 'bonus', 'ndice', 'die'].forEach(prop => delete newBonus[prop]);
				}

				if (bonuses.length) {
					effect.components.push(...bonuses.map(bonus => makeBonus(component, bonus)));
				}

				if (newBonus) {
					mergeObject(component, newBonus);
				}
			}
		}
	}
};

function makeBonus (original, type) {
	const bonus = Effect.createComponent('bonus');
	bonus.formula = true;

	switch (type) {
		case 'prof':
			bonus.value = 'prof';
			bonus.operator = 'mult';
			bonus.constant = Number(original.prof);
			break;

		case 'abl':
			bonus.value = 'abl';
			bonus.ability = original.ability;
			break;

		case 'level':
			bonus.value = original.level;
			bonus.class = original.class;
	}

	return bonus;
}
