Obsidian.Rolls = {
	abilityCheck: function (actor, ability, skill, extraAdv = [], extraMods = []) {
		const data = actor.data.data;
		const flags = actor.data.flags.obsidian;
		const roll = new Die(20).roll(2);
		const adv = Obsidian.Rules.determineAdvantage(flags.sheet.roll, ...extraAdv);
		const mods = [
			{mod: data.abilities[ability].mod, name: game.i18n.localize('OBSIDIAN.Mod')},
			...extraMods
		];

		const total = mods.reduce((acc, mod) => acc + mod.mod, 0);
		const results = roll.results.map(r => {
			return {
				total: r + total,
				breakdown:
					r + mods.filter(mod => mod.mod)
						.map(mod => `${mod.mod.sgnex()} [${mod.name}]`)
						.join('')
			};
		});

		Obsidian.Rolls.annotateAdvantage(adv, results);

		return {
			flags: {
				obsidian: {
					type: 'abl',
					title: game.i18n.localize(`OBSIDIAN.Ability-${ability}`),
					parens: skill,
					subtitle: game.i18n.localize('OBSIDIAN.AbilityCheck'),
					results: results
				}
			}
		}
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

	attackRoll: function (actor, item) {

	},

	feature: function (actor, feat) {

	},

	fromClick: function (actor, evt) {
		if (!evt.currentTarget.dataset) {
			return;
		}

		const dataset = evt.currentTarget.dataset;
		if (!dataset.roll) {
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

			Obsidian.Rolls.toChat(actor, Obsidian.Rolls.attackRoll(actor, atk));
		} else if (roll === 'save') {
			if (!dataset.save) {
				return;
			}

			Obsidian.Rolls.toChat(actor, Obsidian.Rolls.savingThrow(actor, dataset.save));
		} else if (roll === 'abl') {
			if (!dataset.abl) {
				return;
			}

			if (dataset.abl === 'init') {
				Obsidian.Rolls.toChat(actor, Obsidian.Rolls.initiative(actor));
			} else {
				Obsidian.Rolls.toChat(actor, Obsidian.Rolls.abilityCheck(actor, dataset.abl));
			}
		} else if (roll === 'skl') {
			if (!dataset.skl) {
				return;
			}

			const skill = getProperty(actor.data.flags.obsidian.skills, dataset.skl);
			if (!skill) {
				return;
			}

			Obsidian.Rolls.toChat(actor, Obsidian.Rolls.skillCheck(actor, skill, dataset.skl));
		} else if (roll === 'tool') {
			if (dataset.tool === undefined) {
				return;
			}

			const tool = actor.data.flags.obsidian.skills.tools[Number(dataset.tool)];
			if (!tool) {
				return;
			}

			Obsidian.Rolls.toChat(actor, Obsidian.Rolls.skillCheck(actor, tool));
		} else if (roll === 'feat') {
			if (dataset.feat === undefined) {
				return;
			}

			const id = Number(dataset.feat);
			const feat = actor.data.items.find(item => item.id === id);

			if (!feat) {
				return;
			}

			Obsidian.Rolls.toChat(actor, Obsidian.Rolls.feature(actor, feat));
		} else if (roll === 'spl') {
			if (dataset.spl === undefined) {
				return;
			}

			const id = Number(dataset.spl);
			const spell = actor.data.items.find(item => item.id === id);

			if (!spell) {
				return;
			}

			Obsidian.Rolls.toChat(actor, Obsidian.Rolls.spell(actor, spell));
		}
	},

	hd: function (actor, rolls, conBonus) {
		const results = rolls.map(([n, d]) => new Die(d).roll(n));
		Obsidian.Rolls.toChat(actor, {
			flags: {
				obsidian: {
					type: 'hd',
					title: game.i18n.localize('OBSIDIAN.HD'),
					results: [{
						total: results.reduce((acc, die) => acc + die.total, 0) + conBonus,
						breakdown:
							`${rolls.map(([n, d]) => `${n}d${d}`).join('+')}${conBonus.sgn()} = `
							+ results.map(die => `(${die.results.join('+')})`).join(' + ')
							+ conBonus.sgnex()
					}]
				}
			}
		});

		return results;
	},

	initiative: function (actor) {
		const data = actor.data.data;
		const flags = actor.data.flags.obsidian;

		if (Obsidian.notDefinedOrEmpty(flags.attributes.init.override)) {
			return Obsidian.Rolls.abilityCheck(
				actor,
				flags.attributes.init.ability,
				game.i18n.localize('OBSIDIAN.Initiative'),
				[flags.attributes.init.roll],
				[{mod: data.attributes.init.value, name: game.i18n.localize('OBSIDIAN.Bonus')}]);
		} else {
			return Obsidian.Rolls.overriddenRoll(
				actor,
				'abl',
				game.i18n.localize('OBSIDIAN.Initiative'),
				game.i18n.localize('OBSIDIAN.AbilityCheck'),
				[flags.attributes.init.roll],
				data.attributes.init.mod);
		}
	},

	overriddenRoll: function (actor, type, title, subtitle, extraAdv = [], override) {
		override = Number(override);
		const flags = actor.data.flags.obsidian;
		const roll = new Die(20).roll(2);
		const adv =
			Obsidian.Rules.determineAdvantage(flags.sheet.roll, ...extraAdv);
		const mods = [{mod: override, name: game.i18n.localize('OBSIDIAN.Override')}];

		const results = roll.results.map(r => {
			return {
				total: r + override,
				breakdown: `${r}${mods.map(mod => `${mod.mod.sgnex()} [${mod.name}]`).join('')}`
			};
		});

		Obsidian.Rolls.annotateAdvantage(adv, results);

		return {
			flags: {
				obsidian: {
					type: type,
					title: title,
					subtitle: subtitle,
					results: results
				}
			}
		}
	},

	savingThrow: function (actor, save) {

	},

	skillCheck: function (actor, skill, id) {
		const data = actor.data.data;
		const flags = actor.data.flags.obsidian;
		const skillName = skill.custom ? skill.label : game.i18n.localize(`OBSIDIAN.Skill-${id}`);

		if (Obsidian.notDefinedOrEmpty(skill.override)) {
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
					mod: data.attributes.prof.value * prof,
					name: game.i18n.localize('OBSIDIAN.ProfAbbr')
				});
			}

			return Obsidian.Rolls.abilityCheck(
				actor,
				skill.ability,
				skillName,
				[flags.skills.roll, skill.roll],
				mods);
		} else {
			return Obsidian.Rolls.overriddenRoll(
				actor,
				'abl',
				skillName,
				game.i18n.localize('OBSIDIAN.AbilityCheck'),
				[flags.skills.roll, skill.roll],
				skill.override);
		}
	},

	spell: function (actor, spell) {

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
			await ChatMessage.create(mergeObject(chatData, msg));
		}
	}
};

