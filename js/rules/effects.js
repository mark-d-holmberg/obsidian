import {OBSIDIAN} from './rules.js';

let localize;

export function prepareToggleableEffects (actorData) {
	localize = game.i18n.localize.bind(game.i18n);
	for (const effect of actorData.obsidian.toggleable) {
		if (!effect.toggle) {
			effect.toggle = {active: true, display: ''};
		}

		if (!effect.mods.length && !effect.bonuses.length) {
			continue;
		}

		effect.toggle.display =
			oxfordComma(
				effect.bonuses.map(bonus => formatBonus(actorData, bonus))
					.concat(effect.mods.map(formatRollMod)))
				.capitalise();

		if (effect.filters.length) {
			let preposition = 'OBSIDIAN.On';
			if (!effect.mods.length) {
				preposition = 'OBSIDIAN.To';
			}

			effect.toggle.display += ` ${localize(preposition)} ${formatFilters(effect.filters)}`;
		}
	}
}

function formatFilters (filters) {
	const parts = [];
	for (const filter of filters) {
		parts.push(formatFilter(filter));
	}

	return oxfordComma(parts);
}

function formatBonus (actorData, bonus) {
	const parts = [];
	if (bonus.ndice !== 0) {
		let i18n = 'OBSIDIAN.AddLC';
		let ndice = bonus.ndice;

		if (ndice < 0) {
			i18n = 'OBSIDIAN.Subtract';
			ndice *= -1;
		}

		parts.push(`${localize(i18n)} ${ndice}d${bonus.die}`);
	}

	if (bonus.bonus !== 0) {
		let operator = '&plus;';
		let mod = bonus.bonus;

		if (mod < 0) {
			operator = '&minus;';
			mod *= -1;
		}

		parts.push(`<strong>${operator}${mod}</strong>`);
	}

	if (bonus.prof > 0) {
		const key = OBSIDIAN.Rules.PLUS_PROF[bonus.prof];
		parts.push(localize(`OBSIDIAN.BonusProf-${key}`));
	}

	if (!OBSIDIAN.notDefinedOrEmpty(bonus.ability)) {
		parts.push(
			localize('OBSIDIAN.BonusAbilityMod')
				.format(localize(`OBSIDIAN.Ability-${bonus.ability}`)));
	}

	if (!OBSIDIAN.notDefinedOrEmpty(bonus.level)) {
		if (bonus.level === 'chr') {
			parts.push(localize('OBSIDIAN.BonusCharLevel'));
		} else if (bonus.level === 'cls') {
			const cls = actorData.obsidian.classes(cls => cls._id === bonus.cls);
			if (cls) {
				parts.push(localize('OBSIDIAN.BonusClassLevel').format(cls.label));
			}
		}
	}

	return oxfordComma(parts);
}

