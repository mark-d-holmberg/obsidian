import {OBSIDIAN} from './rules.js';
import {determineAdvantage} from './prepare.js';

export const Rolls = {
	abilityCheck: function (actor, ability, skill, adv = [], extraMods = []) {
		const mods = [{
			mod: actor.data.data.abilities[ability].mod,
			name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${ability}`)
		}, ...extraMods];

		return Rolls.simpleRoll(actor, {
			type: 'abl',
			title: game.i18n.localize(`OBSIDIAN.Ability-${ability}`),
			parens: skill,
			subtitle: game.i18n.localize('OBSIDIAN.AbilityCheck'),
			adv: adv,
			mods: mods
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

	compileBreakdown: mods =>
		mods.filter(mod => mod.mod).map(mod => `${mod.mod.sgnex()} [${mod.name}]`).join(''),

	compileSave: function (actor, save) {
		const data = actor.data.data;
		const result = {
			effect: save.effect,
			target: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${save.target}`)
		};

		if (save.calc === 'formula') {
			let bonus = 8;
			if (!OBSIDIAN.notDefinedOrEmpty(save.bonus)) {
				bonus = Number(save.bonus);
			}

			const mods = [{
				mod: save.prof * data.attributes.prof,
				name: game.i18n.localize('OBSIDIAN.ProfAbbr')
			}];

			if (!OBSIDIAN.notDefinedOrEmpty(save.ability)) {
				if (save.ability === 'spell') {
					mods.push({
						mod: save.spellMod,
						name: game.i18n.localize('OBSIDIAN.Spell')
					});
				} else {
					mods.push({
						mod: data.abilities[save.ability].mod,
						name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${save.ability}`)
					});
				}
			}

			result.dc = bonus + mods.reduce((acc, mod) => acc + mod.mod, 0);
			result.breakdown = bonus + Rolls.compileBreakdown(mods);
		} else {
			result.dc = save.fixed;
			result.breakdown = `${result.dc} [${game.i18n.localize('OBSIDIAN.Fixed')}]`;
		}

		return result;
	},

	d20Roll: function (actor, adv = [], mods = [], crit = 20, fail = 1) {
		const roll = new Die(20).roll(2);
		const total = mods.reduce((acc, mod) => acc + mod.mod, 0);
		const results = roll.results.map(r => {
			return {
				roll: r,
				total: r + total,
				breakdown: r + Rolls.compileBreakdown(mods)
			}
		});

		Rolls.annotateCrits(crit, fail, results);
		Rolls.annotateAdvantage(
			determineAdvantage(actor.data.flags.obsidian.sheet.roll, ...adv),
			results);

		return results;
	},

	damage: function (actor, effect, count, upcast) {
		if (isNaN(upcast)) {
			upcast = undefined;
		}

		if (count === undefined || isNaN(count)) {
			count = 1;
		}

		const item = actor.data.obsidian.itemsByID.get(effect.parentItem);
		const damage = effect.components.filter(c => c.type === 'damage');

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
						damage:
							Rolls.rollDamage(actor, damage,
								{crit: false, upcast: upcast, scaling: item.obsidian.scaling}),
						crit:
							Rolls.rollDamage(actor, damage,
								{crit: true, upcast: upcast, scaling: item.obsidian.scaling})
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

		const roll = Rolls.simpleRoll(actor, {
			type: 'save',
			title: game.i18n.localize('OBSIDIAN.DeathSave'),
			subtitle: game.i18n.localize('OBSIDIAN.SavingThrow'),
			adv: advantageComponents,
			mods: mods
		});

		const adv =
			determineAdvantage(flags.sheet.roll, flags.saves.roll, flags.attributes.death.roll);

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

	feature: function (actor, feat) {
		const itemFlags = feat.flags.obsidian;
		const results = {
			type: 'feat',
			title: feat.name,
			details: itemFlags.display || feat.data.description.value,
			open: (!itemFlags.hit || !itemFlags.hit.enabled) && itemFlags.damage.length < 1
		};

		if (itemFlags.hit && itemFlags.hit.enabled) {
			results.results = [Rolls.toHitRoll(actor, itemFlags.hit)];
			results.dmgBtn = feat.id;
			results.dmgCount = 1;
		} else if (itemFlags.damage.length > 0) {
			results.damage = Rolls.rollDamage(actor, feat, {crit: false});
			results.crit = Rolls.rollDamage(actor, feat, {crit: true});
		}

		if (itemFlags.dc && itemFlags.dc.enabled) {
			results.save = Rolls.compileSave(actor, itemFlags.dc);
		}

		return {flags: {obsidian: results}};
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
		if (roll === 'fx') {
			if (dataset.id === undefined) {
				return;
			}

			const id = Number(dataset.id);
			const item = actor.data.obsidian.itemsByID.get(id);

			if (!item) {
				return;
			}

			Rolls.toChat(actor, ...Rolls.itemRoll(actor, item));
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
		} else if (roll === 'feat') {
			if (dataset.feat === undefined) {
				return;
			}

			const id = Number(dataset.feat);
			const feat = actor.data.items.find(item => item.id === id);

			if (!feat) {
				return;
			}

			Rolls.toChat(actor, Rolls.feature(actor, feat));
		} else if (roll === 'spl') {
			if (dataset.spl === undefined || dataset.level === undefined) {
				return;
			}

			const id = Number(dataset.spl);
			const spell = actor.data.items.find(item => item.id === id);

			if (!spell) {
				return;
			}

			Rolls.toChat(
				actor, ...Rolls.spell(actor, spell, Number(dataset.level)));
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
					actor, effect, Number(dataset.count), Number(dataset.upcast)));
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

		if (OBSIDIAN.notDefinedOrEmpty(flags.attributes.init.override)) {
			return Rolls.abilityCheck(
				actor,
				flags.attributes.init.ability,
				game.i18n.localize('OBSIDIAN.Initiative'),
				[flags.attributes.init.roll],
				[{mod: data.attributes.init.value, name: game.i18n.localize('OBSIDIAN.Bonus')}]);
		} else {
			return Rolls.overriddenRoll(
				actor,
				'abl',
				game.i18n.localize('OBSIDIAN.Initiative'),
				game.i18n.localize('OBSIDIAN.AbilityCheck'),
				[flags.attributes.init.roll],
				data.attributes.init.mod);
		}
	},

	itemRoll: function (actor, item) {
		if (!item.flags.obsidian || !item.flags.obsidian.effects) {
			return [];
		}

		const itemFlags = item.flags.obsidian;
		return itemFlags.effects.map(effect => {
			if (effect === item.obsidian.scaling) {
				return null;
			}

			const results = {type: 'fx', title: item.name};
			const attacks = effect.components.filter(c => c.type === 'attack');
			const damage = effect.components.filter(c => c.type === 'damage');
			const saves = effect.components.filter(c => c.type === 'save');

			if (attacks.length) {
				const mods = [];
				results.results = [Rolls.toHitRoll(actor, attacks[0], mods)];
				results.dmgBtn = effect.uuid;
				results.dmgCount = 1;
				results.subtitle = attacks[0].attackType;
			} else if (damage.length) {
				results.damage = Rolls.rollDamage(actor, damage, {crit: false});
				results.crit = Rolls.rollDamage(actor, damage, {crit: true});
			}

			if (saves.length) {
				results.saves = saves.map(save => Rolls.compileSave(actor, save));
			}

			return {flags: {obsidian: results}};
		}).filter(result => result != null);
	},

	overriddenRoll: function (actor, type, title, subtitle, adv = [], override) {
		return Rolls.simpleRoll(actor, {
			type: type,
			title: title,
			subtitle: subtitle,
			adv: adv,
			mods: [{mod: Number(override), name: game.i18n.localize('OBSIDIAN.Override')}]
		});
	},

	recharge: function (item) {
		const charges = item.flags.obsidian.charges;
		const roll = new Die(charges.die).roll(charges.ndice);

		return {
			flags: {
				obsidian: {
					type: 'item',
					title: item.name,
					subtitle: game.i18n.localize('OBSIDIAN.Recharge'),
					results: [[{
						total: roll.results.reduce((acc, val) => acc + val, 0) + charges.bonus,
						breakdown:
							`${charges.ndice}d${charges.die}${charges.bonus.sgnex()} = `
							+ `(${roll.results.join('+')})${charges.bonus.sgnex()}`
					}]]
				}
			}
		};
	},

	rollDamage: function (actor, damage, {crit = false, upcast = 0, scaling = null}) {
		const data = actor.data.data;
		let mods = [];

		if (upcast > 0 && scaling != null && scaling.scalingComponent.method === 'spell') {
			const damageComponents = scaling.components.filter(c => c.type === 'damage');
			if (damageComponents) {
				damage = damage.concat(duplicate(damageComponents).map(dmg => {
					dmg.ndice = Math.floor(dmg.ndice * upcast);
					return dmg;
				}));
			}
		}

		const rolls = damage.map(dmg => {
			if (!dmg.ndice) {
				return null;
			}

			let ndice = dmg.ndice;
			if (crit) {
				ndice *= 2;
			}

			return new Die(dmg.die).roll(ndice);
		});

		mods = damage.map(dmg => {
			const subMods = [{mod: dmg.bonus, name: game.i18n.localize('OBSIDIAN.Bonus')}];
			if (!OBSIDIAN.notDefinedOrEmpty(dmg.ability)) {
				if (dmg.ability === 'spell') {
					subMods.push({
						mod: dmg.spellMod,
						name: game.i18n.localize('OBSIDIAN.Spell')
					});
				} else {
					subMods.push({
						mod: data.abilities[dmg.ability].mod,
						name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${dmg.ability}`)
					});
				}
			}

			if (!OBSIDIAN.notDefinedOrEmpty(dmg.magic)) {
				subMods.push({
					mod: dmg.magic,
					name: game.i18n.localize('OBSIDIAN.Magic')
				});
			}

			return subMods;
		});

		return {
			total:
				rolls.reduce((acc, r) => {
					if (r) {
						return acc + r.total;
					}

					return 0;
				}, 0)
				+ mods.flat().reduce((acc, mod) => acc + mod.mod, 0),

			results: damage.map((dmg, i) => {
				const r = rolls[i];
				const subMods = mods[i];
				const subTotal = subMods.reduce((acc, mod) => acc + mod.mod, 0);
				let total = subTotal;
				let breakdown;

				if (r) {
					total += r.total;
					breakdown =
						`${r.rolls.length}d${dmg.die}${Rolls.compileBreakdown(subMods)} = `
						+ `(${r.results.join('+')})${subTotal.sgnex()}`;
				} else {
					breakdown =
						`${Rolls.compileBreakdown(subMods)} = ${total}`.substring(3);
				}

				return {
					type: dmg.type === 'damage' ? dmg.damage : dmg.type,
					total: total,
					breakdown: breakdown
				};
			})
		}
	},

	savingThrow: function (actor, save) {
		const data = actor.data.data;
		const flags = actor.data.flags.obsidian;
		const saveData = flags.saves[save];
		const adv = [flags.saves.roll];

		if (saveData) {
			adv.push(saveData.roll);
		}

		if (!saveData || OBSIDIAN.notDefinedOrEmpty(saveData.override)) {
			const saveBonus = saveData ? (saveData.bonus || 0) : 0;
			const mods = [
				{
					mod: data.abilities[save].mod,
					name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${save}`)
				}, {
					mod: (flags.saves.bonus || 0) + saveBonus,
					name: game.i18n.localize('OBSIDIAN.Bonus')
				}, {
					mod: data.attributes.prof * data.abilities[save].proficient,
					name: game.i18n.localize('OBSIDIAN.ProfAbbr')
				}
			];

			return Rolls.simpleRoll(actor, {
				type: 'save',
				title: game.i18n.localize(`OBSIDIAN.Ability-${save}`),
				subtitle: game.i18n.localize('OBSIDIAN.SavingThrow'),
				adv: adv,
				mods: mods
			});
		} else {
			return Rolls.overriddenRoll(
				actor,
				'save',
				game.i18n.localize(`OBSIDIAN.Ability-${save}`),
				game.i18n.localize('OBSIDIAN.SavingThrow'),
				adv,
				saveData.override);
		}
	},

	simpleRoll: function (actor, {type, title, parens, subtitle, adv = [], mods = []}) {
		return {
			flags: {
				obsidian: {
					type: type,
					title: title,
					parens: parens,
					subtitle: subtitle,
					results: [Rolls.d20Roll(actor, adv, mods)]
				}
			}
		}
	},

	skillCheck: function (actor, skill, id) {
		const data = actor.data.data;
		const flags = actor.data.flags.obsidian;
		const skillName = skill.custom ? skill.label : game.i18n.localize(`OBSIDIAN.Skill-${id}`);

		if (OBSIDIAN.notDefinedOrEmpty(skill.override)) {
			let prof = skill.custom ? skill.value : data.skills[id].value;
			const mods = [{
				mod: (flags.skills.bonus || 0) + (skill.bonus || 0),
				name: game.i18n.localize('OBSIDIAN.Bonus')
			}];

			if (prof === 0 && flags.skills.joat) {
				prof = .5;
			}

			if (prof > 0) {
				mods.push({
					mod: data.attributes.prof * prof,
					name: game.i18n.localize('OBSIDIAN.ProfAbbr')
				});
			}

			return Rolls.abilityCheck(
				actor,
				skill.ability,
				skillName,
				[flags.skills.roll, skill.roll],
				mods);
		} else {
			return Rolls.overriddenRoll(
				actor,
				'abl',
				skillName,
				game.i18n.localize('OBSIDIAN.AbilityCheck'),
				[flags.skills.roll, skill.roll],
				skill.override);
		}
	},

	spell: function (actor, spell, level) {
		const itemFlags = spell.flags.obsidian;
		let upcastAmount = 0;

		if (level > 0
			&& level > spell.data.level
			&& spell.obsidian.scaling
			&& spell.obsidian.scaling.scalingComponent.method === 'spell')
		{
			upcastAmount = level - spell.data.level;
		}

		let isFirst = true;
		return itemFlags.effects.flatMap(effect => {
			if (effect === spell.obsidian.scaling) {
				return null;
			}

			const attacks = effect.components.filter(c => c.type === 'attack');
			const damage = effect.components.filter(c => c.type === 'damage');
			const saves = effect.components.filter(c => c.type === 'save');
			const targets = effect.components.filter(c => c.type === 'target');
			const results = [];

			if (attacks.length || saves.length) {
				results.push({type: 'spl', title: spell.name});
			}

			if (attacks.length) {
				let count = attacks[0].targets;
				if (upcastAmount > 0 && spell.obsidian.scaling) {
					const targetScaling =
						spell.obsidian.scaling.components.find(c => c.type === 'target');

					if (targetScaling) {
						count += Math.floor(targetScaling.count * upcastAmount);
					}
				}

				results[0].results = [];
				for (let i = 0; i < count; i++) {
					results[0].results.push(Rolls.toHitRoll(actor, attacks[0]));
				}

				results[0].dmgBtn = effect.uuid;
				results[0].dmgCount = count;
				results[0].dmgUpcast = upcastAmount;
				results[0].subtitle = attacks[0].attackType;
			}

			if (saves.length) {
				results[0].saves = saves.map(save => Rolls.compileSave(actor, save));
			}

			if (damage.length && !attacks.length) {
				let count = 1;
				if (targets.length) {
					count = targets[0].count;
				}

				if (upcastAmount > 0 && spell.obsidian.scaling) {
					const targetScaling =
						spell.obsidian.scaling.components.find(c => c.type === 'target');

					if (targetScaling) {
						count += Math.floor(targetScaling.count * upcastAmount);
					}
				}

				for (let i = 0; i < count; i++) {
					results.push({
						type: 'spl',
						title: spell.name,
						damage:
							Rolls.rollDamage(actor, damage, {
								crit: false,
								upcast: upcastAmount,
								scaling: spell.obsidian.scaling
							}),
						crit:
							Rolls.rollDamage(actor, damage,
								{crit: true, upcast: upcastAmount, scaling: spell.obsidian.scaling})
					});
				}
			}

			if (isFirst) {
				isFirst = false;
				results[0].details = spell;
				results[0].open = !attacks.length && !damage.length;
			}

			return results.map(result => {
				return {flags: {obsidian: result}};
			});
		}).filter(result => result != null);
	},

	toChat: async function (actor, ...msgs) {
		const chatData = {
			speaker: ChatMessage.getSpeaker({actor: actor}),
			user: game.user._id,
			rollMode: game.settings.get('core', 'rollMode'),
			sound: CONFIG.sounds.dice
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
		const data = actor.data.data;
		const mods = [
			{mod: hit.bonus || 0, name: game.i18n.localize('OBSIDIAN.Bonus')},
			...extraMods
		];

		if (hit.ability === 'spell') {
			mods.push({mod: hit.spellMod, name: game.i18n.localize('OBSIDIAN.Spell')});
		} else {
			mods.push({
				mod: data.abilities[hit.ability].mod,
				name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${hit.ability}`)
			});
		}

		if (hit.proficient) {
			mods.push({
				mod: data.attributes.prof,
				name: game.i18n.localize('OBSIDIAN.ProfAbbr')
			});
		}

		return Rolls.d20Roll(actor, [], mods, hit.crit);
	}
};
