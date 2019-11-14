// Is monkey-patching better than extending ChatMessage and changing the
// entityClass? ¯\_(ツ)_/¯
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

		await loadTemplates(['public/modules/obsidian/html/components/damage-format.html']);
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

		html.find('[data-roll]').click(evt => Obsidian.Rolls.fromClick(null, evt));
		return html;
	};
})();

ChatMessage.prototype.export = (function () {
	const cached = ChatMessage.prototype.export;
	return function () {
		if (!this.data.flags || !this.data.flags.obsidian) {
			return cached.apply(this, arguments);
		}

		const flags = this.data.flags.obsidian;
		let content = flags.title.toLocaleUpperCase();

		if (flags.parens) {
			content += ` (${flags.parens})`;
		}

		if (flags.subtitle) {
			content += `\n${flags.subtitle}`;
		}

		content += '\n';

		if (flags.results) {
			content +=
				flags.results
					.map(result => `Roll: ${result.map(roll => `[${roll.total}]`).join(' ')}`)
					.join('\n');
			content += '\n';
		}

		if (flags.damage) {
			content += `Hit: [${flags.damage.total}]\n`;
			content += `Crit: [${flags.crit.total}]\n`;
		}

		const time = new Date(this.data.timestamp).toLocaleDateString('en-GB', {
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric'
		});

		return `[${time}] ${this.alias}\n${content}`;
	};
})();