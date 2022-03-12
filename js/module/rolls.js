import {OBSIDIAN} from '../global.js';
import {determineAdvantage, determineMode} from '../data/prepare.js';
import {Effect} from './effect.js';
import {Filters} from '../data/filters.js';
import AbilityTemplate from '../../../../systems/dnd5e/module/pixi/ability-template.js';
import {bonusToParts, highestProficiency} from '../data/bonuses.js';
import {applyEffects, handleDurations} from './duration.js';
import {hpAfterDamage} from '../data/defenses.js';
import {rollInitiative} from './combat.js';
import ObsidianActorSelectorDialog from '../dialogs/actor-selector.js';
import {RollParts} from './roll-parts.js';
import ObsidianDie from '../module/die.js';
import {conditionsAutoFail, conditionsRollMod, targetConditionsRollMod} from './conditions.js';

const DMG_COLOURS = {
	acd: 'acid', cld: 'ice', fir: 'fire', frc: 'force', lig: 'lightning', ncr: 'necrotic',
	psn: 'poison', psy: 'psychic', rad: 'radiant', thn: 'thunder', blg: 'white',prc: 'white',
	slh: 'white', hlg: 'starynight'
};

export const Rolls = {
	abilityCheck: function (actor, ability, skill, parts = [], rollMod) {
		if (!skill) {
			rollMod =
				Effect.determineRollMods(
					actor,
					Effect.combineRollMods([
						rollMod, conditionsRollMod(actor, {ability, roll: 'ability'})]),
					mode =>	Filters.appliesTo.abilityChecks(ability, mode));

			parts.push({
				mod: actor.data.data.abilities[ability].mod,
				name: game.i18n.localize(`OBSIDIAN.AbilityAbbr.${ability}`)
			}, ...actor.data.obsidian.abilities[ability].rollParts);
		}

		return Rolls.simpleRoll(actor, {
			type: 'abl',
			title: game.i18n.localize(`OBSIDIAN.Ability.${ability}`),
			parens: skill,
			subtitle: game.i18n.localize('OBSIDIAN.AbilityCheck'),
			parts, rollMod
		});
	},

	abilityRecharge: function (item, effect, component) {
		const recharge = component.recharge;
		const parts = [{mod: 0, ndice: 1, die: 6}];

		RollParts.rollParts(parts);

		const roll = parts[0].results[0].last();
		const success = roll >= recharge.roll;

		return {
			flags: {
				obsidian: {
					type: 'item',
					title: component.name.length
						? component.name
						: effect.name.length ? effect.name : item.name,
					subtitle:
						`${game.i18n.localize('OBSIDIAN.RechargeTitle')} ${recharge.roll}&mdash;6`,
					results: [[{
						total: RollParts.calculateTotal(parts),
						breakdown: RollParts.compileBreakdown(parts)
					}]],
					addendum: {
						success: success,
						label: game.i18n.localize(`OBSIDIAN.${success ? 'Recharged' : 'Failure'}`)
					}
				}
			}
		};
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

	applyDamage: async function (evt) {
		const target = $(evt.currentTarget);
		const damage = new Map();
		const accumulate = (key, value) => damage.set(key, (damage.get(key) || 0) + Number(value));

		if (target.data('apply-all')) {
			target.closest('.obsidian-msg-row-dmg').parent().find('[data-type]').each((i, el) =>
				accumulate(el.dataset.type, el.dataset.dmg));
		} else {
			accumulate(target.data('type'), target.data('dmg'));
		}

		const mult = evt.ctrlKey ? .5 : evt.shiftKey ? 2 : 1;
		for (const [type, dmg] of damage.entries()) {
			damage.set(type, Math.floor(dmg * mult));
		}

		let attack;
		const message = game.messages.get(target.closest('.message').data('message-id'));

		if (message) {
			attack = message.data.flags.obsidian.damage?.attack;
		}

		for (const token of game.user.targets) {
			await token.actor.update(hpAfterDamage(token.actor, damage, attack));
		}
	},

	applySave: async function (evt, collection) {
		const autoFail = evt.ctrlKey;
		const idx = Number(evt.currentTarget.dataset.index);
		const msgID = evt.currentTarget.closest('[data-message-id]').dataset.messageId;
		const msg = game.messages.get(msgID);

		if (!msg) {
			return;
		}

		// Only apply effects if there are targeted tokens. Otherwise we just
		// roll for the selected tokens and do nothing else.
		const flags = msg.data.flags.obsidian;
		const apply = game.user.targets.size > 0;
		const actor = ChatMessage.getSpeakerActor(msg.data.speaker);
		const tokens = apply ? Array.from(game.user.targets) : canvas.tokens.controlled;
		const component = flags[collection][idx];
		const rolls = [];
		let conditions;

		const effect = actor?.data.obsidian.effects.get(flags.effectId);
		const item = actor?.items.get(effect?.parentItem);

		if (actor && effect?.applies.length) {
			conditions =
				effect.applies
					.map(uuid => actor.data.obsidian.effects.get(uuid))
					.filter(_ => _)
					.flatMap(e => e.components)
					.filter(c => c.type === 'condition')
					.map(c => c.condition);
		}

		if (!autoFail) {
			if (collection === 'saves') {
				rolls.push(...tokens.map(t =>
					Rolls.savingThrow(t.actor, component.ability, {conditions, item})));
			} else if (OBSIDIAN.notDefinedOrEmpty(component.skill)) {
				rolls.push(...tokens.map(t =>
					Rolls.abilityCheck(
						t.actor, component.ability, false, [],
						Effect.sheetGlobalRollMod(t.actor))));
			} else {
				rolls.push(...tokens.map(t => {
					const skill = Rolls.findSkill(t.actor, component.component);
					const tool = Rolls.findTool(t.actor, component.component);

					if (!skill && !tool) {
						return Rolls.abilityCheck(
							t.actor, component.ability, false, [],
							Effect.sheetGlobalRollMod(t.actor));
					}

					if (skill) {
						return Rolls.skillCheck(
							t.actor, skill, 'skills', Filters.appliesTo.skillChecks);
					} else {
						return Rolls.skillCheck(
							t.actor, tool, 'tools', Filters.appliesTo.toolChecks);
					}
				}));
			}

			Rolls.sendMessages(tokens.map((t, i) => [rolls[i], t.actor]));
		}

		if (!apply || !actor || !effect) {
			return;
		}

		const attack = flags.damage?.hit.attack;
		const totalDamage = Rolls.getDamageFromMessage(msg, 'hit');
		const targets = [];

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			const damage = new Map(Array.from(totalDamage.entries()));
			let failed = true;

			if (!autoFail) {
				const roll = rolls[i].flags.obsidian.results[0].find(r => r.active).total;
				failed =
					roll < component.dc ||
					conditionsAutoFail(token.actor.data, {
						roll: rolls[i].flags.obsidian.type,
						ability: component.ability
					});
			}

			if (failed) {
				targets.push(token);
			} else if (component.save.length) {
				if (component.save === 'none') {
					damage.clear();
				}

				for (const [type, dmg] of damage.entries()) {
					damage.set(type, Math.max(0, Math.floor(dmg / 2)));
				}
			}

			await token.actor.update(hpAfterDamage(token.actor, damage, attack));
		}

		await applyEffects(actor, effect, targets, 'save');
	},

	compileExpression: function (roll) {
		return roll.terms.map(part => {
			if (part instanceof Die) {
				return part.total;
			}

			if (part instanceof NumericTerm) {
				return part.number;
			}

			if (part instanceof OperatorTerm) {
				return part.operator;
			}

			if (part instanceof DicePool) {
				return `{${part.rolls.map(r => Rolls.compileExpression(r)).join(', ')}}`;
			}

			return part;
		}).join(' ');
	},

	compileDC: function (actor, component) {
		const result = {
			component: component,
			effect: component.effect,
			ability: component.target,
			save: component.save,
			target: game.i18n.localize(`OBSIDIAN.AbilityAbbr.${component.target}`)
		};

		if (!OBSIDIAN.notDefinedOrEmpty(component.skill)) {
			result.skill =
				component.skill === 'custom'
					? component.custom
					: game.i18n.localize(`OBSIDIAN.Skill.${component.skill}`);
		}

		if (component.calc === 'formula') {
			let bonus = 8;
			if (!OBSIDIAN.notDefinedOrEmpty(component.bonus)) {
				bonus = Number(component.bonus);
			}

			result.dc = component.value;
			result.breakdown = RollParts.compileBreakdown([{mod: bonus}, ...component.rollParts]);
		} else {
			result.dc = component.fixed;
			result.breakdown = `${result.dc} [${game.i18n.localize('OBSIDIAN.Fixed')}]`;
		}

		return result;
	},

	summon: function (evt) {
		const msg = game.messages.get(evt.currentTarget.closest('.obsidian-msg').dataset.messageId);
		const options = duplicate(evt.currentTarget.dataset);
		const [actor, effect] = Effect.fromMessage(msg);

		if (!actor || !effect) {
			return;
		}

		const summon = effect.components.find(c => c.type === 'summon');
		if (!summon) {
			return;
		}

		const item = actor.items.get(effect.parentItem);
		if (!item) {
			return;
		}

		if (!summon.actors.length) {
			return;
		}

		options.summoner = actor.uuid;
		options.parentComponent = summon.uuid;
		new ObsidianActorSelectorDialog(actor, summon.actors, options).render(true);
	},

	create: function (actor, options) {
		if (!options.roll || options.suppressCard) {
			return;
		}

		if (!actor) {
			actor = game.actors.get(options.actor);
		}

		if (!actor) {
			return;
		}

		const roll = options.roll;
		if (roll === 'item') {
			if (options.id === undefined) {
				return;
			}

			const item = actor.items.get(options.id);
			if (!item) {
				return;
			}

			Rolls.toChat(actor, ...Rolls.itemRoll(actor, item, options));
		} else if (roll === 'fx') {
			if (options.effectId === undefined) {
				return;
			}

			const effect = actor.data.obsidian.effects.get(options.effectId);
			if (!effect) {
				return;
			}

			Rolls.toChat(actor, ...Rolls.effectRoll(actor, effect, options));
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
				Rolls.toChat(actor,
					Rolls.abilityCheck(
						actor, options.abl, false, [], Effect.sheetGlobalRollMod(actor)));
			}
		} else if (roll === 'skl') {
			if (!options.skl) {
				return;
			}

			const skill = actor.data.data.skills[options.skl];
			if (!skill) {
				return;
			}

			Rolls.toChat(
				actor, Rolls.skillCheck(actor, skill, 'skills', Filters.appliesTo.skillChecks));
		} else if (roll === 'tool') {
			if (options.tool === undefined) {
				return;
			}

			const tool = actor.data.data.tools[options.tool];
			if (!tool) {
				return;
			}

			Rolls.toChat(
				actor, Rolls.skillCheck(actor, tool, 'tools', Filters.appliesTo.toolChecks));
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

	d20Roll: function (actor, parts = [], crit = 20, fail = 1, rollMod) {
		if (crit == null) {
			crit = 20;
		} else {
			crit = Number(crit);
		}

		let n = 2;
		let adv = [];

		if (rollMod) {
			n += rollMod.ndice;
			crit = Math.clamped(Math.min(crit, rollMod.mcrit), 0, 20);
			adv = adv.concat(rollMod.mode);
		}

		const d20s = [];
		for (let i = 0; i < n; i++) {
			d20s.push({mod: 0, ndice: 1, die: 20, crit});
		}

		RollParts.rollParts(d20s);
		RollParts.rollParts(parts);
		RollParts.applyRollModifiers(d20s, rollMod);

		const rollMode =
			window.event?.altKey ? 1
			: window.event?.ctrlKey ? -1
			: window.event?.shiftKey ? 0
			: determineAdvantage(...adv);

		if (game.settings.get('obsidian','rollOneDie') && rollMode === 0) {
			d20s.pop();
		}

		const results = [];
		for (let i = 0; i < d20s.length; i++) {
			const d20 = d20s[i];
			const isFirst = i === 0;
			const allParts = [d20, ...duplicate(parts)];

			results.push({
				data3d: RollParts.compileData3D(isFirst ? allParts : [d20]),
				roll: d20.results[0].last(),
				total: RollParts.calculateTotal(allParts),
				breakdown: RollParts.compileBreakdown(allParts)
			});
		}

		Rolls.annotateCrits(crit, fail, results);
		Rolls.annotateAdvantage(rollMode, results);

		return results;
	},

	damage: function (actor, effect, count, scaledAmount) {
		if (isNaN(scaledAmount)) {
			scaledAmount = undefined;
		}

		if (count === undefined || isNaN(count)) {
			count = 1;
		}

		const item = actor.items.get(effect.parentItem);
		const isVersatile =
			effect.components.some(c => c.type === 'attack' && c.mode === 'versatile');

		let damage = Effect.getEagerlyScaledDamage(item, effect, isVersatile);
		let scaling;

		if (scaledAmount) {
			scaling = Effect.getScaling(actor, effect, scaledAmount);
		}

		if (scaling) {
			damage = Effect.scaleDamage(actor, scaling, scaledAmount, damage);
		}

		if (!item || !damage.length) {
			return [];
		}

		applyEffects(actor, effect, game.user.targets, 'hit');

		const msgs = [];
		for (let i = 0; i < count; i++) {
			msgs.push({
				flags: {
					obsidian: {
						type: 'dmg',
						title: item.name,
						damage: Rolls.rollDamage(actor, damage, {
							item: item,
							scaledAmount: scaledAmount,
							scaling: scaling
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
		let parts = [{
			mod: (flags.saves.bonus || 0) + (flags.attributes.death.bonus || 0),
			name: game.i18n.localize('OBSIDIAN.Bonus')
		}];

		const rollMod =
			Effect.determineRollMods(
				actor,
				Effect.makeModeRollMod([
					flags.sheet.roll, flags.saves.roll, flags.attributes.death.roll]),
				mode => Filters.appliesTo.deathSaves(mode));

		const mode = determineMode(...rollMod.mode)
		const bonuses = actor.data.obsidian.filters.bonuses(Filters.appliesTo.deathSaves(mode));
		if (bonuses.length) {
			parts.push(...bonuses.flatMap(bonus => bonusToParts(actor, bonus)));
			parts = highestProficiency(parts);
		}

		const roll = Rolls.simpleRoll(actor, {
			type: 'save',
			title: game.i18n.localize('OBSIDIAN.DeathSave'),
			subtitle: game.i18n.localize('OBSIDIAN.SavingThrow'),
			parts, rollMod
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
				'data.attributes.hp.value': hp
			}).then(() => {
				const unconscious =
					actor.effects.find(effect =>
						effect.getFlag('core', 'statusId') === 'unconscious');

				if (unconscious) {
					unconscious.delete();
				}
			});
		} else {
			actor.update({[`data.attributes.death.${key}`]: tally});
		}

		return roll;
	},

	DSN: function (data3d) {
		const notation = {throws: [{dice: []}]};
		const dice = notation.throws[0].dice;
		let resultIdx = 0;

		data3d.formula.split('+').forEach(roll => {
			const [n, d] = roll.split('d');
			for (let i = 0; i < n; i++) {
				const die = {
					vectors: [],
					options: {},
					type: `d${d}`,
					result: data3d.results[resultIdx],
					resultLabel: data3d.results[resultIdx]
				};

				if (data3d.colours && data3d.colours[resultIdx]) {
					die.options.colorset = data3d.colours[resultIdx];
				}

				dice.push(die);
				resultIdx++;
			}
		});

		return notation;
	},

	DSNColours: function (colour, hitRolls, allRolls) {
		const colours = [];
		for (let i = 0; i < allRolls; i++) {
			if (i < hitRolls) {
				colours.push(colour);
			} else {
				colours.push('bloodmoon');
			}
		}

		return colours;
	},

	effectRoll: function (actor, effect, options, {name, isFirst = true} = {}) {
		const item = actor.items.get(effect.parentItem);
		const attacks = effect.components.filter(c => c.type === 'attack');
		const saves = effect.components.filter(c => c.type === 'save');
		const checks = effect.components.filter(c => c.type === 'check');
		const expr = effect.components.filter(c => c.type === 'expression');
		const desc = effect.components.find(c => c.type === 'description');
		const targets =
			effect.components.find(c => c.type === 'target' && c.target === 'individual');

		const results = [];
		let scaledAmount = options.scaling || 0;
		const isVersatile = attacks.some(c => c.mode === 'versatile');
		let damage = Effect.getEagerlyScaledDamage(item, effect, isVersatile);

		if (item.type === 'spell') {
			scaledAmount = Math.max(0, options.spellLevel - item.data.data.level);
		}

		const scaling =
			Effect.getScaling(actor, effect,
				options.consumed || options.spellLevel || scaledAmount);

		if (scaledAmount && scaling) {
			damage = Effect.scaleDamage(actor, scaling, scaledAmount, damage);
		}

		const duration = Rolls.rollDuration(actor, effect);
		if (options.withDuration !== false) {
			handleDurations(actor, item, effect, scaledAmount, duration?.total);
		}

		let scaledTargets = targets?.count || 1;
		if (scaledAmount && scaling) {
			const targetScaling =
				scaling.effect.components.find(c =>
					c.type === 'target' && c.target === 'individual');

			if (targetScaling) {
				scaledTargets =
					Effect.scaleConstant(scaling, scaledAmount, scaledTargets, targetScaling.count);
			}
		}

		const pools = Rolls.getDicePools(actor, effect, options);
		if (!damage.length || attacks.length || scaledTargets < 2 || saves.length
			|| checks.length || expr.length || pools)
		{
			results.push({
				type: item.type === 'spell' ? 'spl' : 'fx',
				title: name ? name : effect.name.length ? effect.name : item.name,
				effectId: effect.uuid
			});
		}

		if (attacks.length) {
			let count = attacks[0].targets;
			if (scaledAmount && scaling) {
				count = scaledTargets;
			}

			results[0].results = [];
			for (let i = 0; i < count; i++) {
				results[0].results.push(Rolls.toHitRoll(actor, attacks[0]));
			}

			results[0].hit = true;
			results[0].dmgBtn = effect.uuid;
			results[0].dmgCount = count;
			results[0].dmgScaling = scaledAmount;
			results[0].subtitle = game.i18n.localize(attacks[0].attackType);
		} else if (damage.length && scaledTargets < 2) {
			results[0].damage = Rolls.rollDamage(actor, damage, {item});
		}

		if (saves.length) {
			results[0].saves = saves.map(save => Rolls.compileDC(actor, save));
		}

		if (checks.length) {
			results[0].checks = checks.map(check => Rolls.compileDC(actor, check));
		}

		if (expr.length) {
			results[0].exprs = expr.map(expr => Rolls.rollExpression(actor, expr, scaledAmount));
		}

		if (pools) {
			results[0].pools = pools;
		}

		if (damage.length && !attacks.length && scaledTargets > 1) {
			for (let i = 0; i < scaledTargets; i++) {
				results.push({
					type: item.type === 'spell' ? 'spl' : 'fx',
					title: name ? name : effect.name.length ? effect.name : item.name,
					damage: Rolls.rollDamage(actor, damage, {item})
				});
			}
		}

		let details = item.data.flags.obsidian.display || item.data.data.description.value;
		if (desc) {
			details = desc.display;
		}

		if (isFirst) {
			results[0].upcast = scaledAmount;
			results[0].item = item.data;
			results[0].details = details;
			results[0].open = !attacks.length && !damage.length;
			results[0].duration = duration;

			if (effect.components.some(c => c.type === 'target' && c.target === 'area')) {
				results[0].aoe = effect.uuid;
				results[0].consumed = options.consumed;
				results[0].spellLevel = options.spellLevel;
			}

			if (effect.components.some(c => c.type === 'summon')) {
				results[0].summon = effect.uuid;
				results[0].consumed = options.consumed;
				results[0].spellLevel = options.spellLevel;
			}
		}

		return results.map(result => {
			return {flags: {obsidian: result, 'core.canPopout': true}}
		});
	},

	fromClick: function (actor, evt) {
		if (!evt.currentTarget.dataset) {
			return;
		}

		Rolls.create(actor, evt.currentTarget.dataset);
	},

	getDamageFromMessage: function (msg, hit) {
		const damage = new Map();
		if (!getProperty(msg.data, `flags.obsidian.damage.${hit}`)?.results.length) {
			return damage;
		}

		const accumulate = (key, value) => damage.set(key, (damage.get(key) || 0) + value);
		msg.data.flags.obsidian.damage[hit].results.forEach(dmg => accumulate(dmg.type, dmg.total));
		return damage;
	},

	getDicePools: function (actor, effect, options) {
		let resource;
		const consumer = effect.components.find(c => c.type === 'consume');

		if (consumer && !['qty', 'spell'].includes(consumer.target)) {
			const [, , refResource] = Effect.getLinkedResource(actor, consumer);
			if (refResource?.pool) {
				resource = refResource;
			}
		}

		if (!resource) {
			resource = effect.components.find(c => c.type === 'resource');
		}

		if (!resource?.pool) {
			return;
		}

		return Rolls.rollResource(resource, options.consumed || 1);
	},

	hd: function (actor, rolls, conBonus) {
		const rollMod = Effect.combineRollMods(actor.data.obsidian.filters.mods(Filters.isHD));
		const parts = rolls.map(([n, d]) => {
			return {mod: 0, ndice: n, die: d};
		});

		const bonuses =
			actor.data.obsidian.filters.bonuses(Filters.isHD).flatMap(bonus =>
				bonusToParts(actor, bonus));

		RollParts.rollParts(parts);
		RollParts.rollParts(bonuses);
		RollParts.applyRollModifiers(parts, rollMod);

		const allParts =
			parts.concat(bonuses)
				.concat([{mod: conBonus, name: game.i18n.localize('OBSIDIAN.AbilityAbbr.con')}]);

		const total = RollParts.calculateTotal(allParts);
		Rolls.toChat(actor, {
			flags: {
				obsidian: {
					type: 'hd',
					title: game.i18n.localize('OBSIDIAN.HD'),
					results: [[{
						total,
						data3d: RollParts.compileData3D(allParts),
						breakdown: RollParts.compileBreakdown(allParts)
					}]]
				}
			}
		});

		return total;
	},

	hp: function (actor, n, d, c) {
		const parts = [{mod: c, ndice: n, die: d}];
		RollParts.rollParts(parts);

		const total = RollParts.calculateTotal(parts);
		const data = Rolls.toMessage(actor, 'selfroll');

		ChatMessage.create(mergeObject(data, {
			flags: {
				obsidian: {
					type: 'hp',
					title: game.i18n.localize('OBSIDIAN.HP'),
					results: [[{total, breakdown: RollParts.compileBreakdown(parts)}]]
				}
			}
		}));

		return total;
	},

	initiative: function (actor) {
		const data = actor.data.data;
		const flags = actor.data.flags.obsidian;
		const derived = actor.data.obsidian;
		const parts = duplicate(derived.attributes.init.rollParts);
		const rollMod =
			Effect.determineRollMods(
				actor,
				Effect.combineRollMods([
					Effect.makeModeRollMod([flags.sheet.roll, flags.attributes.init.roll]),
					conditionsRollMod(
						actor, {ability: flags.attributes.init.ability, roll: 'ability'})
				]),
				mode => Filters.appliesTo.initiative(flags.attributes.init.ability, mode));

		if (OBSIDIAN.notDefinedOrEmpty(flags.attributes.init.override)) {
			parts.push({
				mod: data.abilities[flags.attributes.init.ability].mod,
				name: game.i18n.localize(`OBSIDIAN.AbilityAbbr.${flags.attributes.init.ability}`)
			});

			if (flags.skills.joat) {
				parts.push({
					mod: Math.floor(data.attributes.prof / 2),
					name: game.i18n.localize('OBSIDIAN.ProfAbbr')
				});
			}

			parts.push({
				mod: data.attributes.init.value,
				name: game.i18n.localize('OBSIDIAN.Bonus')
			});
		} else {
			parts.push({
				mod: Number(flags.attributes.init.override),
				name: game.i18n.localize('OBSIDIAN.Override')
			});
		}

		const initiative =
			Rolls.abilityCheck(
				actor, flags.attributes.init.ability, game.i18n.localize('OBSIDIAN.Initiative'),
				parts, rollMod);

		rollInitiative(actor, initiative.flags.obsidian.results[0].find(r => r.active).total);
		return initiative;
	},

	itemRoll: function (actor, item, options) {
		const itemData = item.data;
		const itemFlags = itemData.flags.obsidian;

		if (!itemFlags?.effects) {
			return [];
		}

		let upcast;
		if (item.type === 'spell') {
			upcast = Math.max(0, options.spellLevel - itemData.data.level);
		}

		const effects = itemFlags.effects.filter(effect => !effect.isLinked);
		if (!effects.length) {
			return [{
				flags: {
					obsidian: {
						type: item.type === 'spell' ? 'spl' : 'fx',
						title: item.name,
						item: item,
						details: item.obsidian.display || itemData.data.description.value,
						open: true,
						upcast: upcast
					}
				}
			}];
		}


		return effects.flatMap((effect, i) => Rolls.effectRoll(actor, effect, options, {
			name: item.name,
			isFirst: i === 0
		}));
	},

	findSkill: function (actor, skill) {
		const skills = actor.data.data.skills;
		if (skill.skill !== 'custom') {
			return skills[skill.skill];
		}

		return skills.find(skl =>
			skl.label.toLocaleLowerCase() === skill.custom.toLocaleLowerCase());
	},

	findTool: function (actor, tool) {
		return Object.values(actor.data.data.tools).find(entry =>
			entry.label?.toLocaleLowerCase() === tool.custom.toLocaleLowerCase());
	},

	placeTemplate: function (evt) {
		const msg = game.messages.get(evt.currentTarget.closest('.obsidian-msg').dataset.messageId);
		const options = evt.currentTarget.dataset;
		const [actor, effect] = Effect.fromMessage(msg);

		if (!actor || !effect) {
			return;
		}

		const aoe = effect.components.find(c => c.type === 'target' && c.target === 'area');
		if (!aoe) {
			return;
		}

		const item = actor.items.get(effect.parentItem);
		if (!item) {
			return;
		}

		let scaledDistance = aoe.distance;
		const scaledAmount = options.scaling || 0;
		const scaling =
			Effect.getScaling(
				actor, effect, options.consumed || options.spellLevel || options.scaling);

		if (scaledAmount && scaling) {
			const aoeScaling =
				scaling.effect.components.find(c => c.type === 'target' && c.target === 'area');

			if (aoeScaling) {
				scaledDistance =
					Effect.scaleConstant(
						scaling, scaledAmount, scaledDistance, aoeScaling.distance);
			}
		}

		// Temporarily set the core data to the AoE so we can interface with
		// AbilityTemplate.
		if (!item.data.data.target) {
			item.data.data.target = {};
		}

		item.data.data.target.type = aoe.area;
		item.data.data.target.value = scaledDistance;

		const template = AbilityTemplate.fromItem(item);
		template.drawPreview();
	},

	recharge: function (item, effect, component) {
		const recharge = component.recharge;
		const parts = [{mod: recharge.bonus || 0, ndice: recharge.ndice, die: recharge.die}];
		RollParts.rollParts(parts);

		return {
			flags: {
				obsidian: {
					type: 'item',
					title: item.name,
					subtitle: component.label,
					results: [[{
						total: RollParts.calculateTotal(parts),
						breakdown:RollParts.compileBreakdown(parts)
					}]]
				}
			}
		};
	},

	rollDamage: function (actor, damage, {item = null}) {
		damage.push(
			...damage.flatMap(dmg => dmg.rollParts)
				.filter(mod => mod.ndice !== undefined)
				.map(mod => {
					mod.derived = {ncrit: Math.abs(mod.ndice), ndice: mod.ndice};
					mod.calc = 'formula';
					mod.addMods = false;
					mod.rollParts = [];
					mod.damage = mod.damage || damage[0].damage;
					return mod;
				}));

		const diceParts = damage.map(dmg => {
			if (dmg.calc === 'fixed' || !dmg.derived.ndice) {
				return null;
			}

			let ncrit = dmg.derived.ncrit;
			const ndice = dmg.derived.ndice;
			const mult = ndice < 0 ? -1 : 1;

			if (ncrit == null) {
				ncrit = ndice;
			} else {
				ncrit *= mult;
			}

			let colour = DMG_COLOURS[dmg.damage];
			let numRolls = Math.abs(ndice) + Math.abs(ncrit);
			const parts = [
				{mod: 0, ndice: ndice, die: dmg.die},
				{mod: 0, ndice: ncrit, die: dmg.die}
			];

			if (dmg.extraCrit) {
				if (dmg.extraCrit.ndice) {
					numRolls += dmg.extraCrit.ndice;
					parts.push({
						mod: dmg.extraCrit.bonus || 0,
						ndice: dmg.extraCrit.ndice,
						die: dmg.extraCrit.die
					});
				} else if (dmg.extraCrit.bonus) {
					parts[1].mod = dmg.extraCrit.bonus;
				}
			}

			RollParts.rollParts(parts);

			if (!colour) {
				colour = 'black';
			}

			if (dmg.addMods !== false) {
				const rollMods =
					Effect.filterDamage(actor.data, actor.data.obsidian.filters.mods, dmg);

				if (dmg.rollMod) {
					rollMods.push(dmg.rollMod);
				}

				const rollMod = Effect.combineRollMods(rollMods);
				RollParts.applyRollModifiers(parts, rollMod);
			}

			const data3d = RollParts.compileData3D(parts);
			data3d.colours = Rolls.DSNColours(colour, Math.abs(ndice), numRolls);

			const hitPart = parts[0];
			const critParts = [{
				mod: parts[1].mod, ndice: ndice + ncrit, die: dmg.die,
				roll: ObsidianDie.combine(...parts.map(p => p.roll)),
				results: parts[0].results.concat(parts[1].results)
			}];

			if (dmg.extraCrit?.ndice) {
				critParts.push(parts[2]);
			}

			return {hit: [hitPart], crit: critParts, data3d};
		});

		const total = mode => diceParts.reduce((acc, parts) => {
			if (parts && parts[mode]) {
				return acc + RollParts.calculateTotal(parts[mode]);
			}

			return acc;
		}, 0) + RollParts.calculateTotal(damage.flatMap(dmg => dmg.rollParts));

		const results = mode => damage.map((dmg, i) => {
			let subParts = [];
			if (diceParts[i]) {
				subParts = diceParts[i][mode];
			}

			if (!subParts) {
				subParts = [];
			}

			const allParts = subParts.concat(dmg.rollParts);
			return {
				type: dmg.damage,
				total: RollParts.calculateTotal(allParts),
				breakdown: RollParts.compileBreakdown(allParts)
			};
		});

		let attack;
		if (item) {
			attack = {magical: !!item.data.flags.obsidian.magical};
			if (item.type === 'spell') {
				attack.magical = true;
				attack.spell = true;
			} else if (item.type === 'weapon') {
				attack.silver = item.data.flags.obsidian.tags.silver;
				attack.adamantine = item.data.flags.obsidian.tags.adamantine;
			}
		}

		return {
			attack: attack,
			hit: {total: Math.floor(total('hit')), results: results('hit')},
			crit: {total: Math.floor(total('crit')), results: results('crit')},
			data3d: {
				formula: diceParts.filter(_ => _).map(r => r.data3d.formula).join('+'),
				results: diceParts.filter(_ => _).reduce((acc, r) => {
					acc.push(...r.data3d.results);
					return acc;
				}, []),
				colours: diceParts.filter(_ => _).reduce((acc, r) => {
					acc.push(...r.data3d.colours);
					return acc;
				}, [])
			}
		};
	},

	rollDuration: function (actor, effect) {
		const duration = effect.components.find(c => c.type === 'duration');
		if (!duration || !duration.ndice) {
			return;
		}

		const parts = [{mod: duration.duration || 0, ndice: duration.ndice, die: duration.die}];
		RollParts.rollParts(parts);

		return {
			total: RollParts.calculateTotal(parts),
			breakdown: RollParts.compileBreakdown(parts)
		};
	},

	rollExpression: function (actor, expr, scaledAmount) {
		const data = actor.getRollData();
		data.scaling = scaledAmount || 0;

		const roll = new Roll(expr.expr, data).roll({async: false});

		return {
			total: roll.total,
			flavour: expr.flavour,
			breakdown: `${roll.formula} = ${Rolls.compileExpression(roll)}`
		};
	},

	rollResource: function (resource, rolls) {
		const parts = [{mod: 0, ndice: rolls, die: resource.die}];
		RollParts.rollParts(parts);

		return {
			flavour: resource.name,
			data3d: RollParts.compileData3D(parts),
			results: parts[0].results.map(r => {
				return {
					total: r.last(),
					breakdown: `1d${resource.die} = ${r.last()}`
				}
			})
		};
	},

	savingThrow: function (actor, save, {conditions = [], item} = {}) {
		const flags = actor.data.flags.obsidian;
		const saveData = flags.saves[save];
		const adv = [flags.saves.roll];

		if (saveData.roll) {
			adv.push(saveData.roll);
		}

		if (item) {
			const defenses = actor.data.obsidian.defenses.parts.conditions;
			['adv', 'dis'].forEach(mode => {
				if (item.type === 'spell' && defenses[mode].includes('spell')) {
					adv.push(mode);
				}

				if (item.data.flags.obsidian.magical && defenses[mode].includes('magic')) {
					adv.push(mode);
				}
			});
		}

		const rollMod =
			Effect.determineRollMods(
				actor,
				Effect.combineRollMods([
					Effect.makeModeRollMod([flags.sheet.roll, ...adv]),
					conditionsRollMod(actor, {
						ability: save,
						roll: 'save',
						applies: conditions
					})
				]),
				mode => Filters.appliesTo.savingThrows(save, mode));

		return Rolls.simpleRoll(actor, {
			type: 'save',
			title: game.i18n.localize(`OBSIDIAN.Ability.${save}`),
			subtitle: game.i18n.localize('OBSIDIAN.SavingThrow'),
			parts: actor.data.obsidian.saves[save].rollParts,
			rollMod
		});
	},

	sendMessages: function (messageActorTuple, dice3d = false) {
		ChatMessage.create(messageActorTuple.map(([msg, actor], i) => {
			const data = Rolls.toMessage(actor);
			if (i > 0 || dice3d) {
				data.sound = null;
			}

			msg.flags.obsidian.npc = actor.type === 'npc';
			return mergeObject(data, msg);
		}));
	},

	simpleRoll: function (actor, {type, title, parens, subtitle, parts = [], rollMod}) {
		return {
			flags: {
				obsidian: {
					type: type,
					title: title,
					parens: parens,
					subtitle: subtitle,
					results: [Rolls.d20Roll(actor, parts, 20, 1, rollMod)]
				}
			}
		}
	},

	skillCheck: function (actor, skill, prop, filter) {
		const flags = actor.data.flags.obsidian;
		const rollMod =
			Effect.determineRollMods(
				actor,
				Effect.combineRollMods([
					Effect.makeModeRollMod([flags.sheet.roll, flags.skills.roll, skill.roll]),
					conditionsRollMod(actor, {ability: skill.ability, skill: skill.key})
				]), mode => filter(skill.key, skill.ability, mode));

		return Rolls.abilityCheck(actor, skill.ability, skill.label, skill.rollParts, rollMod);
	},

	toChat: async function (actor, ...msgs) {
		const dice3d = game.modules.get('dice-so-nice')?.active;
        if (dice3d) {
        	// Collect all the dice data.
	        const data3d = {formula: [], results: [], colours: []};
	        msgs.forEach(msg => {
		        if (getProperty(msg, 'flags.obsidian.results')) {
		        	msg.flags.obsidian.results.forEach(result => result.forEach(roll => {
				        if (roll.data3d) {
					        data3d.formula.push(roll.data3d.formula);
					        data3d.results.push(...roll.data3d.results);
				        }
			        }))
		        }

		        if (getProperty(msg, 'flags.obsidian.damage.data3d')) {
			        data3d.formula.push(msg.flags.obsidian.damage.data3d.formula);
			        data3d.results.push(...msg.flags.obsidian.damage.data3d.results);
			        data3d.colours.push(...msg.flags.obsidian.damage.data3d.colours);
		        }

		        if (getProperty(msg, 'flags.obsidian.pools.data3d')) {
			        data3d.formula.push(msg.flags.obsidian.pools.data3d.formula);
			        data3d.results.push(...msg.flags.obsidian.damage.data3d.results);
		        }
	        });

			data3d.formula = data3d.formula.join('+');
			const rollMode = game.settings.get('core', 'rollMode');
			const whisper = [];

			if (['gmroll', 'blindroll'].includes(rollMode)) {
				whisper.push(...game.users.contents.filter(user => user.isGM).map(user => user.id));
			} else if(rollMode === "selfroll") {
				whisper.push(game.user.id);
			}

			await game.dice3d.show(
				Rolls.DSN(data3d),
				game.user,
				rollMode !== 'selfroll',
				whisper,
				rollMode === 'blindroll');
        }

		Rolls.sendMessages(msgs.map(msg => [msg, actor]), dice3d);
	},

	toMessage: function (actor, rollMode) {
		if (!rollMode) {
			rollMode = game.settings.get('core', 'rollMode');
		}

		const chatData = {
			speaker: ChatMessage.getSpeaker({actor: actor}),
			user: game.user.id,
			rollMode: rollMode,
			sound: CONFIG.sounds.dice,
			content: 'N/A' // This can't be blank for some reason.
		};

		if (['gmroll', 'blindroll'].includes(chatData.rollMode)) {
			chatData.whisper = game.users.contents.filter(user => user.isGM).map(user => user.id);
			if (chatData.rollMode === 'blindroll') {
				chatData.blind = true;
				AudioHelper.play({src: chatData.sound});
			}
		}

		if (chatData.rollMode === 'selfroll') {
			chatData.whisper = [game.user.id];
		}

		return chatData;
	},

	toHitRoll: function (actor, hit, extraParts = []) {
		let token = actor.token?.object;
		if (!token && canvas) {
			const selected = new Set(canvas.tokens.controlled);
			const {linked, unlinked} = canvas.tokens.placeables.reduce((acc, t) => {
				if (!(t instanceof Token) || t.data.actorId !== actor.id) {
					return acc;
				}

				if (t.data.actorLink) {
					acc.linked.push(t);
				} else {
					acc.unlinked.push(t);
				}

				return acc;
			}, {linked: [], unlinked: []});

			const selectedLinked = linked.filter(t => selected.has(t));
			const selectedUnlinked = unlinked.filter(t => selected.has(t));

			if (selectedLinked.length) {
				token = selectedLinked[0];
			} else if (selectedUnlinked.length) {
				token = selectedUnlinked[0];
			} else if (linked.length) {
				token = linked[0];
			} else if (unlinked.length) {
				token = unlinked[0];
			}
		}

		const rollMods = [
			Effect.sheetGlobalRollMod(actor),
			conditionsRollMod(actor, {ability: hit.ability, roll: 'attack'})
		];

		if (token && game.user.targets.size === 1) {
			const target = Array.from(game.user.targets.values())[0];
			if (target.actor) {
				rollMods.push(
					targetConditionsRollMod(target.actor.data, token.within5ftOf(target)));
			}
		}

		if (hit.rollMod) {
			rollMods.push(hit.rollMod);
		}

		const rollMod =
			Effect.determineRollMods(actor, Effect.combineRollMods(rollMods), mode =>
				Filters.appliesTo.attackRolls(hit, mode));

		return Rolls.d20Roll(actor, [...hit.rollParts, ...extraParts], hit.crit, 1, rollMod);
	}
};
