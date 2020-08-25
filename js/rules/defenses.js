import {OBSIDIAN} from '../global.js';

export function prepareDefenses (actorData, flags) {
	flags.defenses.res = [];
	flags.defenses.imm = [];
	flags.defenses.vuln = new Set();
	flags.defenses.conds = {imm: [], adv: [], dis: []};

	if (!flags.defenses.dr) {
		flags.defenses.dr = {value: null};
	}

	flags.defenses.dr.derived = null;
	prepareActiveDefenses(actorData, flags);
	prepareManualDefenses(flags);

	// Convert to normal arrays to avoid being nuked during duplication.
	flags.defenses.vuln = Array.from(flags.defenses.vuln.values());
}

function prepareActiveDefenses (actorData, flags) {
	let bestDR = 0;
	actorData.obsidian.toggleable
		.filter(effect => effect.toggle.active)
		.filter(effect => effect.active.defense.length)
		.flatMap(effect => effect.active.defense)
		.forEach(def => {
			if (def.sleep) {
				flags.defenses.conds.imm.push('sleep');
			}

			if (def.disease) {
				flags.defenses.conds.imm.push('disease');
			}

			if (def.dr && def.dr > bestDR) {
				bestDR = def.dr;
			}

			if (def.defense === 'condition') {
				flags.defenses.conds[def.condition.level].push(def.condition.condition);
			} else if (def.defense === 'damage') {
				if (def.damage.level === 'vuln') {
					flags.defenses.vuln.add(def.damage.dmg);
				} else {
					flags.defenses[def.damage.level].push(def.damage);
				}
			}
		});

	if (bestDR) {
		flags.defenses.dr.derived = bestDR;
	}
}

function prepareManualDefenses (flags) {
	flags.defenses.resDisplay = '';
	flags.defenses.immDisplay = '';
	flags.defenses.condDisplay = {imm: new Set(), adv: new Set(), dis: new Set()};

	flags.defenses.conditions.forEach(cond => {
		flags.defenses.conds[cond.level].push(cond.condition);
	});

	if (flags.defenses.disease) {
		flags.defenses.conds.imm.push('disease');
	}

	if (flags.defenses.sleep) {
		flags.defenses.conds.imm.push('sleep');
	}

	if (flags.defenses.dr.value) {
		// Override any derived value.
		flags.defenses.dr.derived = flags.defenses.dr.value;
	}

	Object.entries(flags.defenses.conds).forEach(([level, conditions]) =>
		conditions.forEach(condition => flags.defenses.condDisplay[level].add(condition)));

	Object.entries(flags.defenses.condDisplay).forEach(([level, conditions]) =>
		flags.defenses.condDisplay[level] = Array.from(conditions.values()).map(cond => {
			let i18n = `Condition-${cond}`;
			if (cond === 'sleep') {
				i18n = 'MagicalSleep';
			} else if (cond === 'disease') {
				i18n = 'Disease';
			}

			return game.i18n.localize(`OBSIDIAN.${i18n}`);
		}).join(', '));

	['adv', 'dis'].forEach(mode =>
		flags.defenses.condDisplay[mode] =
			flags.defenses.conds[mode]
				.map(cond => game.i18n.localize(`OBSIDIAN.Condition-${cond}`))
				.join(', '));

	flags.defenses.damage.forEach(def => {
		const collection = flags.defenses[def.level];
		if (collection instanceof Set) {
			collection.add(def.dmg);
		} else {
			collection.push(def);
		}
	});

	flags.defenses.vulnDisplay =
		Array.from(flags.defenses.vuln.values())
			.map(dmg => game.i18n.localize(`OBSIDIAN.Damage-${dmg}`))
			.join(', ');

	['imm', 'res'].forEach(level => {
		const noCondition = new Set();
		const nonMagical = new Set();
		const nonMagicalSil = new Set();
		const nonMagicalAdm = new Set();

		for (const def of flags.defenses[level]) {
			const i18n = game.i18n.localize(`OBSIDIAN.Damage-${def.dmg}`);
			if (OBSIDIAN.notDefinedOrEmpty(def.magic)) {
				noCondition.add(i18n);
			} else {
				if (OBSIDIAN.notDefinedOrEmpty(def.material)) {
					nonMagical.add(i18n);
				} else if (def.material === 'sil') {
					nonMagicalSil.add(i18n);
				} else {
					nonMagicalAdm.add(i18n);
				}
			}
		}

		const display = `${level}Display`;
		flags.defenses[display] = Array.from(noCondition.values()).join(', ');

		const parts = [flags.defenses[display]];
		if (nonMagical.size) {
			parts[1] = Array.from(nonMagical.values()).join(', ')
				+ ` ${game.i18n.localize('OBSIDIAN.FromNonmagical')}`;
		}

		if (nonMagicalSil.size) {
			parts[2] = Array.from(nonMagicalSil.values()).join(', ')
				+ ` ${game.i18n.localize('OBSIDIAN.FromNonmagicalSil')}`;
		}

		if (nonMagicalAdm.size) {
			parts[3] = Array.from(nonMagicalAdm.values()).join(', ')
				+ ` ${game.i18n.localize('OBSIDIAN.FromNonmagicalAdm')}`;
		}

		flags.defenses[display] = parts.filter(part => part && part.length).join('; ');
	});

	flags.defenses.pcImmDisplay = [];
	if (flags.defenses.immDisplay.length) {
		flags.defenses.pcImmDisplay.push(flags.defenses.immDisplay);
	}

	if (flags.defenses.condDisplay.imm.length) {
		flags.defenses.pcImmDisplay.push(flags.defenses.condDisplay.imm);
	}

	flags.defenses.pcImmDisplay = flags.defenses.pcImmDisplay.join(', ');
}

export function hpAfterDamage (actor, damage, attack) {
	let hp = actor.data.data.attributes.hp.value;
	const defenses = actor.data.flags.obsidian.defenses;

	for (let [type, dmg] of damage.entries()) {
		if (type === 'hlg') {
			hp += Math.floor(dmg);
			continue;
		}

		const isImmune = hasDefenseAgainst(defenses, attack, type, 'imm');
		const isResistant = hasDefenseAgainst(defenses, attack, type, 'res');
		const isVulnerable = defenses.vuln.includes(type);

		if (isImmune) {
			continue;
		}

		if (['blg', 'prc', 'slh'].includes(type) && !attack?.magical && defenses.dr.derived) {
			dmg -= defenses.dr.derived;
		}

		if (isResistant) {
			dmg /= 2;
		}

		if (isVulnerable) {
			dmg *= 2;
		}

		hp -= Math.max(1, Math.floor(dmg));
	}

	return hp;
}

function hasDefenseAgainst (defenses, attack, type, level) {
	for (const def of defenses[level]) {
		if (def.dmg !== type) {
			continue;
		}

		if (def.magic === 'non' && attack?.magical) {
			continue;
		}

		if (def.material === 'adm' && attack?.adamantine) {
			continue;
		}

		if (def.material === 'sil' && attack?.silver) {
			continue;
		}

		return true;
	}

	return false;
}
