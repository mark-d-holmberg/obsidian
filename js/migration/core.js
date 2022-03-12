import {CONVERT} from './convert.js';
import {OBSIDIAN} from '../global.js';
import {Migrate} from './migrate.js';
import {Effect} from '../module/effect.js';

const OPERATORS = {
	'+': (a, b) => a + b,
	'-': (a, b) => a - b
};

export const core = {
	convertActivation: function (data) {
		if (data.type === 'spell') {
			const activation = CONVERT.castTime[getProperty(data.data, 'activation.type')];
			if (activation) {
				data.flags.obsidian.time.type = activation;
			}

			const range = CONVERT.range[getProperty(data.data, 'range.units')];
			if (range) {
				data.flags.obsidian.range.type = range;
			}

			const duration = CONVERT.duration[getProperty(data.data, 'duration.units')];
			if (duration) {
				data.flags.obsidian.duration.type = duration;
			}

			data.flags.obsidian.time.n = getProperty(data.data, 'activation.cost');
			data.flags.obsidian.time.react = getProperty(data.data, 'activation.condition');
			data.flags.obsidian.range.n = getProperty(data.data, 'range.value');
			data.flags.obsidian.duration.n = getProperty(data.data, 'duration.value');
		}

		if (getProperty(data.data, 'target.value')
			&& CONVERT.validTargetTypes.has(getProperty(data.data, 'target.type')))
		{
			let effect;
			if (data.type === 'spell') {
				effect = getSpellEffect(data);
			} else {
				effect = getPrimaryEffect(data);
			}

			const target = data.data.target;
			const component = Effect.createComponent('target');
			effect.components.push(component);

			if (target.type === 'creature' || target.type === 'object') {
				component.count = target.value;
			} else {
				component.target = 'area';
				component.area = target.type;
				component.distance = target.value;
			}
		}

		if ((getProperty(data.data, 'uses.max') || 0) > 0) {
			let effect;
			if (data.type === 'spell') {
				effect = Effect.create();
				data.flags.obsidian.effects.push(effect);
			} else {
				effect = getPrimaryEffect(data);
			}

			const uses = data.data.uses;
			const component = Effect.createComponent('resource');
			effect.components.push(component);

			if (!effect.name.length) {
				if (uses.per === 'charges') {
					component.name = game.i18n.localize('OBSIDIAN.Charges');
				} else {
					component.name = game.i18n.localize('OBSIDIAN.Uses');
				}
			}

			component.fixed = uses.max;
			component.remaining = uses.max - (uses.value || 0);

			if (CONVERT.recharge[uses.per]) {
				component.recharge.time = CONVERT.recharge[uses.per];
			}
		}
	},

	convertAttack: function (data) {
		if (OBSIDIAN.notDefinedOrEmpty(data.data.actionType)) {
			return;
		}

		let spell = false;
		let ability = 'str';
		const action = data.data.actionType;

		if (action && action.endsWith('ak')) {
			let effect;
			if (data.type === 'spell') {
				effect = getSpellEffect(data);
			} else {
				effect = getPrimaryEffect(data);
			}

			const component = Effect.createComponent('attack');
			effect.components.push(component);

			if (action[0] === 'r') {
				component.attack = 'ranged';
			}

			if (action[1] === 's') {
				spell = true;
				component.category = 'spell';
				if (OBSIDIAN.notDefinedOrEmpty(data.data.ability)) {
					component.ability = 'spell';
				}
			}

			if (OBSIDIAN.notDefinedOrEmpty(data.data.ability)) {
				if (action[0] === 'r') {
					if (data.type === 'spell') {
						ability = 'spell';
					} else {
						ability = 'dex';
					}
				}
			} else {
				ability = data.data.ability;
			}

			component.ability = ability;
			component.bonus = data.data.attackBonus || 0;
			component.proficient = !!data.data.proficient;
		}

		const damage = data.data.damage || {};
		if ((damage.parts && damage.parts.length && damage.parts.some(dmg => dmg[0]?.length))
			|| (damage.versatile && damage.versatile.length)
			|| (data.data.formula && data.data.formula.length))
		{
			let effect;
			if (data.type === 'spell') {
				spell = true;
				effect = getSpellEffect(data);
			} else {
				effect = getPrimaryEffect(data);
			}

			if (damage.parts && damage.parts.length) {
				effect.components =
					effect.components.concat(
						damage.parts
							.map(dmg => Migrate.core.convertDamage(dmg, ability, spell))
							.filter(dmg => dmg));
			}

			if (damage.versatile && damage.versatile.length) {
				const versatile = Migrate.core.convertDamage(damage.versatile, ability);
				const firstDamage = effect.components.filter(dmg => dmg.type === 'damage')[0];
				versatile.versatile = true;

				if (firstDamage) {
					versatile.damage = firstDamage.damage;
				}

				effect.components.push(versatile);
			}

			if (data.data.formula && data.data.formula.length) {
				effect.components.push(Migrate.core.convertDamage(data.data.formula, ability));
			}
		}

		const save = data.data.save || {};
		if (!OBSIDIAN.notDefinedOrEmpty(save.ability)) {
			let effect;
			if (data.type === 'spell') {
				effect = getSpellEffect(data);
			} else {
				effect = getPrimaryEffect(data);
			}

			const component = Effect.createComponent('save');
			effect.components.push(component);
			component.target = save.ability;

			if (save.scaling === 'flat') {
				component.fixed = save.dc;
			} else {
				component.calc = 'formula';
				component.ability = save.scaling;
				component.bonus = 8;
			}
		}

		if (data.type === 'spell'
			&& getProperty(data.data, 'scaling.mode') !== 'none'
			&& !OBSIDIAN.notDefinedOrEmpty(getProperty(data.data, 'scaling.formula')))
		{
			const spellEffect = getSpellEffect(data);
			const scalingEffect = getScalingEffect(data);
			const scaling = scalingEffect.components.find(c => c.type === 'scaling');
			scaling.ref = spellEffect.uuid;

			if (data.data.level < 1) {
				scaling.method = 'cantrip';
			}

			const component = Effect.createComponent('damage');
			scalingEffect.components.push(component);

			const existingDamage = spellEffect.components.find(c => c.type === 'damage');
			if (existingDamage) {
				component.damage = existingDamage.damage;
			}

			const diceMatches = /\b(\d+d\d+)\b/.exec(data.data.scaling.formula);
			if (diceMatches) {
				const dice = diceMatches[1].split('d');
				component.ndice = Number(dice[0]);
				component.die = Number(dice[1]);
			}
		}
	},

	convertClassFeature: function (data) {
		if (!data.data.requirements || data.flags.obsidian.source.type !== 'other') {
			return;
		}

		const className = data.data.requirements.replace(/\d+/g, '').trim().toLocaleLowerCase();
		const cls = OBSIDIAN.Config.CLASSES.find(cls =>
			game.i18n.localize(`OBSIDIAN.Class.${cls}`).toLocaleLowerCase() === className);

		if (cls) {
			data.flags.obsidian.source.type = 'class';
			data.flags.obsidian.source.class = cls;
		}
	},

	convertDamage: function (dmg, ability, spell = false) {
		let formula = dmg;
		if (Array.isArray(dmg)) {
			formula = dmg[0];
		}

		if (!formula?.length) {
			return;
		}

		const component = Effect.createComponent('damage');
		if (Array.isArray(dmg) && CONVERT.damage[dmg[1]]) {
			component.damage = CONVERT.damage[dmg[1]];
		}

		const terms = getTerms(formula);
		const dice = terms.find(term => /^\d+d\d+$/.test(term));
		const mod = terms.some(term => term === '@mod');

		if (dice) {
			const d = dice.split('d');
			component.ndice = Number(d[0]);
			component.die = Number(d[1]);
		} else {
			component.calc = 'fixed';
		}

		if (mod) {
			component.ability = ability;
			if (spell) {
				component.ability = 'spell';
			}
		}

		let op = '+';
		let total = 0;

		for (let i = 0; i < terms.length; i++) {
			const term = terms[i];
			if (term === dice || term.startsWith('@')) {
				continue;
			}

			if (term === '+' || term === '-') {
				op = term;
				continue;
			}

			if (/^\d+$/.test(term)) {
				total = OPERATORS[op](total, Number(term));
			}
		}

		component.bonus = total;
		return component;
	},

	convertDefenses: function (data) {
		if (!data.data) {
			return;
		}

		const defenses = data.flags.obsidian.defenses;
		data.data.traits.ci.value.forEach(condition => {
			const key = CONVERT.defs.conditions.get(condition.toLowerCase());
			defenses.conditions.push({level: 'imm', condition: key || condition});
		});

		[['di', 'imm'], ['dr', 'res'], ['dv', 'vuln']].forEach(([key, level]) => {
			const def = data.data.traits[key];
			defenses.damage.push(...def.value.map(def => {
				return {
					level: level,
					dmg: CONVERT.defs.damage.get(def.toLowerCase()) || def,
					magic: '',
					material: ''
				};
			}));

			if (!def.custom) {
				return;
			}

			def.custom.split(';').forEach(def => {
				if (CONVERT.defs.damage.get(def.trim().toLowerCase()) === 'nonmagical') {
					defenses.damage.push(...['blg', 'prc', 'slh'].map(dmg => {
						return {level: level, dmg: dmg, magic: 'non'};
					}));
				}
			});
		});
	},

	convertVehicle: function (data) {
		// We don't have the default data provided by the system template yet
		// so we add it here so that the rest of the conversion code can be
		// aware of it.

		const model = game.system.model.Actor.vehicle;
		data.data = mergeObject(model, data.data || {}, {inplace: false});
	}
};

