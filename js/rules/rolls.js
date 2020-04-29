import {OBSIDIAN} from '../global.js';
import {determineAdvantage} from './prepare.js';
import {Effect} from '../module/effect.js';
import {Filters} from './filters.js';
import {AbilityTemplate} from '../../../../systems/dnd5e/module/pixi/ability-template.js';
import {bonusToParts, highestProficiency} from './bonuses.js';
import {handleDurations} from '../module/duration.js';
import {DAMAGE_CONVERT} from '../module/migrate.js';
import {ObsidianActor} from '../module/actor.js';

export const Rolls = {
	abilityCheck: function (actor, ability, skill, adv = [], mods = [], rollMod) {
		if (!skill) {
			const rollMods =
				actor.data.obsidian.filters.mods(Filters.appliesTo.abilityChecks(ability));

			rollMod = Effect.combineRollMods(rollMods);
			mods.push({
				mod: actor.data.data.abilities[ability].mod,
				name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${ability}`)
			}, ...actor.data.flags.obsidian.abilities[ability].rollParts);
		}

		return Rolls.simpleRoll(actor, {
			type: 'abl',
			title: game.i18n.localize(`OBSIDIAN.Ability-${ability}`),
			parens: skill,
			subtitle: game.i18n.localize('OBSIDIAN.AbilityCheck'),
			adv: adv,
			mods: mods,
			rollMod: rollMod
		});
	},

	annotateAdvantage: function (adv, results) {
		if (adv === 0 || results.length < 2) {
			results[0].active = true;
			return;
		}

		let max = {total: -Infinity};
		let min = {total: Infinity};

		results.forEach(r => {
			if (r.total > max.total) {
				max = r;
			}

			if (r.total < min.total) {
				min = r;
			}
		});

		if (adv > 0) {
			max.active = true;
			results.filter(r => r !== max).forEach(r => r.grey = true);
		} else {
			min.active = true;
			results.filter(r => r !== min).forEach(r => r.grey = true);
		}
	},

	annotateCrits: function (pos, neg, results) {
		for (const result of results) {
			if (result.roll >= pos) {
				result.positive = true;
			} else if (result.roll <= neg) {
				result.negative = true;
			}
		}
	},

	applyDamage: function (evt) {
		const target = $(evt.currentTarget);
		const damage = new Map();
		const accumulate = (key, value) => damage.set(key, (damage.get(key) || 0) + Number(value));
		const reduceDefenses = level => (acc, def) => {
			if (def.level === level) {
				acc.push(def.dmg);
			}

			return acc;
		};

		if (target.data('apply-all')) {
			target.closest('.obsidian-msg-row-dmg').prev().find('[data-dmg]').each((i, el) =>
				accumulate(el.dataset.type, el.dataset.dmg));
		} else {
			accumulate(target.data('type'), target.data('dmg'));
		}

		game.user.targets.forEach(async token => {
			const data = token.actor.data.data;
			const flags = token.actor.data.flags.obsidian;
			const npc = token.actor.data.type === 'npc';
			let hp = data.attributes.hp.value;

			Array.from(damage.entries()).forEach(([type, dmg]) => {
				const immune =
					npc ? data.traits.di.value.map(d => DAMAGE_CONVERT[d])
						: flags.defenses.damage.reduce(reduceDefenses('imm'), []);

				const resist =
					npc ? data.traits.dr.value.map(d => DAMAGE_CONVERT[d])
						: flags.defenses.damage.reduce(reduceDefenses('res'), []);

				const vuln =
					npc ? data.traits.dv.value.map(d => DAMAGE_CONVERT[d])
						: flags.defenses.damage.reduce(reduceDefenses('vuln'), []);

				if (immune.includes(type)) {
					return;
				}

				if (resist.includes(type)) {
					dmg /= 2;
				}

				if (vuln.includes(type)) {
					dmg *= 2;
				}

				hp -= Math.clamped(Math.floor(dmg), 1, Infinity);
			});

			await token.actor.update({'data.attributes.hp.value': hp});
		});
	},

	applyRollModifiers: function (roll, rolls, rollMod) {
		if (rollMod.reroll > 1) {
			rolls.forEach(r => {
				if (r.last() < rollMod.reroll) {
					r.push(roll._roll().roll);
				}
			});
		}

		if (rollMod.min > 1) {
			rolls.forEach(r => {
				if (r.last() < rollMod.min) {
					r.push(rollMod.min);
				}
			});
		}
	},

	compileBreakdown: mods =>
		mods.filter(mod => mod.mod)
			.map(mod => `${mod.mod.sgnex()} ${mod.name.length ? `[${mod.name}]` : ''}`).join(''),

	compileExpression: function (roll) {
		return roll.parts.map(part => {
			if (part instanceof Die) {
				return part.total;
			}

			if (part instanceof DicePool) {
				return `{${part.rolls.map(r => Rolls.compileExpression(r)).join(', ')}}`;
			}

			return part;
		}).join(' ');
	},

	compileRerolls: (rolls, max, min = 1) => {
		const annotated = [];
		for (let i = 0; i < rolls.length; i++) {
			const roll = rolls[i];
			let cls;

			if (i === rolls.length - 1) {
				if (roll >= max) {
					cls = 'positive';
				} else if (roll <= min) {
					cls = 'negative';
				}
			} else {
				cls = 'grey';
			}

			if (cls) {
				annotated.push(`<span class="obsidian-${cls}">${roll}</span>`);
			} else {
				annotated.push(roll.toString());
			}
		}

		if (rolls.length > 1) {
			return `[${annotated.join(',')}]`;
		}

		return annotated[0];
	},

	compileSave: function (actor, save) {
		const result = {
			effect: save.effect,
			target: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${save.target}`)
		};

		if (save.calc === 'formula') {
			let bonus = 8;
			if (!OBSIDIAN.notDefinedOrEmpty(save.bonus)) {
				bonus = Number(save.bonus);
			}

			result.dc = save.value;
			result.breakdown = bonus + Rolls.compileBreakdown(save.rollParts);
		} else {
			result.dc = save.fixed;
			result.breakdown = `${result.dc} [${game.i18n.localize('OBSIDIAN.Fixed')}]`;
		}

		return result;
	},

	create: function (actor, options) {
		if (!options.roll) {
			return;
		}

		if (!actor) {
			if (options.actor) {
				actor = game.actors.get(options.actor);
			} else if (options.scene && options.token) {
				actor = ObsidianActor.fromSceneTokenPair(options.scene, options.token);
			}
		}

		if (!actor) {
			return;
		}

		const roll = options.roll;
		if (roll === 'item') {
			if (options.id === undefined) {
				return;
			}

			const item = actor.getEmbeddedEntity('OwnedItem', options.id);
			if (!item) {
				return;
			}

			Rolls.toChat(actor,
				...Rolls.itemRoll(actor, item, Number(options.scaling), options.withDuration));
		} else if (roll === 'fx') {
			if (options.uuid === undefined) {
				return;
			}

			const effect = actor.data.obsidian.effects.get(options.uuid);
			if (!effect) {
				return;
			}

			Rolls.toChat(actor, ...Rolls.effectRoll(actor, effect, {
				scaledAmount: Number(options.scaling),
				withDuration: options.withDuration
			}));
		} else if (roll === 'save') {
			if (!options.save) {
				return;
			}

			if (options.save === 'death') {
				Rolls.toChat(actor, Rolls.death(actor));
			} else {
				Rolls.toChat(actor, Rolls.savingThrow(actor, options.save));
			}
		} else if (roll === 'abl') {
			if (!options.abl) {
				return;
			}

			if (options.abl === 'init') {
				Rolls.toChat(actor, Rolls.initiative(actor));
			} else {
				Rolls.toChat(actor, Rolls.abilityCheck(actor, options.abl));
			}
		} else if (roll === 'skl') {
			if (!options.skl) {
				return;
			}

			const skill = getProperty(actor.data.flags.obsidian.skills, options.skl);
			if (!skill) {
				return;
			}

			Rolls.toChat(actor, Rolls.skillCheck(actor, skill, options.skl));
		} else if (roll === 'tool') {
			if (options.tool === undefined) {
				return;
			}

			const tool = actor.data.flags.obsidian.skills.tools[Number(options.tool)];
			if (!tool) {
				return;
			}

			Rolls.toChat(actor, Rolls.skillCheck(actor, tool));
		} else if (roll === 'dmg') {
			if (options.effect === undefined) {
				return;
			}

			const effect = actor.data.obsidian.effects.get(options.effect);
			if (!effect) {
				return;
			}

			Rolls.toChat(
				actor,
				...Rolls.damage(
					actor, effect, Number(options.count), Number(options.scaling)));
		}
	},

	d20Breakdown: function (r, crit, total, mods) {
		const extraRolls = mods.filter(mod => mod.roll);
		if (!extraRolls.length) {
			// Simplified breakdown.
			return Rolls.compileRerolls(r, crit) + Rolls.compileBreakdown(mods);
		}

		return '1d20 '
			+ extraRolls.map(mod => `${mod.sgn} ${mod.ndice}d${mod.die}`).join(' ')
			+ Rolls.compileBreakdown(mods) + ' = '
			+ Rolls.compileRerolls(r, crit)
			+ extraRolls.map(mod => ` ${mod.sgn} (${mod.roll.results.join('+')})`).join('')
			+ total.sgnex();
	},

	d20Roll: function (actor, adv = [], mods = [], crit = 20, fail = 1, rollMod) {
		let n = 2;
		if (rollMod) {
			n += rollMod.ndice;
		}

		const roll = new Die(20).roll(n);
		const rolls = roll.results.map(r => [r]);

		if (rollMod) {
			Rolls.applyRollModifiers(roll, rolls, rollMod);
			if (Array.isArray(rollMod.mode)) {
				adv.push(...rollMod.mode);
			} else {
				adv.push(rollMod.mode);
			}
		}

		const total = mods.reduce((acc, mod) => {
			if (mod.ndice !== undefined) {
				if (mod.ndice < 0) {
					mod.sgn = '-';
					mod.ndice *= -1;
				} else {
					mod.sgn = '+';
				}

				mod.roll = new Die(mod.die).roll(mod.ndice);
				return acc + mod.roll.results.reduce((acc, r) => acc + r, 0);
			}

			return acc + mod.mod;
		}, 0);

		const results = rolls.map(r => {
			return {
				roll: r.last(),
				total: r.last() + total,
				breakdown: Rolls.d20Breakdown(r, crit, total, mods)
			}
		});

		Rolls.annotateCrits(crit, fail, results);
		Rolls.annotateAdvantage(
			determineAdvantage(actor.data.flags.obsidian.sheet.roll, ...adv),
			results);

		return results;
	},

	damage: function (actor, effect, count, scaledAmount) {
		if (isNaN(scaledAmount)) {
			scaledAmount = undefined;
		}

		if (count === undefined || isNaN(count)) {
			count = 1;
		}

		const item = actor.data.obsidian.itemsByID.get(effect.parentItem);
		const isVersatile =
			effect.components.some(c => c.type === 'attack' && c.mode === 'versatile');
		const damage =
			effect.components.filter(c => c.type === 'damage' && c.versatile === isVersatile);
		const scaling = item.obsidian.scaling.find(e => e.scalingComponent.ref === effect.uuid);

		if (!item || !damage.length) {
			return [];
		}

		const msgs = [];
		for (let i = 0; i < count; i++) {
			msgs.push({
				flags: {
					obsidian: {
						type: 'dmg',
						title: item.name,
						damage: Rolls.rollDamage(actor, damage, {
							scaledAmount: scaledAmount, scaling: scaling
						})
					}
				}
			});
		}

		return msgs;
	},

	death: function (actor) {
		const data = actor.data.data;
		const flags = actor.data.flags.obsidian;
		const advantageComponents = [flags.saves.roll, flags.attributes.death.roll];
		let mods = [{
			mod: (flags.saves.bonus || 0) + (flags.attributes.death.bonus || 0),
			name: game.i18n.localize('OBSIDIAN.Bonus')
		}];

		const bonuses = actor.data.obsidian.filters.bonuses(Filters.appliesTo.deathSaves);
		if (bonuses.length) {
			mods.push(...bonuses.flatMap(bonus => bonusToParts(actor.data, bonus)));
			mods = highestProficiency(mods);
		}

		const rollMods = actor.data.obsidian.filters.mods(Filters.appliesTo.deathSaves);
		const rollMod = Effect.combineRollMods(rollMods);
		const roll = Rolls.simpleRoll(actor, {
			type: 'save',
			title: game.i18n.localize('OBSIDIAN.DeathSave'),
			subtitle: game.i18n.localize('OBSIDIAN.SavingThrow'),
			adv: advantageComponents,
			mods: mods,
			rollMod: rollMod
		});

		// If no advantage or disadvantage, take the first roll, otherwise find
		// the highest or lowest roll, respectively.
		const result = roll.flags.obsidian.results[0].find(r => r.active);
		const success = result.total >= flags.attributes.death.threshold;
		const key = success ? 'success' : 'failure';
		let tally = data.attributes.death[key] + 1;

		if (result.roll === 1) {
			tally++;
		}

		if (tally > 3) {
			tally = 3;
		}

		roll.flags.obsidian.addendum = {success: success};
		roll.flags.obsidian.addendum.label =
			game.i18n.localize(`OBSIDIAN.${success ? 'Success' : 'Failure'}`);

		if (tally > 2) {
			if (success) {
				roll.flags.obsidian.addendum.label = game.i18n.localize('OBSIDIAN.Stable');
			} else {
				roll.flags.obsidian.addendum.label = game.i18n.localize('OBSIDIAN.Deceased');
			}
		}

		if (result.roll === 20) {
			let hp = data.attributes.hp.value;
			if (hp < 1) {
				hp = 1;
			}

			actor.update({
				'data.attributes.death.success': 0,
				'data.attributes.death.failure': 0,
				'data.attributes.hp.value': hp,
				'flags.obsidian.attributes.conditions.unconscious': false
			});
		} else {
			actor.update({[`data.attributes.death.${key}`]: tally});
		}

		return roll;
	},

	effectRoll: function (actor, effect, {name, scaledAmount, isFirst = true, withDuration = true}) {
		const item = actor.data.obsidian.itemsByID.get(effect.parentItem);
		const attacks = effect.components.filter(c => c.type === 'attack');
		const damage = effect.components.filter(c => c.type === 'damage');
		const saves = effect.components.filter(c => c.type === 'save');
		const expr = effect.components.filter(c => c.type === 'expression');
		const targets =
			effect.components.filter(c => c.type === 'target' && c.target === 'individual');
		const scaling = item.obsidian.scaling.find(e => e.scalingComponent.ref === effect.uuid);
		const results = [];

		if (withDuration) {
			handleDurations(actor, item, effect, scaledAmount);
		}

		let scaledTargets = 0;
		if (scaledAmount > 0 && scaling) {
			const targetScaling =
				scaling.components.find(c => c.type === 'target' && c.target === 'individual');

			if (targetScaling) {
				scaledTargets = Math.floor(targetScaling.count * scaledAmount);
			}
		}

		let multiDamage = scaledTargets;
		if (targets.length) {
			multiDamage += targets[0].count;
		}

		if (!damage.length || attacks.length || multiDamage < 1 || saves.length) {
			results.push({
				type: item.type === 'spell' ? 'spl' : 'fx',
				title: name ? name : effect.name.length ? effect.name : item.name
			});
		}

		if (attacks.length) {
			let count = attacks[0].targets + scaledTargets;
			results[0].results = [];

			for (let i = 0; i < count; i++) {
				results[0].results.push(Rolls.toHitRoll(actor, attacks[0]));
			}

			results[0].dmgBtn = effect.uuid;
			results[0].dmgCount = count;
			results[0].dmgScaling = scaledAmount;
			results[0].subtitle = game.i18n.localize(attacks[0].attackType);
		} else if (damage.length && multiDamage < 1) {
			results[0].damage = Rolls.rollDamage(actor, damage, {
				scaledAmount: scaledAmount,
				scaling: scaling
			});
		}

		if (saves.length) {
			results[0].saves = saves.map(save => Rolls.compileSave(actor, save));
		}

		if (expr.length) {
			results[0].exprs = expr.map(expr => Rolls.rollExpression(actor, expr));
		}

		if (damage.length && !attacks.length && multiDamage > 0) {
			for (let i = 0; i < multiDamage; i++) {
				results.push({
					type: item.type === 'spell' ? 'spl' : 'fx',
					title: name ? name : effect.name.length ? effect.name : item.name,
					damage: Rolls.rollDamage(actor, damage, {
						scaledAmount: scaledAmount,
						scaling: scaling
					})
				});
			}
		}

		if (isFirst) {
			results[0].upcast = scaledAmount;
			results[0].details = item;
			results[0].open = !attacks.length && !damage.length;

			if (effect.components.some(c => c.type === 'target' && c.target === 'area')) {
				results[0].aoe = effect.uuid;
			}
		}

		return results.map(result => {
			return {flags: {obsidian: result}}
		});
	},

	fromClick: function (actor, evt) {
		if (!evt.currentTarget.dataset) {
			return;
		}

		Rolls.create(actor, evt.currentTarget.dataset);
	},

	hd: function (actor, rolls, conBonus) {
		const results = rolls.map(([n, d]) => new Die(d).roll(n));
		Rolls.toChat(actor, {
			flags: {
				obsidian: {
					type: 'hd',
					title: game.i18n.localize('OBSIDIAN.HD'),
					results: [[{
						total: results.reduce((acc, die) => acc + die.total, 0) + conBonus,
						breakdown:
							`${rolls.map(([n, d]) => `${n}d${d}`).join('+')}${conBonus.sgn()} = `
							+ results.map(die => `(${die.results.join('+')})`).join(' + ')
							+ conBonus.sgnex()
					}]]
				}
			}
		});

		return results;
	},

	initiative: function (actor) {
		const data = actor.data.data;
		const flags = actor.data.flags.obsidian;
		const rollMods =
			actor.data.obsidian.filters.mods(
				Filters.appliesTo.initiative(flags.attributes.init.ability));

		const rollMod = Effect.combineRollMods(rollMods);
		const mods = duplicate(flags.attributes.init.rollParts);

		if (OBSIDIAN.notDefinedOrEmpty(flags.attributes.init.override)) {
			mods.push({
				mod: data.abilities[flags.attributes.init.ability].mod,
				name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${flags.attributes.init.ability}`)
			});

			if (flags.skills.joat) {
				mods.push({
					mod: Math.floor(data.attributes.prof / 2),
					name: game.i18n.localize('OBSIDIAN.ProfAbbr')
				});
			}

			mods.push({
				mod: data.attributes.init.value,
				name: game.i18n.localize('OBSIDIAN.Bonus')
			});
		} else {
			mods.push({
				mod: Number(flags.attributes.init.override),
				name: game.i18n.localize('OBSIDIAN.Override')
			});
		}

		return Rolls.abilityCheck(
			actor, flags.attributes.init.ability, game.i18n.localize('OBSIDIAN.Initiative'),
			[flags.attributes.init.roll], mods, rollMod);
	},

	itemRoll: function (actor, item, scaling, withDuration) {
		if (!item.flags.obsidian || !item.flags.obsidian.effects) {
			return [];
		}

		const itemFlags = item.flags.obsidian;
		if (!itemFlags.effects.length) {
			return [{
				flags: {
					obsidian: {
						type: item.type === 'spell' ? 'spl' : 'fx',
						title: item.name,
						details: item,
						open: true
					}
				}
			}];
		}


		return itemFlags.effects
			.filter(effect => !effect.isScaling || effect.selfScaling)
			.flatMap((effect, i) => Rolls.effectRoll(actor, effect, {
				name: item.name,
				scaledAmount: scaling,
				isFirst: i === 0,
				withDuration: withDuration
			}));
	},

	placeTemplate: function (evt) {
		let actor = game.actors.get(evt.currentTarget.dataset.actor);
		if (!actor) {
			actor =
				ObsidianActor.fromSceneTokenPair(
					evt.currentTarget.dataset.scene,
					evt.currentTarget.dataset.token);

			if (!actor) {
				return;
			}
		}

		const effect = actor.data.obsidian.effects.get(evt.currentTarget.dataset.effect);
		if (!effect) {
			return;
		}

		const aoe = effect.components.find(c => c.type === 'target' && c.target === 'area');
		if (!aoe) {
			return;
		}

		const item = actor.items.find(item => item.data._id === effect.parentItem);
		if (!item) {
			return;
		}

		// Temporarily set the core data to the AoE so we can interface with
		// AbilityTemplate.
		if (!item.data.data.target) {
			item.data.data.target = {};
		}

		item.data.data.target.type = aoe.area;
		item.data.data.target.value = aoe.distance;

		const template = AbilityTemplate.fromItem(item);
		template.drawPreview();
	},

	recharge: function (item, effect, component) {
		const recharge = component.recharge;
		const roll = new Die(recharge.die).roll(recharge.ndice);

		return {
			flags: {
				obsidian: {
					type: 'item',
					title: item.name,
					subtitle: component.label,
					results: [[{
						total: roll.results.reduce((acc, val) => acc + val, 0) + recharge.bonus,
						breakdown:
							`${recharge.ndice}d${recharge.die}${recharge.bonus.sgnex()} = `
							+ `(${roll.results.join('+')})${recharge.bonus.sgnex()}`
					}]]
				}
			}
		};
	},

	rollDamage: function (actor, damage, {scaledAmount = 0, scaling = null}) {
		damage = damage.concat(
			damage.flatMap(dmg => dmg.rollParts)
				.filter(mod => mod.ndice !== undefined)
				.map(mod => {
					mod.derived = {ncrit: mod.ndice};
					mod.calc = 'formula';
					mod.addMods = false;
					mod.rollParts = [];
					return mod;
				}));

		if (scaledAmount > 0 && scaling != null && scaling.scalingComponent.method !== 'cantrip') {
			const damageComponents = scaling.components.filter(c => c.type === 'damage');
			if (damageComponents) {
				damage = damage.concat(duplicate(damageComponents).map(dmg => {
					if (dmg.calc === 'fixed') {
						const constant = dmg.rollParts.find(part => part.constant);
						if (constant) {
							constant.mod = Math.floor(constant.mod * scaledAmount);
						}
					} else {
						dmg.ndice = Math.floor(dmg.ndice * scaledAmount);
						dmg.derived.ncrit = Math.floor(dmg.derived.ncrit * scaledAmount);
					}

					return dmg;
				}));
			}
		}

		if (scaling != null && scaling.scalingComponent.method === 'cantrip') {
			const damageComponents = scaling.components.filter(c => c.type === 'damage');
			if (damageComponents) {
				damage = damage.concat(duplicate(damageComponents).map(dmg => {
					dmg.ndice = Math.floor(dmg.ndice * dmg.scaledDice);
					dmg.derived.ncrit = Math.floor(dmg.derived.ncrit * dmg.scaledDice);
					return dmg;
				}).filter(dmg => dmg.ndice > 0));
			}
		}

		const rolls = damage.map(dmg => {
			if (dmg.calc === 'fixed' || !dmg.ndice) {
				return null;
			}

			const hitRoll = new Die(dmg.die).roll(dmg.ndice);
			const critRoll = new Die(dmg.die).roll(dmg.derived.ncrit || dmg.ndice);
			const hitRolls = hitRoll.results.map(r => [r]);
			const allRolls = hitRolls.concat(critRoll.results.map(r => [r]));

			if (dmg.addMods === false) {
				return {hit: hitRolls, crit: allRolls};
			}

			const rollMods = Effect.filterDamage(actor.data, actor.data.obsidian.filters.mods, dmg);
			if (dmg.rollMod) {
				rollMods.push(dmg.rollMod);
			}

			const rollMod = Effect.combineRollMods(rollMods);
			Rolls.applyRollModifiers(hitRoll, allRolls, rollMod);
			return {hit: hitRolls, crit: allRolls};
		});

		const total = mode => rolls.reduce((acc, rolls) => {
			if (rolls[mode]) {
				return acc + rolls[mode].reduce((acc, r) => acc + r.last(), 0);
			}

			return 0;
		}, 0) + damage.flatMap(dmg => dmg.rollParts).reduce((acc, mod) => acc + mod.mod, 0);

		const results = mode => damage.map((dmg, i) => {
			let subRolls = rolls[i];
			if (subRolls) {
				subRolls = subRolls[mode];
			}

			const subTotal = dmg.rollParts.reduce((acc, mod) => acc + mod.mod, 0);
			let total = subTotal;
			let breakdown;

			if (subRolls) {
				total += subRolls.reduce((acc, r) => acc + r.last(), 0);
				breakdown =
					`${subRolls.length}d${dmg.die}${Rolls.compileBreakdown(dmg.rollParts)} = `
					+ `(${subRolls.map(r => Rolls.compileRerolls(r, dmg.die)).join('+')})`
					+ subTotal.sgnex();
			} else {
				breakdown =
					`${Rolls.compileBreakdown(dmg.rollParts)} = ${total}`.substring(3);
			}

			return {
				type: dmg.damage,
				total: total,
				breakdown: breakdown
			};
		});

		return {
			hit: {total: total('hit'), results: results('hit')},
			crit: {total: total('crit'), results: results('crit')}
		};
	},

	rollExpression: function (actor, expr) {
		const roll = new Roll(expr.expr, actor.data.data).roll();
		return {
			total: roll.total,
			flavour: expr.flavour,
			breakdown: `${roll.formula} = ${Rolls.compileExpression(roll)}`
		};
	},

	savingThrow: function (actor, save) {
		const flags = actor.data.flags.obsidian;
		const saveData = flags.saves[save];
		const adv = [flags.saves.roll];

		if (saveData.roll) {
			adv.push(saveData.roll);
		}

		const rollMods = actor.data.obsidian.filters.mods(Filters.appliesTo.savingThrows(save));
		const rollMod = Effect.combineRollMods(rollMods);

		return Rolls.simpleRoll(actor, {
			type: 'save',
			title: game.i18n.localize(`OBSIDIAN.Ability-${save}`),
			subtitle: game.i18n.localize('OBSIDIAN.SavingThrow'),
			adv: adv, mods: saveData.rollParts, rollMod: rollMod
		});
	},

	simpleRoll: function (actor, {type, title, parens, subtitle, adv = [], mods = [], rollMod}) {
		return {
			flags: {
				obsidian: {
					type: type,
					title: title,
					parens: parens,
					subtitle: subtitle,
					results: [Rolls.d20Roll(actor, adv, mods, 20, 1, rollMod)]
				}
			}
		}
	},

	skillCheck: function (actor, skill, id) {
		const flags = actor.data.flags.obsidian;
		const skillName = skill.custom ? skill.label : game.i18n.localize(`OBSIDIAN.Skill-${id}`);
		let tool = false;
		let key = id;

		if (!key) {
			let list = 'custom';
			let idx = flags.skills.custom.indexOf(skill);

			if (idx < 0) {
				tool = true;
				list = 'tools';
				idx = flags.skills.tools.indexOf(skill);
			}

			key = `${list}.${idx}`;
		}

		const rollMods =
			actor.data.obsidian.filters.mods(
				Filters.appliesTo.skillChecks(tool, key, skill.ability));

		const rollMod = Effect.combineRollMods(rollMods);
		return Rolls.abilityCheck(
			actor, skill.ability, skillName, [flags.skills.roll, skill.roll], skill.rollParts,
			rollMod);
	},

	toChat: function (actor, ...msgs) {
		const chatData = Rolls.toMessage(actor);
		ChatMessage.create(msgs.map((msg, i) => {
			const data = duplicate(chatData);
			if (i > 0) {
				data.sound = null;
			}

			if (actor.isToken) {
				msg.flags.obsidian.realToken = actor.token.data._id;
				msg.flags.obsidian.realScene = actor.token.scene.data._id;
			}

			msg.flags.obsidian.npc = actor.data.type === 'npc';
			return mergeObject(data, msg);
		}));
	},

	toMessage: function (actor, rollMode) {
		if (!rollMode) {
			rollMode = game.settings.get('core', 'rollMode');
		}

		const chatData = {
			speaker: ChatMessage.getSpeaker({actor: actor}),
			user: game.user.data._id,
			rollMode: rollMode,
			sound: CONFIG.sounds.dice,
			content: 'N/A' // This can't be blank for some reason.
		};

		if (['gmroll', 'blindroll'].includes(chatData.rollMode)) {
			chatData.whisper = game.users.entities.filter(user => user.isGM).map(user => user._id);
			if (chatData.rollMode === 'blindroll') {
				chatData.blind = true;
				AudioHelper.play({src: chatData.sound});
			}
		}

		if (chatData.rollMode === 'selfroll') {
			chatData.whisper = [game.user.data._id];
		}

		return chatData;
	},

	toHitRoll: function (actor, hit, extraMods = []) {
		const rollMods = actor.data.obsidian.filters.mods(Filters.appliesTo.attackRolls(hit));
		let rollMod = Effect.combineRollMods(rollMods);

		if (hit.rollMod) {
			rollMod = Effect.combineRollMods([rollMod, hit.rollMod]);
		}

		return Rolls.d20Roll(actor, [], [...hit.rollParts, ...extraMods], hit.crit, 1, rollMod);
	}
};
