let localize;

export function prepareToggleableEffects (actorData) {
	localize = game.i18n.localize.bind(game.i18n);
	for (const effect of actorData.obsidian.toggleable) {
		if (!effect.toggle) {
			effect.toggle = {active: true, display: ''};
		}

		if (!effect.mods.length) {
			continue;
		}

		effect.toggle.display = formatRollMod(effect.mods[0]);
		if (effect.filters.length) {
			effect.toggle.display += ` ${localize('OBSIDIAN.On')} ${formatFilters(effect.filters)}`;
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

function formatFilter (filter) {
	const parts = [];
	if (filter.roll === 'attack') {
		if (filter.multi === 'any') {
			parts.push(localize('OBSIDIAN.AttackRolls'));
		} else {
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
			} else {
				parts.push(...filter.collection.map(item => item.label));
				parts[parts.length - 1] += ` ${localize('OBSIDIAN.Checks')}`;
			}
		} else if (filter.check === 'init') {
			parts.push(localize('OBSIDIAN.InitiativeRolls'));
		}
	} else if (filter.roll === 'save') {
		if (filter.multi === 'any') {
			parts.push(localize('OBSIDIAN.SavingThrows'));
		} else if (filter.collection.length) {
			parts.push(...filter.collection.map(item => localize(`OBSIDIAN.Ability-${item.key}`)));
			parts[parts.length - 1] += ` ${localize('OBSIDIAN.Saves')}`;
		}
	} else if (filter.roll === 'damage') {
		if (filter.multi === 'any') {
			parts.push(localize('OBSIDIAN.DamageRolls'));
		} else if (filter.collection.length) {
			parts.push(...filter.collection.map(item => item.label));
			parts[parts.length - 1] += ` ${localize('OBSIDIAN.DamageRolls')}`;
		}
	}

	if (filter.roll !== 'damage' && filter.mode !== 'reg' && parts.length > 0) {
		parts[parts.length - 1] +=
			` (${localize('OBSIDIAN.WhenRollingAt')
				.format(localize(`OBSIDIAN.Roll-${filter.mode}`))})`;
	}

	return oxfordComma(parts);
}

function formatRollMod (mod) {
	const parts = [];
	if (mod.min > 1) {
		parts.push(localize('OBSIDIAN.RollModMin').format(mod.min));
	}

	if (mod.reroll > 1 || mod.operator === 'gt') {
		parts.push(
			localize('OBSIDIAN.RollModReroll')
				.format(
					localize(
						`OBSIDIAN.${mod.operator === 'lt' ? 'LessThan' : 'GreaterThan'}`),
					mod.reroll));
	}

	if (mod.mode !== 'reg') {
		parts.push(localize(`OBSIDIAN.Roll-${mod.mode}`));
	}

	return parts.join(', ').capitalise();
}

function oxfordComma (parts) {
	if (parts.length < 2) {
		return parts[0]
	} else {
		const last = parts.pop();
		return `${parts.join(', ')}, ${localize('OBSIDIAN.And')} ${last}`;
	}
}
