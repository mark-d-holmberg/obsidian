import {OBSIDIAN} from './rules.js';
import {determineAdvantage} from './prepare.js';
import {Effect} from '../module/effect.js';
import {FILTERS} from './filters.js';

export const Rolls = {
	abilityCheck: function (actor, ability, skill, adv = [], mods = [], rollMod) {
		if (!skill) {
			rollMod = Effect.filterRollMods(actor.data.obsidian.toggleable, filter =>
				FILTERS.isCheck(filter)
				&& FILTERS.isAttack(filter)
				&& FILTERS.inCollection(filter, ability));

			mods.push({
				mod: actor.data.data.abilities[ability].mod,
				name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${ability}`)
			});
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
			results.filter(r => r !== max).forEach(r => r.grey = true);
		} else {
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
		mods.filter(mod => mod.mod).map(mod => `${mod.mod.sgnex()} [${mod.name}]`).join(''),

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

		const total = mods.reduce((acc, mod) => acc + mod.mod, 0);
		const results = rolls.map(r => {
			return {
				roll: r.last(),
				total: r.last() + total,
				breakdown: Rolls.compileRerolls(r, crit) + Rolls.compileBreakdown(mods)
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
							crit: false, scaledAmount: scaledAmount, scaling: scaling
						}),
						crit: Rolls.rollDamage(actor, damage, {
							crit: true, scaledAmount: scaledAmount, scaling: scaling
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
		const mods = [{
			mod: (flags.saves.bonus || 0) + (flags.attributes.death.bonus || 0),
			name: game.i18n.localize('OBSIDIAN.Bonus')
		}];

		const rollMod = Effect.filterRollMods(actor.data.obsidian.toggleable, filter =>
			FILTERS.isSave(filter) && FILTERS.inCollection(filter, 'death'));

		const roll = Rolls.simpleRoll(actor, {
			type: 'save',
			title: game.i18n.localize('OBSIDIAN.DeathSave'),
			subtitle: game.i18n.localize('OBSIDIAN.SavingThrow'),
			adv: advantageComponents,
			mods: mods,
			rollMod: rollMod
		});

		const adv =
			determineAdvantage(
				flags.sheet.roll, flags.saves.roll, flags.attributes.death.roll, ...rollMod.mode);

		// If no advantage or disadvantage, take the first roll, otherwise find
		// the highest or lowest roll, respectively.
		const firstRoll = roll.flags.obsidian.results[0];
		const result =
			adv === 0
				? firstRoll[0]
				: adv > 0
					? firstRoll.reduce((acc, r) => r.total > acc.total ? r : acc)
					: firstRoll.reduce((acc, r) => r.total < acc.total ? r : acc);

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

	effectRoll: function (actor, effect, {name, scaledAmount, isFirst}) {
		const item = actor.data.obsidian.itemsByID.get(effect.parentItem);
		const attacks = effect.components.filter(c => c.type === 'attack');
		const damage = effect.components.filter(c => c.type === 'damage');
		const saves = effect.components.filter(c => c.type === 'save');
		const targets = effect.components.filter(c => c.type === 'target');
		const scaling = item.obsidian.scaling.find(e => e.scalingComponent.ref === effect.uuid);
		const results = [];

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

		if (!damage.length || attacks.length || multiDamage < 1) {
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
				crit: false,
				scaledAmount: scaledAmount,
				scaling: scaling
			});

			results[0].crit = Rolls.rollDamage(actor, damage, {
				crit: true,
				scaledAmount: scaledAmount,
				scaling: scaling
			});
		}

		if (saves.length) {
			results[0].saves = saves.map(save => Rolls.compileSave(actor, save));
		}

		if (damage.length && !attacks.length && multiDamage > 0) {
			for (let i = 0; i < multiDamage; i++) {
				results.push({
					type: item.type === 'spell' ? 'spl' : 'fx',
					title: name ? name : effect.name.length ? effect.name : item.name,
					damage: Rolls.rollDamage(actor, damage, {
						crit: false,
						scaledAmount: scaledAmount,
						scaling: scaling
					}),
					crit: Rolls.rollDamage(actor, damage, {
						crit: true,
						scaledAmount: scaledAmount,
						scaling: scaling
					})
				});
			}
		}

		if (isFirst) {
			results[0].details = item;
			results[0].open = !attacks.length && !damage.length;
		}

		return results.map(result => {
			return {flags: {obsidian: result}}
		});
	},

	fromClick: function (actor, evt) {
		if (!evt.currentTarget.dataset) {
			return;
		}

		const dataset = evt.currentTarget.dataset;
		if (!dataset.roll) {
			return;
		}

		if (!actor) {
			if (!dataset.actor) {
				return;
			}

			actor = game.actors.get(dataset.actor);
		}

		if (!actor) {
			return;
		}

		const roll = dataset.roll;
		if (roll === 'item') {
			if (dataset.id === undefined) {
				return;
			}

			const item = actor.getEmbeddedEntity('OwnedItem', dataset.id);
			if (!item) {
				return;
			}

			Rolls.toChat(actor, ...Rolls.itemRoll(actor, item, Number(dataset.scaling)));
		} else if (roll === 'fx') {
			if (dataset.uuid === undefined) {
				return;
			}

			const effect = actor.data.obsidian.effects.get(dataset.uuid);
			if (!effect) {
				return;
			}

			Rolls.toChat(
				actor,
				...Rolls.effectRoll(actor, effect, {scaledAmount: Number(dataset.scaling)}));
		} else if (roll === 'save') {
			if (!dataset.save) {
				return;
			}

			if (dataset.save === 'death') {
				Rolls.toChat(actor, Rolls.death(actor));
			} else {
				Rolls.toChat(actor, Rolls.savingThrow(actor, dataset.save));
			}
		} else if (roll === 'abl') {
			if (!dataset.abl) {
				return;
			}

			if (dataset.abl === 'init') {
				Rolls.toChat(actor, Rolls.initiative(actor));
			} else {
				Rolls.toChat(actor, Rolls.abilityCheck(actor, dataset.abl));
			}
		} else if (roll === 'skl') {
			if (!dataset.skl) {
				return;
			}

			const skill = getProperty(actor.data.flags.obsidian.skills, dataset.skl);
			if (!skill) {
				return;
			}

			Rolls.toChat(actor, Rolls.skillCheck(actor, skill, dataset.skl));
		} else if (roll === 'tool') {
			if (dataset.tool === undefined) {
				return;
			}

			const tool = actor.data.flags.obsidian.skills.tools[Number(dataset.tool)];
			if (!tool) {
				return;
			}

			Rolls.toChat(actor, Rolls.skillCheck(actor, tool));
		} else if (roll === 'dmg') {
			if (dataset.effect === undefined) {
				return;
			}

			const effect = actor.data.obsidian.effects.get(dataset.effect);
			if (!effect) {
				return;
			}

			Rolls.toChat(
				actor,
				...Rolls.damage(
					actor, effect, Number(dataset.count), Number(dataset.scaling)));
		}
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
		const rollMod = Effect.filterRollMods(actor.data.obsidian.toggleable, filter =>
			FILTERS.isCheck(filter)
			&& (FILTERS.isInit(filter)
				|| (FILTERS.isAbility(filter) && FILTERS.inCollection(filter, 'dex'))));

		const mods = [];
		if (OBSIDIAN.notDefinedOrEmpty(flags.attributes.init.overide)) {
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

	itemRoll: function (actor, item, scaling) {
		if (!item.flags.obsidian || !item.flags.obsidian.effects) {
			return [];
		}

		const itemFlags = item.flags.obsidian;
		let scaledAmount = 0;

		if (scaling && item.type === 'spell') {
			scaledAmount = scaling - item.data.level;
		}

		if (scaledAmount < 0) {
			scaledAmount = 0;
		}

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
				scaledAmount: scaledAmount,
				isFirst: i === 0
			}));
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

	rollDamage: function (actor, damage, {crit = false, scaledAmount = 0, scaling = null}) {
		const data = actor.data.data;
		if (scaledAmount > 0 && scaling != null && scaling.scalingComponent.method !== 'cantrip') {
			const damageComponents = scaling.components.filter(c => c.type === 'damage');
			if (damageComponents) {
				damage = damage.concat(duplicate(damageComponents).map(dmg => {
					if (dmg.calc === 'fixed') {
						dmg.bonus = Math.floor(dmg.bonus * scaledAmount);
						dmg.mod = Math.floor(dmg.mod * scaledAmount);
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

		const damageMods =
			actor.data.obsidian.toggleable
				.filter(effect => effect.toggle.active)
				.filter(effect => effect.mods.length)
				.filter(effect =>
					!effect.filters.length
					|| effect.filters.some(filter => FILTERS.isDamage(filter)));

		const rolls = damage.map(dmg => {
			if (dmg.calc === 'fixed' || !dmg.ndice) {
				return null;
			}

			let ndice = dmg.ndice;
			if (crit) {
				ndice += dmg.derived.ncrit || ndice;
			}

			const roll = new Die(dmg.die).roll(ndice);
			const rolls = roll.results.map(r => [r]);
			let condition = filter => filter.multi === 'any';

			if (!OBSIDIAN.notDefinedOrEmpty(dmg.damage)) {
				condition = filter => FILTERS.inCollection(filter, dmg.damage);
			}

			const rollMods =
				damageMods
					.filter(effect => effect.filters.some(condition))
					.flatMap(effect => effect.mods);

			if (dmg.rollMod) {
				rollMods.push(dmg.rollMod);
			}

			const rollMod = Effect.combineRollMods(rollMods);
			Rolls.applyRollModifiers(roll, rolls, rollMod);
			return rolls;
		});

		damage.forEach(dmg => {
			dmg.rollParts = [{mod: dmg.bonus || 0, name: game.i18n.localize('OBSIDIAN.Bonus')}];
			if (!OBSIDIAN.notDefinedOrEmpty(dmg.ability)) {
				if (dmg.ability === 'spell') {
					dmg.rollParts.push({
						mod: dmg.spellMod,
						name: game.i18n.localize('OBSIDIAN.Spell')
					});
				} else {
					dmg.rollParts.push({
						mod: data.abilities[dmg.ability].mod,
						name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${dmg.ability}`)
					});
				}
			}
		});

		return {
			total:
				rolls.reduce((acc, rolls) => {
					if (rolls) {
						return acc + rolls.reduce((acc, r) => acc + r.last(), 0);
					}

					return 0;
				}, 0)
				+ damage.flatMap(dmg => dmg.rollParts).reduce((acc, mod) => acc + mod.mod, 0),

			results: damage.map((dmg, i) => {
				const subRolls = rolls[i];
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
			})
		}
	},

	savingThrow: function (actor, save) {
		const flags = actor.data.flags.obsidian;
		const saveData = flags.saves[save];
		const adv = [flags.saves.roll];

		if (saveData.roll) {
			adv.push(saveData.roll);
		}

		const rollMod = Effect.filterRollMods(actor.data.obsidian.toggleable, filter =>
			FILTERS.isSave(filter) && FILTERS.inCollection(filter, save));

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

		const rollMod = Effect.filterRollMods(actor.data.obsidian.toggleable, filter =>
			FILTERS.isCheck(filter) && (
				(FILTERS.isSkillOrTool(filter, tool) && FILTERS.inCollection(filter, key))
				|| (FILTERS.isAbility(filter) && FILTERS.inCollection(filter, skill.ability))));

		return Rolls.abilityCheck(
			actor, skill.ability, skillName, [flags.skills.roll, skill.roll], skill.rollParts,
			rollMod);
	},

	toChat: async function (actor, ...msgs) {
		const chatData = {
			speaker: ChatMessage.getSpeaker({actor: actor}),
			user: game.user._id,
			rollMode: game.settings.get('core', 'rollMode'),
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

		for (const msg of msgs) {
			await ChatMessage.create(mergeObject(duplicate(chatData), msg));
		}
	},

	toHitRoll: function (actor, hit, extraMods = []) {
		const key = hit.attack[0] + hit.category[0];
		let rollMod = Effect.filterRollMods(actor.data.obsidian.toggleable, filter =>
			FILTERS.isAttack(filter) && FILTERS.inCollection(filter, key));

		if (hit.rollMod) {
			rollMod = Effect.combineRollMods([rollMod, hit.rollMod]);
		}

		return Rolls.d20Roll(actor, [], [...hit.rollParts, ...extraMods], hit.crit, 1, rollMod);
	}
};