ChatMessage.prototype.render = (function () {
	const cached = ChatMessage.prototype.render;
	return async function () {
		if (!this.data.flags || !this.data.flags.obsidian) {
			return cached.apply(this, arguments);
		}

		const messageData = {
			user: game.user,
			author: this.user,
			alias: this.alias,
			message: duplicate(this.data),
			isWhisper: this.data.whisper.length,
			whisperTo:
				this.data.whisper
					.map(user => game.users.get(user))
					.filter(_ => _)
					.map(user => user.name).join(', '),
			visible:
				!this.data.whisper.length
				|| game.user.isGM
				|| (this.data.rollMode !== 'blindroll'
					&& this.data.whisper.contains(game.user.data._id))
		};

		let html = await renderTemplate('public/modules/obsidian/html/message.html', messageData);
		html = $(html);

		html.find('.obsidian-msg-roll-box').hover(evt => {
			const rect = evt.currentTarget.getBoundingClientRect();
			let topLevel = evt.currentTarget._tt;

			if (!topLevel) {
				topLevel = $(evt.currentTarget).next().clone().appendTo($('body'));
				evt.currentTarget._tt = topLevel;
			}

			topLevel.css({
				display: 'block',
				left: `${rect.left}px`,
				top: `${rect.top - topLevel.height() - 12}px`
			});
		}, evt => {
			if (evt.currentTarget._tt) {
				evt.currentTarget._tt.css('display', 'none');
			}
		});

		return html;
	};
})();
