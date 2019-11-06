Obsidian.Rolls = {
	abilityCheck: function (actor, ability, type = 'abl', mods = []) {

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

			Obsidian.Rolls.toChat(actor, Obsidian.Rolls.abilityCheck(actor, dataset.abl));
		} else if (roll === 'skl') {
			if (!dataset.skl) {
				return;
			}

			const skill = getProperty(actor.data.flags.obsidian.skills, dataset.skl);
			if (!skill) {
				return;
			}

			Obsidian.Rolls.toChat(actor, Obsidian.Rolls.skillCheck(actor, skill));
		} else if (roll === 'tool') {
			if (dataset.tool === undefined) {
				return;
			}

			const tool = actor.data.flags.obsidian.skills.tools[Number(dataset.tool)];
			if (!tool) {
				return;
			}

			Obsidian.Rolls.toChat(actor, Obsidian.Rolls.toolCheck(actor, tool));
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
					total: results.reduce((acc, die) => acc + die.total, 0) + conBonus,
					breakdown: `${rolls.map(([n, d]) => `${n}d${d}`).join('+')}+${conBonus} = `
						+ results.map(die => `(${die.results.join('+')})`).join(' + ')
						+ ` + ${conBonus}`
				}
			}
		});

		return results;
	},

	savingThrow: function (actor, save) {

	},

	skillCheck: function (actor, skill) {

	},

	spell: function (actor, spell) {

	},

	toolCheck: function (actor, tool) {

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
	return function () {
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

		return renderTemplate('public/modules/obsidian/html/message.html', messageData);
	};
})();
