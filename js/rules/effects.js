import {OBSIDIAN} from '../global.js';
import {cssIconDiamond, cssIconHexagon} from '../util/html.js';

let localize;

export function prepareToggleableEffects (actorData) {
	localize = key => game.i18n.localize(`OBSIDIAN.${key}`);
	for (const effect of actorData.obsidian.toggleable) {
		const filter =
			effect.filters.length ? ` ${effect.filters.map(formatFilter).join(', ')}` : '';

		effect.toggle.display =
			effect.active.bonus.map(bonus =>
				formatBonus(actorData, bonus)
				+ (filter.length && effect.filters[0].filter === 'roll'
					? ` ${localize('On')}${filter}`
					: filter))
				.concat(effect.active['roll-mod'].map(mod =>
					formatRollMod(mod)
					+ (filter.length && mod.mode === 'reg' ? ` ${localize('On')}${filter}` : filter)))
				.concat(effect.active.multiplier.map(multiplier =>
					`${formatMultiplier(multiplier)}${filter}`))
				.concat(effect.active.setter.map(setter => `${filter}${formatSetter(setter)}`))
				.concat(formatDefenses(effect.active.defense))
				.concat(formatConditions(effect.active.condition))
				.filter(part => part.length)
				.join('; ');
	}
}

function formatBonus (actorData, bonus) {
	if (bonus.method === 'dice') {
		if (bonus.ndice !== 0) {
			return `<strong>${bonus.ndice.sgn()}d${bonus.die}</strong>`;
		}

		if (bonus.bonus !== 0) {
			return `<strong>${bonus.bonus.sgn()}</strong>`;
		}
	}

	if (bonus.method === 'formula') {
		if (bonus.constant !== 0 || (bonus.operator === 'plus' && bonus.value !== '')) {
			let str = bonus.constant < 0 ? '-' : '+';
			if (bonus.operator === 'mult') {
				str += `${bonus.constant === 0.5 ? '½' : `${bonus.constant}`}&times; `;
			} else {
				str += bonus.constant;
			}

			if (bonus.value === 'abl') {
				str += localize(`AbilityAbbr.${bonus.ability}`);
			} else if (bonus.value === 'cls') {
				const cls = actorData.obsidian.itemsByID.get(bonus.class);
				if (cls) {
					str += `${
						cls.name === 'custom' ? cls.custom : localize(`Class.${cls.name}`)
					} ${localize('Level')}`;
				}
			} else if (bonus.value.length) {
				str += localize(`BonusValue.${bonus.value}`);
			}

			return `<strong>${str}</strong>`;
		}
	}

	return '';
}

function formatFilter (filter) {
	const parts = [];
	const some = filter.multi !== 'any' && filter.collection.length;
	const collection = (i18n, items) =>` (${
		items.map(item => item.label ? item.label : localize(`${i18n}.${item.key}`)).join('&sol;')
	})`;

	const weaponAttacks = items => {
		if (items.length < 2) {
			return localize(`AttackFullLC.${items[0].key}`);
		} else if (items.every(item => item.key[0] === 'm')) {
			return localize('MeleeAttacks');
		} else if (items.every(item => item.key[0] === 'r')) {
			return localize('RangedAttacks');
		} else if (items.every(item => item.key[1] === 'w')) {
			return localize('WeaponAttacks');
		} else if (items.every(item => item.key[1] === 's')) {
			return localize('SpellAttacks');
		} else {
			return `${localize('AttackRolls')} (${
				items.map(item => localize(`AttackFullLC.${item.key}`)).join('&sol;')
			})`;
		}
	};

	const checks = (translationAny, translationSome, items) =>
		some
			? items
				.map(item => item.label ? item.label : localize(`${translationSome}.${item.key}`))
				.join('&sol;')
			: localize(translationAny);

	if (filter.filter === 'roll') {
		if (filter.roll === 'attack') {
			if (filter.multi === 'any') {
				parts.push(localize('AttackRolls'));
			} else if (filter.collection.length) {
				parts.push(weaponAttacks(filter.collection));
			}
		} else if (filter.roll === 'check') {
			if (filter.check === 'ability') {
				parts.push(
					localize('AbilityChecks')
					+ (some ? collection('AbilityAbbr', filter.collection) : ''));
			} else if (filter.check === 'skill') {
				parts.push(checks('SkillChecks', 'Skill', filter.collection));
			} else if (filter.check === 'tool') {
				parts.push(checks('ToolChecks', 'ToolProf', filter.collection));
			} else if (filter.check === 'init') {
				parts.push(localize('InitiativeLC'));
			}
		} else if (filter.roll === 'save') {
			parts.push(
				localize('SavingThrowsLC')
				+ (some ? collection('AbilityAbbr', filter.collection) : ''));
		} else if (filter.roll === 'damage') {
			let str = localize('DamageRolls');
			if (some) {
				if (filter.dmg === 'damage') {
					str += ` (${
						filter.collection.map(item => localize(`Damage.${item.key}`)).join('&sol;')
					})`;
				} else if (filter.dmg === 'attack') {
					str += ` (${weaponAttacks(filter.collection)})`;
				}
			}

			parts.push(str);
		} else if (filter.roll === 'hd') {
			parts.push(localize('HitDiceRolls'));
		}
	} else if (filter.filter === 'score') {
		if (filter.score === 'ability') {
			parts.push(
				some
					? filter.collection.map(item => localize(`Ability.${item.key}`)).join('&sol;')
					: localize('AbilityScores'));
		} else if (filter.score === 'ac') {
			parts.push(localize('ACAbbr'));
		} else if (filter.score === 'max-hp') {
			parts.push(localize('MaxHPLC'));
		} else if (filter.score === 'passive') {
			parts.push(
				localize('PassiveChecks')
				+ (some ? collection('Skill', filter.collection) : ''));
		} else if (filter.score === 'speed') {
			parts.push(localize('Speed') + (some ? collection('Speed', filter.collection) : ''));
		} else if (filter.score === 'dc') {
			parts.push(
				localize('SaveDCs')
				+ (some ? collection('AbilityAbbr', filter.collection) : ''));
		} else if (filter.score === 'prof') {
			parts.push(localize('ProfBonusLC'));
		} else if (filter.score === 'carry') {
			parts.push(localize('Scores.carry'));
		}
	}

	if (parts.length && !OBSIDIAN.notDefinedOrEmpty(filter.mode)) {
		if (filter.mode === 'reg') {
			parts.push(`(${localize('StraightRollsOnly')})`);
		} else {
			const advantage = filter.mode === 'adv';
			parts.push(
				`(${cssIconHexagon({advantage, disadvantage: !advantage, wrapped: true})} `
				+ `${localize('Only')})`);
		}
	}

	if (parts.length && !OBSIDIAN.notDefinedOrEmpty(filter.usesAbility)) {
		parts.push(`(${
			Object.entries(filter.usesAbility.abilities)
				.filter(([, v]) => v)
				.map(([k,]) => localize(`AbilityAbbr.${k}`))
				.join('&sol;')
		} ${localize('Only')})`);
	}

	return parts.join(' ');
}