function getPrimaryEffect (data) {
	if (!data.flags.obsidian.effects || !data.flags.obsidian.effects.length) {
		data.flags.obsidian.effects = [Effect.create()];
	}

	return data.flags.obsidian.effects[0];
}

function getSpellEffect (data) {
	if (!data.flags.obsidian.effects || !data.flags.obsidian.effects.length) {
		data.flags.obsidian.effects = [Effect.create()];
	}

	let effect =
		data.flags.obsidian.effects.find(e =>
			!e.components.some(c => c.type === 'scaling' || c.type === 'resource'));

	if (!effect) {
		effect = Effect.create();
		data.flags.obsidian.effects.push(effect);
	}

	return effect;
}

function getScalingEffect (data) {
	if (!data.flags.obsidian.effects || !data.flags.obsidian.effects.length) {
		data.flags.obsidian.effects = [Effect.create()];
		data.flags.obsidian.effects[0].name = game.i18n.localize('OBSIDIAN.ScalingTitle');
		data.flags.obsidian.effects[0].components.push(Effect.createComponent('scaling'));
	}

	let effect =
		data.flags.obsidian.effects.find(e => e.components.some(c => c.type === 'scaling'));

	if (!effect) {
		effect = Effect.create();
		effect.name = game.i18n.localize('OBSIDIAN.ScalingTitle');
		effect.components.push(Effect.createComponent('scaling'));
		data.flags.obsidian.effects.push(effect);
	}

	return effect;
}

function getTerms (formula) {
	const ops = Object.keys(OPERATORS).concat(['(', ')']);
	const split = new RegExp(ops.map(term => `\\${term}`).join('|'), 'g');
	const terms =
		formula.replace(RollTerm.FLAVOR_REGEXP, '').replace(split, term => `;${term};`).split(';');
	return terms.map(term => term.trim()).filter(term => term !== '').filter((term, i, arr) => {
		return !((term === '+') && (arr[i - 1] === '+'));
	});
}