function formatFilter (filter) {
	const parts = [];
	if (filter.filter === 'roll') {
		if (filter.roll === 'attack') {
			if (filter.multi === 'any') {
				parts.push(localize('OBSIDIAN.AttackRolls'));
			} else if (filter.collection.length) {
				weaponAttacks(filter, parts);
			}
		} else if (filter.roll === 'check') {
			if (filter.check === 'ability') {
				if (filter.multi === 'any') {
					parts.push(localize('OBSIDIAN.AbilityChecks'));
				} else if (filter.collection.length) {
					parts.push(...filter.collection.map(item =>
						localize(`OBSIDIAN.Ability-${item.key}`)));
					parts[parts.length - 1] += ` ${localize('OBSIDIAN.Checks')}`;
				}
			} else if (filter.check === 'skill') {
				if (filter.multi === 'any') {
					parts.push(localize('OBSIDIAN.SkillChecks'));
				} else if (filter.collection.length) {
					parts.push(...filter.collection.map(item => item.label));
					parts[parts.length - 1] += ` ${localize('OBSIDIAN.Checks')}`;
				}
			} else if (filter.check === 'tool') {
				if (filter.multi === 'any') {
					parts.push(localize('OBSIDIAN.ToolChecks'));
				} else if (filter.collection.length) {
					parts.push(...filter.collection.map(item => item.label));
					parts[parts.length - 1] += ` ${localize('OBSIDIAN.Checks')}`;
				}
			} else if (filter.check === 'init') {
				parts.push(localize('OBSIDIAN.InitiativeRolls'));
			}
		} else if (filter.roll === 'save') {
			if (filter.multi === 'any') {
				parts.push(localize('OBSIDIAN.SavingThrowsLC'));
			} else if (filter.collection.length) {
				parts.push(...filter.collection.map(item =>
					localize(`OBSIDIAN.Ability-${item.key}`)));
				parts[parts.length - 1] += ` ${localize('OBSIDIAN.Saves')}`;
			}
		} else if (filter.roll === 'damage') {
			if (filter.multi === 'any') {
				parts.push(localize('OBSIDIAN.DamageRolls'));
			} else if (filter.collection.length && filter.dmg === 'damage') {
				parts.push(...filter.collection.map(item => item.label));
				parts[parts.length - 1] += ` ${localize('OBSIDIAN.DamageRolls')}`;
			} else if (filter.collection.length && filter.dmg === 'attack') {
				weaponAttacks(filter, parts);
				parts[0] = `${localize('OBSIDIAN.DamageRollsWith')} ${parts[0]}`;
			}
		}
	} else if (filter.filter === 'score') {
		if (filter.score === 'ability') {
			if (filter.multi === 'any') {
				parts.push(localize('OBSIDIAN.AbilityScores'));
			} else if (filter.collection.length) {
				parts.push(...filter.collection.map(item =>
					localize(`OBSIDIAN.Ability-${item.key}`)));
				parts[parts.length - 1] += ` ${localize('OBSIDIAN.AbilityScores')}`;
			}
		} else if (filter.score === 'ac') {
			parts.push(localize('OBSIDIAN.ACAbbr'));
		} else if (filter.score === 'max-hp') {
			parts.push(localize('OBSIDIAN.MaxHPLC'));
		} else if (filter.score === 'passive') {
			if (filter.multi === 'any') {
				parts.push(localize('OBSIDIAN.PassiveChecks'));
			} else {
				parts.push(...filter.collection.map(item => item.label));
				parts[0] = `${localize('OBSIDIAN.PassiveLC')} ${parts[0]}`;
				parts[parts.length - 1] += ` ${localize('OBSIDIAN.Checks')}`;
			}
		} else if (filter.score === 'speed') {
			if (filter.multi === 'any') {
				parts.push(localize('OBSIDIAN.YourSpeed'));
			} else {
				parts.push(...filter.collection.map(item =>
					localize(`OBSIDIAN.Speed-${item.key}`)));
				parts[0] = `${localize('OBSIDIAN.Your')} ${parts[0]}`;
				parts[parts.length - 1] += ` ${localize('OBSIDIAN.SpeedLC')}`;
			}
		} else if (filter.score === 'dc') {
			if (filter.multi === 'any') {
				parts.push(localize('OBSIDIAN.SaveDCs'));
			} else {
				parts.push(...filter.collection.map(item =>
					localize(`OBSIDIAN.Ability-${item.key}`)));
				parts[0] = `${localize('OBSIDIAN.Your')} ${parts[0]}`;
				parts[parts.length - 1] += ` ${localize('OBSIDIAN.DCs')}`;
			}
		}
	}

	return oxfordComma(parts);
}

function formatRollMod (mod) {
	const parts = [];
	if (mod.min > 1) {
		parts.push(localize('OBSIDIAN.RollModMin').format(mod.min));
	}

	if (mod.reroll > 1) {
		parts.push(localize('OBSIDIAN.RollModReroll').format(mod.reroll));
	}

	if (mod.ndice > 0) {
		parts.push(
			localize('OBSIDIAN.RollModExtraDice')
				.format(mod.ndice, localize(mod.ndice > 1 ? 'OBSIDIAN.Dice' : 'OBSIDIAN.Die')));
	}

	if (mod.mode !== 'reg') {
		parts.push(localize(`OBSIDIAN.Roll-${mod.mode}`));
	}

	return oxfordComma(parts);
}

function oxfordComma (parts) {
	if (parts.length) {
		if (parts.length < 2) {
			return parts[0];
		} else {
			let comma = ',';
			if (parts.length === 2) {
				comma = '';
			}

			const last = parts.pop();
			return `${parts.join(', ')}${comma} ${localize('OBSIDIAN.And')} ${last}`;
		}
	}

	return '';
}

function weaponAttacks (filter, parts) {
	if (filter.collection.length < 2) {
		parts.push(localize(`OBSIDIAN.AttackFullLC-${filter.collection[0].key}`));
	} else if (filter.collection.every(item => item.key[0] === 'm')) {
		parts.push(localize('OBSIDIAN.MeleeAttacks'));
	} else if (filter.collection.every(item => item.key[0] === 'r')) {
		parts.push(localize('OBSIDIAN.RangedAttacks'));
	} else if (filter.collection.every(item => item.key[1] === 'w')) {
		parts.push(localize('OBSIDIAN.WeaponAttacks'));
	} else if (filter.collection.every(item => item.key[1] === 's')) {
		parts.push(localize('OBSIDIAN.SpellAttacks'));
	} else {
		parts.push(...filter.collection.map(item =>
			localize(`OBSIDIAN.AttackFullLC-${item.key}`)));
	}
}
