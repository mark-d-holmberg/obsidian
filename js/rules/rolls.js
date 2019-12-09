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

	attackRoll: function (actor, item) {
		const itemFlags = item.flags.obsidian;
		const results = {type: 'atk', title: item.name};

		if (itemFlags.hit && itemFlags.hit.enabled) {
			const mods = [];
			if (itemFlags.magic) {
				mods.push({mod: itemFlags.magic, name: game.i18n.localize('OBSIDIAN.Magic')});
			}

			results.results = [Rolls.toHitRoll(actor, itemFlags.hit, mods)];
			results.dmgBtn = item.id;
			results.dmgCount = 1;
			results.subtitle =
				game.i18n.localize(
					itemFlags.type === 'ranged' || itemFlags.mode === 'ranged'
						? 'OBSIDIAN.RangedWeaponAttack'
						: 'OBSIDIAN.MeleeWeaponAttack');
		} else {
			results.damage = Rolls.rollDamage(actor, item, {crit: false});
			results.crit = Rolls.rollDamage(actor, item, {crit: true});
		}

		if (itemFlags.dc && itemFlags.dc.enabled) {
			results.save = Rolls.compileSave(actor, itemFlags);
		}

		if (itemFlags.tags.ammunition
			&& itemFlags.ammo
			&& !OBSIDIAN.notDefinedOrEmpty(itemFlags.ammo.id))
		{
			const ammoID = Number(itemFlags.ammo.id);
			const ammo = actor.items.find(item => item.data.id === ammoID);

			if (ammo && ammo.data.data.quantity > 0) {
				ammo.update({'data.quantity': ammo.data.data.quantity - 1});
			}
		}

		return {flags: {obsidian: results}};
	},

	compileBreakdown: mods =>
		mods.filter(mod => mod.mod).map(mod => `${mod.mod.sgnex()} [${mod.name}]`).join(''),

	compileSave: function (actor, flags) {
		const data = actor.data.data;
		const save = {
			effect: flags.dc.effect,
			target: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${flags.dc.target}`)
		};

		if (OBSIDIAN.notDefinedOrEmpty(flags.dc.fixed)) {
			let bonus = 8;
			if (!OBSIDIAN.notDefinedOrEmpty(flags.dc.bonus)) {
				bonus = Number(flags.dc.bonus);
			}

			const mods = [{
				mod: flags.dc.prof * data.attributes.prof,
				name: game.i18n.localize('OBSIDIAN.ProfAbbr')
			}];

			if (!OBSIDIAN.notDefinedOrEmpty(flags.dc.ability)) {
				if (flags.dc.ability === 'spell') {
					mods.push({
						mod: flags.dc.spellMod,
						name: game.i18n.localize('OBSIDIAN.Spell')
					});
				} else {
					mods.push({
						mod: data.abilities[flags.dc.ability].mod,
						name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${flags.dc.ability}`)
					});
				}
			}

			save.dc = bonus + mods.reduce((acc, mod) => acc + mod.mod, 0);
			save.breakdown = bonus + Rolls.compileBreakdown(mods);
		} else {
			save.dc = Number(flags.dc.fixed);
			save.breakdown = `${save.dc} [${game.i18n.localize('OBSIDIAN.Fixed')}]`;
		}

		return save;
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

	damage: function (actor, item, count, upcast) {
		if (isNaN(upcast)) {
			upcast = undefined;
		}

		if (count === undefined || isNaN(count)) {
			count = 1;
		}

		const msgs = [];
		for (let i = 0; i < count; i++) {
			msgs.push({
				flags: {
					obsidian: {
						type: 'dmg',
						title: item.name,
						damage:
							Rolls.rollDamage(actor, item, {crit: false, upcast: upcast}),
						crit:
							Rolls.rollDamage(actor, item, {crit: true, upcast: upcast})
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
			results.save = Rolls.compileSave(actor, itemFlags);
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
		if (roll === 'atk') {
			if (dataset.atk === undefined) {
				return;
			}

			const id = Number(dataset.atk);
			const atk = actor.data.items.find(item => item.id === id);

			if (!atk) {
				return;
			}

			Rolls.toChat(actor, Rolls.attackRoll(actor, atk));
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
			if (dataset.item === undefined) {
				return;
			}

			const id = Number(dataset.item);
			const item = actor.data.items.find(item => item.id === id);

			if (!item) {
				return;
			}

			Rolls.toChat(
				actor,
				...Rolls.damage(
					actor, item, Number(dataset.count), Number(dataset.upcast)));
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

	rollDamage: function (actor, item, {crit = false, upcast = 0}) {
		const data = actor.data.data;
		const itemFlags = item.flags.obsidian;
		let damage =
			item.type === 'weapon' && itemFlags.mode === 'versatile'
				? itemFlags.versatile
				: itemFlags.damage;

		if (upcast > 0
			&& itemFlags.upcast
			&& itemFlags.upcast.enabled
			&& itemFlags.upcast.damage.length > 0)
		{
			damage = damage.concat(itemFlags.upcast.damage.map(dmg => {
				dmg.ndice = Math.floor(dmg.ndice * upcast);
				return dmg;
			}));
		}

		if (itemFlags.cantrip) {
			damage = damage.concat(itemFlags.cantrip.damage);
		}

		let mods = [];
		const rolls = damage.map(dmg => {
			if (!dmg.ndice) {
				return null;
			}

			let ndice = dmg.ndice;
			if (crit && dmg.ncrit) {
				// We hard-code bonus crit dice rules here. It seems any
				// feature that allows for extra dice on a crit specifies one
				// damage die only so, if a user specified more than one crit
				// die, we double the dice once, then add only one additional
				// die for each crit dice value above 1.
				ndice += ndice + dmg.ncrit - 1;
			}

			return new Die(dmg.die).roll(ndice);
		});

		mods = damage.map(dmg => {
			const subMods = [{mod: dmg.bonus, name: game.i18n.localize('OBSIDIAN.Bonus')}];
			if (!OBSIDIAN.notDefinedOrEmpty(dmg.stat)) {
				if (dmg.stat === 'spell') {
					subMods.push({
						mod: dmg.spellMod,
						name: game.i18n.localize('OBSIDIAN.Spell')
					});
				} else {
					subMods.push({
						mod: data.abilities[dmg.stat].mod,
						name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${dmg.stat}`)
					});
				}
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
					type: dmg.type,
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
		const results = {
			type: 'spl',
			title: spell.name,
			details: spell,
			open: (!itemFlags.hit || !itemFlags.hit.enabled) && itemFlags.damage.length < 1
		};

		let upcastAmount = 0;
		if (level > 0
			&& level > spell.data.level
			&& itemFlags.upcast
			&& itemFlags.upcast.enabled)
		{
			upcastAmount = level - spell.data.level;
		}

		if (itemFlags.hit && itemFlags.hit.enabled && itemFlags.hit.attack !== 'unerring') {
			let count = itemFlags.hit.count || 1;
			if (upcastAmount > 0) {
				count += Math.floor(itemFlags.upcast.natk * (upcastAmount / itemFlags.upcast.nlvl));
			}

			results.results = [];
			for (let i = 0; i < count; i++) {
				results.results.push(Rolls.toHitRoll(actor, itemFlags.hit));
			}

			results.dmgBtn = spell.id;
			results.dmgCount = count;
			results.dmgUpcast = upcastAmount;
			results.subtitle =
				game.i18n.localize(
					itemFlags.hit.attack === 'melee'
						? 'OBSIDIAN.MeleeSpellAttack'
						: 'OBSIDIAN.RangedSpellAttack');
		}

		if (itemFlags.dc && itemFlags.dc.enabled) {
			results.save = Rolls.compileSave(actor, itemFlags);
		}

		const msgs = [{flags: {obsidian: results}}];
		const hasDamage = itemFlags.damage.length > 0;
		const noAttackRoll = !itemFlags.hit || !itemFlags.hit.enabled;
		const unerringAttack =
			itemFlags.hit && itemFlags.hit.enabled && itemFlags.hit.attack === 'unerring';

		if (hasDamage && (noAttackRoll || unerringAttack)) {
			let count = 1;
			if (unerringAttack) {
				count = itemFlags.hit.count || 1;
				if (upcastAmount > 0) {
					count +=
						Math.floor(itemFlags.upcast.natk * (upcastAmount / itemFlags.upcast.nlvl));
				}
			}

			for (let i = 0; i < count; i++) {
				msgs.push({
					flags: {
						obsidian: {
							type: 'dmg',
							title: spell.name,
							damage:
								Rolls.rollDamage(
									actor, spell, {crit: false, upcast: upcastAmount}),
							crit:
								Rolls.rollDamage(
									actor, spell, {crit: true, upcast: upcastAmount})
						}
					}
				});
			}
		}

		return msgs;
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

		if (hit.stat === 'spell') {
			mods.push({mod: hit.spellMod, name: game.i18n.localize('OBSIDIAN.Spell')});
		} else {
			mods.push({
				mod: data.abilities[hit.stat].mod,
				name: game.i18n.localize(`OBSIDIAN.AbilityAbbr-${hit.stat}`)
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
