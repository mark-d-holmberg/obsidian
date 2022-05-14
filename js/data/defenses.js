import {OBSIDIAN} from '../global.js';
import ObjectSet from '../util/object-set.js';

export function prepareDefenses (data, flags, derived) {
	derived.defenses = {
		parts: {
			conditions: {imm: [], adv: [], dis: []},
			damage: {res: [], imm: [], vuln: []},
			dr: null
		},
		display: {}
	};

	if (!flags.defenses.dr) {
		flags.defenses.dr = {value: null};
	}

	prepareActiveDefenses(flags, derived);
	prepareManualDefenses(flags, derived);
}

function prepareActiveDefenses (flags, derived) {
	let bestDR = 0;
	const conditions = derived.defenses.parts.conditions;
	const damage = derived.defenses.parts.damage;

	derived.toggleable
		.filter(effect => effect.toggle?.active)
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
				damage[def.damage.level].push(def.damage);
			}
		});

	if (bestDR) {
		derived.defenses.parts.dr = bestDR;
	}
}

function prepareManualDefenses (flags, derived) {
	const parts = derived.defenses.parts;
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

	flags.defenses.damage.forEach(def => {
		const collection = parts.damage[def.level];
		if (collection instanceof Set) {
			collection.add(def.dmg);
		} else {
			collection.push(def);
		}
	});
}

export function prepareDefenseDisplay (parts) {
	const display = {
		conditions: {imm: new ObjectSet(), adv: new ObjectSet(), dis: new ObjectSet()},
		damage: {res: new ObjectSet(), imm: new ObjectSet(), vuln: new ObjectSet()},
		dr: null,
		all: []
	};

	Object.entries(parts.conditions).forEach(([level, conditions]) => conditions.forEach(cond => {
		const footers = [];
		let label = `OBSIDIAN.Condition.${cond}`;

		if (cond === 'sleep') {
			label = 'OBSIDIAN.MagicalSleep';
		} else if (cond === 'disease') {
			label = 'OBSIDIAN.Disease';
		} else {
			footers.push({label, type: 'svg', value: `obsidian-icon-condition-${cond}`});
		}

		display.conditions[level].add({
			size: 'sm', body: label, footers,
			headers: [{level, label, type: level === 'imm' ? 'def' : 'd20'}]
		});
	}));

	Object.entries(parts.damage).forEach(([level, dmgs]) => dmgs.forEach(dmg => {
		const label = `OBSIDIAN.Damage.${dmg.dmg}`;
		const headers = [{level, label, type: 'def'}];

		if (dmg.magic === 'non') {
			headers.push({level: 'nonmagical', label: 'OBSIDIAN.NonMagical', type: 'def'});
			if (!OBSIDIAN.notDefinedOrEmpty(dmg.material)) {
				headers.push({
					type: 'circle', label: `OBSIDIAN.Defense.${dmg.material}`,
					abbr: `OBSIDIAN.DefenseAbbr.${dmg.material}`
				});
			}
		}

		display.damage[level].add({
			size: 'sm', body: label, headers, footers: [{label, type: 'icon', value: dmg.dmg}]
		});
	}));

	display.all = [
		...display.damage.vuln.values(),
		...display.conditions.dis.values(),
		...display.damage.res.values(),
		...display.conditions.imm.values(),
		...display.damage.imm.values(),
		...display.conditions.adv.values()
	];

	if (parts.dr) {
		display.dr = {
			size: 'sm', body: 'OBSIDIAN.DefenseLevel.dr',
			footers: [{type: 'number', value: parts.dr}],
			headers: [
				{type: 'def', label: 'OBSIDIAN.DefenseLevel.dr', level: 'dr'},
				{type: 'def', label: 'OBSIDIAN.NonMagical', level: 'nonmagical'}
			]
		};

		display.all.push(display.dr);
	}

	return display;
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
		const isVulnerable =
			defenses.vuln.includes(type) || (attack?.spell && defenses.vuln.includes('spell'));

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
		if (def.dmg === 'spell' && attack?.spell) {
			return true;
		}

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