function formatRollMod (mod) {
	const parts = [];
	if (mod.min > 1) {
		parts.push(localize('RollModMin') + ` <strong>${mod.min}</strong>`);
	}

	if (mod.reroll > 1) {
		parts.push(localize('RollModReroll') + ` <strong>${mod.reroll}</strong>`);
	}

	if (mod.ndice > 0) {
		parts.push(
			`<strong>${mod.ndice.sgn()} ${localize(mod.ndice > 1 ? 'Dice' : 'Die')}</strong>`);
	}

	if (mod.max) {
		parts.push(localize('MaxRoll'));
	}

	if (mod.mcrit > 0 && mod.mcrit < 20) {
		parts.push(`${localize('RollModCritRange')} ${mod.mcrit}&mdash;20`);
	}

	if (mod.mode !== 'reg') {
		const advantage = mod.mode === 'adv';
		parts.push(cssIconHexagon({advantage, disadvantage: !advantage}));
	}

	return parts.join(', ');
}

function formatSetter (setter) {
	return `${setter.min ? `(${localize('IfNotHigher')}) ` : ''}<strong>${setter.score}</strong>`;
}

function formatMultiplier (multiplier) {
	return `<strong>&times;${multiplier.multiplier}</strong>`;
}

function formatConditions (components) {
	const allConditions = new Set();
	components.forEach(c => allConditions.add(c.condition));

	const conditions = Array.from(allConditions.values()).filter(c => c !== 'exhaustion');
	const exhaustionPart = localize('GainExhaustion');
	const conditionPart =
		localize('BecomeCondition')
			.format(conditions.map(c => localize(`Condition-${c}`)).join(', '));

	if (conditions.length && allConditions.has('exhaustion')) {
		return `${conditionPart}, ${exhaustionPart}`;
	} else if (conditions.length) {
		return conditionPart;
	} else if (allConditions.has('exhaustion')) {
		return exhaustionPart;
	}

	return '';
}

function formatDefenses (defs) {
	const dmg = dmg => localize(`Damage.${dmg}`);
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

	let bestDR = 0;
	defs.forEach(def => {
		if (def.sleep) {
			conds.imm.add('sleep');
		}

		if (def.disease) {
			conds.imm.add('disease');
		}

		if (def.dr && def.dr > bestDR) {
			bestDR = def.dr;
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
			cssIconDiamond({level: 'vuln', wrapped: true})
			+ ` ${Array.from(vuln.values()).map(dmg).join(', ')}`);
	}

	if (bestDR) {
		parts.push(`
			<div class="obsidian-icon-sm obsidian-icon-damage-reduction"
			     title="${localize('DamageReduction')}">
				<strong>${bestDR}</strong>
			</div>
		`);
	}

	['imm', 'adv', 'dis'].forEach(level => {
		if (!conds[level].size) {
			return;
		}

		parts.push(
			(level === 'imm'
				? cssIconDiamond({level, wrapped: true})
				: cssIconHexagon({
					advantage: level === 'adv',
					disadvantage: level === 'dis',
					wrapped: true
				}))
			+ ` ${Array.from(conds[level].values()).map(cond => localize(`Condition.${cond}`))}`);
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

			let s = Array.from(level[p].values()).map(dmg).join(', ') + ` ${localize('DamageLC')}`;
			if (t.length) {
				s += ` ${localize(t)}`;
			}

			subParts.push(s);
		});

		if (!subParts.length) {
			return;
		}

		parts.push(
			cssIconDiamond({level: level === res ? 'res' : 'imm', wrapped: true})
			+ subParts.join(', '));
	});

	return parts.join('; ');
}
