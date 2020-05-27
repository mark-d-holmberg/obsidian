import {OBSIDIAN} from '../global.js';

export function prepareDefenses (actorData, flags) {
	flags.defenses.res = [];
	flags.defenses.imm = [];
	flags.defenses.vuln = new Set();
	flags.defenses.conds = new Set();

	prepareActiveDefenses(actorData, flags);
	prepareManualDefenses(flags);

	// Convert to normal arrays to avoid being nuked during duplication.
	['vuln', 'conds'].forEach(def =>
		flags.defenses[def] = flags.defenses[def].values());
}

function prepareActiveDefenses (actorData, flags) {
	actorData.obsidian.toggleable
		.filter(effect => effect.toggle.active)
		.filter(effect => effect.active.defense.length)
		.flatMap(effect => effect.active.defense)
		.forEach(def => {
			if (def.sleep) {
				flags.defenses.conds.add('sleep');
			}

			if (def.disease) {
				flags.defenses.conds.add('disease');
			}

			if (def.defense === 'condition') {
				flags.defenses.conds.add(def.condition);
			} else if (def.defense === 'damage') {
				if (def.damage.level === 'vuln') {
					flags.defenses.vuln.add(def.damage.dmg);
				} else {
					flags.defenses[def.damage.level].push(def.damage);
				}
			}
		});
}

function prepareManualDefenses (flags) {
	flags.defenses.conditions.forEach(cond => flags.defenses.conds.add(cond));
	const conditions =
		Array.from(flags.defenses.conds.values())
			.map(cond => game.i18n.localize(`OBSIDIAN.Condition-${cond}`));

	if (flags.defenses.disease) {
		flags.defenses.conds.add('disease');
		conditions.push(game.i18n.localize('OBSIDIAN.Disease'));
	}

	if (flags.defenses.sleep) {
		flags.defenses.conds.add('sleep');
		conditions.push(game.i18n.localize('OBSIDIAN.MagicalSleep'));
	}

	flags.defenses.resDisplay = '';
	flags.defenses.immDisplay = '';
	flags.defenses.condDisplay = conditions.join(', ');
	flags.defenses.damage.forEach(def => flags.defenses[def.level].push(def));
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
		if (nonMagical.length) {
			parts[1] = Array.from(nonMagical.values()).join(', ')
				+ ` ${game.i18n.localize('OBSIDIAN.FromNonmagical')}`;
		}

		if (nonMagicalSil.length) {
			parts[2] = Array.from(nonMagicalSil.values()).join(', ')
				+ ` ${game.i18n.localize('OBSIDIAN.FromNonmagicalSil')}`;
		}

		if (nonMagicalAdm.length) {
			parts[3] = Array.from(nonMagicalAdm.values()).join(', ')
				+ ` ${game.i18n.localize('OBSIDIAN.FromNonmagicalAdm')}`;
		}

		flags.defenses[display] = parts.filter(part => part && part.length).join('; ');
	});

	flags.defenses.pcImmDisplay = [];
	if (flags.defenses.immDisplay.length) {
		flags.defenses.pcImmDisplay.push(flags.defenses.immDisplay);
	}

	if (flags.defenses.condDisplay.length) {
		flags.defenses.pcImmDisplay.push(flags.defenses.condDisplay);
	}

	flags.defenses.pcImmDisplay = flags.defenses.pcImmDisplay.join(', ');
}
