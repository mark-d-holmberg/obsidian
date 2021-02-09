import {OBSIDIAN} from '../global.js';
import {Rules} from './rules.js';

export function prepareDefenses (data, flags, derived) {
	derived.defenses = {
		parts: {
			conditions: {imm: [], adv: [], dis: []},
			damage: {res: [], imm: [], vuln: new Set()},
			dr: null
		},
		display: {
			conditions: {imm: new Set(), adv: new Set(), dis: new Set()},
			damage: {res: '', imm: '', vuln: ''},
			pc: []
		}
	};

	if (!flags.defenses.dr) {
		flags.defenses.dr = {value: null};
	}

	prepareActiveDefenses(flags, derived);
	prepareManualDefenses(flags, derived);

	// Convert to normal arrays to avoid being nuked during duplication.
	derived.defenses.parts.damage.vuln = Array.from(derived.defenses.parts.damage.vuln.values());
}

function prepareActiveDefenses (flags, derived) {
	let bestDR = 0;
	const conditions = derived.defenses.parts.conditions;
	const damage = derived.defenses.parts.damage;

	derived.toggleable
		.filter(effect => effect.toggle.active)
		.filter(effect => effect.active.defense.length)
		.flatMap(effect => effect.active.defense)
		.forEach(def => {
			if (def.sleep) {
				conditions.imm.push('sleep');
			}

			if (def.disease) {
				conditions.imm.push('disease');
			}

			if (def.dr && def.dr > bestDR) {
				bestDR = def.dr;
			}

			if (def.defense === 'condition') {
				conditions[def.condition.level].push(def.condition.condition);
			} else if (def.defense === 'damage') {
				if (def.damage.level === 'vuln') {
					damage.vuln.add(def.damage.dmg);
				} else {
					damage[def.damage.level].push(def.damage);
				}
			}
		});

	if (bestDR) {
		derived.defenses.dr = bestDR;
	}

	if (derived.conditions.petrified) {
		conditions.imm.push('disease');
		conditions.imm.push('poisoned');
		damage.res.push(...Rules.DAMAGE_TYPES.map(dmg => {
			return {dmg, level: 'res', magic: '', material: ''};
		}));
	}
}

function prepareManualDefenses (flags, derived) {
	const parts = derived.defenses.parts;
	const display = derived.defenses.display;

	flags.defenses.conditions.forEach(cond => {
		parts.conditions[cond.level].push(cond.condition);
	});

	if (flags.defenses.disease) {
		parts.conditions.imm.push('disease');
	}

	if (flags.defenses.sleep) {
		parts.conditions.imm.push('sleep');
	}

	if (flags.defenses.dr.value) {
		// Override any derived value.
		derived.defenses.parts.dr = flags.defenses.dr.value;
	}

	Object.entries(parts.conditions).forEach(([level, conditions]) =>
		conditions.forEach(condition => display.conditions[level].add(condition)));

	Object.entries(display.conditions).forEach(([level, conditions]) =>
		display.conditions[level] = Array.from(conditions.values()).map(cond => {
			let i18n = `Condition-${cond}`;
			if (cond === 'sleep') {
				i18n = 'MagicalSleep';
			} else if (cond === 'disease') {
				i18n = 'Disease';
			}

			return game.i18n.localize(`OBSIDIAN.${i18n}`);
		}).join(', '));

	['adv', 'dis'].forEach(mode =>
		display.conditions[mode] =
			parts.conditions[mode]
				.map(cond => game.i18n.localize(`OBSIDIAN.Condition-${cond}`))
				.join(', '));

	flags.defenses.damage.forEach(def => {
		const collection = parts.damage[def.level];
		if (collection instanceof Set) {
			collection.add(def.dmg);
		} else {
			collection.push(def);
		}
	});

	display.damage.vuln =
		Array.from(parts.damage.vuln.values())
			.map(dmg => game.i18n.localize(`OBSIDIAN.Damage-${dmg}`))
			.join(', ');

	['imm', 'res'].forEach(level => {
		const noCondition = new Set();
		const nonMagical = new Set();
		const nonMagicalSil = new Set();
		const nonMagicalAdm = new Set();

		for (const def of parts.damage[level]) {
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

		display.damage[level] = Array.from(noCondition.values()).join(', ');
		const displayParts = [display.damage[level]];

		if (nonMagical.size) {
			displayParts[1] = Array.from(nonMagical.values()).join(', ')
				+ ` ${game.i18n.localize('OBSIDIAN.FromNonmagical')}`;
		}

		if (nonMagicalSil.size) {
			displayParts[2] = Array.from(nonMagicalSil.values()).join(', ')
				+ ` ${game.i18n.localize('OBSIDIAN.FromNonmagicalSil')}`;
		}

		if (nonMagicalAdm.size) {
			displayParts[3] = Array.from(nonMagicalAdm.values()).join(', ')
				+ ` ${game.i18n.localize('OBSIDIAN.FromNonmagicalAdm')}`;
		}

		display.damage[level] = displayParts.filter(part => part && part.length).join('; ');
	});

	if (display.damage.imm.length) {
		display.pc.push(display.damage.imm);
	}

	if (display.conditions.imm.length) {
		display.pc.push(display.conditions.imm);
	}

	display.pc = display.pc.join(', ');
}

export function hpAfterDamage (actor, damage, attack) {
	const hp = actor.data.data.attributes.hp;
	const defenses = actor.data.obsidian.defenses.parts.damage;
	const dr = actor.data.obsidian.defenses.parts.dr;
	const dt = actor.data.flags.obsidian.attributes.dt;
	let current = hp.value;
	let tmp = hp.temp;

	if (tmp == null || tmp < 0) {
		tmp = 0;
	}

	const total = Array.from(damage.values()).reduce((acc, dmg) => acc + dmg, 0);
	if (dt && total < dt) {
		return {};
	}

	for (let [type, dmg] of damage.entries()) {
		if (type === 'hlg') {
			current += Math.floor(dmg);
			continue;
		}

		const isImmune = hasDefenseAgainst(defenses, attack, type, 'imm');
		const isResistant = hasDefenseAgainst(defenses, attack, type, 'res');
		const isVulnerable = defenses.vuln.includes(type);

		if (isImmune) {
			continue;
		}

		if (['blg', 'prc', 'slh'].includes(type) && !attack?.magical && dr) {
			dmg -= dr;
		}

		if (isResistant) {
			dmg /= 2;
		}

		if (isVulnerable) {
			dmg *= 2;
		}

		tmp -= Math.max(1, Math.floor(dmg));
	}

	if (tmp < 0) {
		// Any damage leftover after depleting temporary HP is applied to
		// current HP.
		current += tmp;
		tmp = 0;
	}

	const update = {'data.attributes.hp.value': Math.clamped(current, 0, hp.max)};
	if (hp.temp != null) {
		update['data.attributes.hp.temp'] = tmp;
	}

	return update;
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
