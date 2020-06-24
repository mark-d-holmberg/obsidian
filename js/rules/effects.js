import {OBSIDIAN} from '../global.js';

let localize;
const multipliers = {0.5: 'OBSIDIAN.Half', 2: 'OBSIDIAN.Twice'}

export function prepareToggleableEffects (actorData) {
	localize = game.i18n.localize.bind(game.i18n);
	for (const effect of actorData.obsidian.toggleable) {
		effect.toggle.display =
			oxfordComma(
				effect.active.bonus.map(bonus => formatBonus(actorData, bonus))
					.concat(effect.active['roll-mod'].map(formatRollMod))
					.concat(formatDefenses(effect.active.defense))
					.filter(part => part.length))
				.capitalise();

		if (effect.filters.length) {
			let preposition = 'OBSIDIAN.On';
			if (!effect.active['roll-mod'].length) {
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

	let constant = bonus.bonus || 0;
	if (!OBSIDIAN.notDefinedOrEmpty(bonus.constant)
		&& bonus.constant !== 0
		&& bonus.operator === 'plus')
	{
		constant += bonus.constant;
	}

	if (constant !== 0) {
		let operator = '&plus;';
		let mod = constant;

		if (mod < 0) {
			operator = '&minus;';
			mod *= -1;
		}

		parts.push(`<strong>${operator}${mod}</strong>`);
	}

	const bonusApplies = bonus.operator === 'plus' || bonus.constant !== 0;
	let multiplier = '';

	if (bonus.operator === 'mult') {
		const naturalLang = multipliers[bonus.constant];
		if (naturalLang) {
			multiplier = localize(naturalLang);
		} else if (bonus.constant !== 1) {
			multiplier = localize(`${bonus.constant} &times;`);
		}

		multiplier += ' ';
	}

	let addOrSubtract = localize('OBSIDIAN.AddLC');
	if (bonusApplies && bonus.constant < 0) {
		addOrSubtract = localize('OBSIDIAN.Subtract');
	}

	if (bonusApplies && bonus.value === 'prof') {
		parts.push(localize('OBSIDIAN.BonusProf').format(addOrSubtract, multiplier));
	}

	if (bonusApplies && bonus.value === 'abl') {
		parts.push(localize('OBSIDIAN.BonusAbilityMod')
			.format(addOrSubtract, multiplier, localize(`OBSIDIAN.Ability-${bonus.ability}`)));
	}

	if (bonusApplies && bonus.value === 'chr') {
		parts.push(localize('OBSIDIAN.BonusCharLevel').format(addOrSubtract, multiplier));
	}

	if (bonusApplies && bonus.value === 'cls') {
		const cls = actorData.obsidian.classes.find(cls => cls._id === bonus.class);
		if (cls) {
			parts.push(localize('OBSIDIAN.BonusClassLevel')
				.format(addOrSubtract, multiplier, cls.flags.obsidian.label));
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
					parts.push(...filter.collection.map(item => {
						if (item.label) {
							return item.label;
						} else {
							return localize(`OBSIDIAN.Skill-${item.key}`);
						}
					}));
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
				parts.push(...filter.collection.map(item => {
					if (item.label) {
						return item.label;
					} else {
						return localize(`OBSIDIAN.Skill-${item.key}`);
					}
				}));
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

	if (parts.length && !OBSIDIAN.notDefinedOrEmpty(filter.mode)) {
		parts[parts.length - 1] += ' ' +
			localize('OBSIDIAN.WhenRollingAt')
				.format(localize(`OBSIDIAN.Roll-${filter.mode}`).toLowerCase());
	}

	if (parts.length && !OBSIDIAN.notDefinedOrEmpty(filter.usesAbility)) {
		parts[parts.length - 1] += ` ${localize('OBSIDIAN.Using')} `
			+ oxfordComma(
				Object.entries(filter.usesAbility.abilities)
					.filter(([_, v]) => v)
					.map(([k, _]) => localize(`OBSIDIAN.Ability-${k}`)),
				true);
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

function formatDefenses (defs) {
	const dmg = dmg => localize(`OBSIDIAN.Damage-${dmg}`);
	const vuln = new Set();
	const res = {
		noCondition: new Set(),
		nonMagical: new Set(),
		nonMagicalSil: new Set(),
		nonMagicalAdm: new Set()
	};

	const imm = {
		noCondition: new Set(),
		nonMagical: new Set(),
		nonMagicalSil: new Set(),
		nonMagicalAdm: new Set()
	};

	const conds = {
		imm: new Set(),
		adv: new Set(),
		dis: new Set()
	};

	defs.forEach(def => {
		if (def.sleep) {
			conds.imm.add('sleep');
		}

		if (def.disease) {
			conds.imm.add('disease');
		}

		if (def.defense === 'condition') {
			conds[def.condition.level].add(def.condition.condition);
		} else if (def.defense === 'damage') {
			if (def.damage.level === 'vuln') {
				vuln.add(def.damage.dmg);
			} else {
				const level = def.damage.level === 'res' ? res : imm;
				if (OBSIDIAN.notDefinedOrEmpty(def.damage.magic)) {
					level.noCondition.add(def.damage.dmg);
				} else {
					if (OBSIDIAN.notDefinedOrEmpty(def.damage.material)) {
						level.nonMagical.add(def.damage.dmg);
					} else if (def.damage.material === 'sil') {
						level.nonMagicalSil.add(def.damage.dmg);
					} else {
						level.nonMagicalAdm.add(def.damage.dmg);
					}
				}
			}
		}
	});

	const parts = [];
	if (vuln.size) {
		parts.push(
			localize('OBSIDIAN.VulnTo').format(oxfordComma(Array.from(vuln.values()).map(dmg))));
	}

	[['imm', 'ImmuneTo'], ['adv', 'AdvantageSave'], ['dis', 'DisadvantageSave']]
		.forEach(([level, i18n]) => {
			if (!conds[level].size) {
				return;
			}

			parts.push(localize(`OBSIDIAN.${i18n}`).format(
				oxfordComma(
					Array.from(conds[level].values())
						.map(cond => localize(`OBSIDIAN.Condition-${cond}`)))));
		});

	[res, imm].forEach(level => {
		const subParts = [];
		[
			['noCondition', ''],
			['nonMagical', 'FromNonmagical'],
			['nonMagicalSil', 'FromNonmagicalSil'],
			['nonMagicalAdm', 'FromNonmagicalAdm']
		].forEach(([p, t]) => {
			if (!level[p].size) {
				return;
			}

			let s =
				oxfordComma(Array.from(level[p].values()).map(dmg))
				+ ` ${localize('OBSIDIAN.DamageLC')}`;

			if (t.length) {
				s += ` ${localize(`OBSIDIAN.${t}`)}`;
			}

			subParts.push(s);
		});

		if (!subParts.length) {
			return;
		}

		parts.push(
			localize('OBSIDIAN.DefString').format(
				localize(`OBSIDIAN.${level === res ? 'Resistant' : 'Immune'}`),
				oxfordComma(subParts)));
	});

	return oxfordComma(parts);
}

function oxfordComma (parts, or) {
	if (parts.length) {
		if (parts.length < 2) {
			return parts[0];
		} else {
			let comma = ',';
			if (parts.length === 2) {
				comma = '';
			}

			const last = parts.pop();
			const conjunction = localize(or ? 'OBSIDIAN.Or' : 'OBSIDIAN.And');
			return `${parts.join(', ')}${comma} ${conjunction} ${last}`;
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
