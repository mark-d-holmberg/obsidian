// Is monkey-patching better than extending ChatMessage and changing the
// entityClass? ¯\_(ツ)_/¯
import {Rolls} from '../rules/rolls.js';
import {ObsidianActor} from './actor.js';

export function patchChatMessage () {
	ChatMessage.prototype.render = (function () {
		const cached = ChatMessage.prototype.render;
		return async function () {
			if (!this.data.flags || !this.data.flags.obsidian) {
				return cached.apply(this, arguments);
			}

			let actor;
			let triggers;

			if (this.data.flags?.obsidian?.realToken) {
				actor =
					ObsidianActor.fromSceneTokenPair(
						this.data.flags.obsidian.realScene,
						this.data.flags.obsidian.realToken);
			} else {
				actor = game.actors.get(this.data.speaker.actor);
			}

			if (actor && actor.data.obsidian?.triggers) {
				triggers = duplicate(actor.data.obsidian.triggers);
			}

			const messageData = {
				user: game.user,
				author: this.user,
				alias: this.alias,
				message: duplicate(this.data),
				isWhisper: this.data.whisper.length,
				triggers: triggers,
				whisperTo:
					this.data.whisper
						.map(user => game.users.get(user))
						.filter(_ => _)
						.map(user => user.name).join(', '),
				visible:
					!this.data.whisper.length
					|| game.user.isGM
					|| (!this.data.blind
						&& (this.data.whisper.includes(game.user.data._id)
							|| this.data.user === game.user.data._id))
			};

			await loadTemplates(['modules/obsidian/html/components/damage-format.html']);
			let html = await renderTemplate('modules/obsidian/html/message.html', messageData);
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

			html.hover(() => {
				if (canvas.scene.id !== this.data.speaker.scene) {
					return;
				}

				canvas.tokens.get(this.data.speaker.token)?._onHoverIn(null, true);
			}, () => {
				if (canvas.scene.id !== this.data.speaker.scene) {
					return;
				}

				canvas.tokens.get(this.data.speaker.token)?._onHoverOut();
			});

			html.find('[data-roll]').click(evt => Rolls.fromClick(null, evt));
			html.find('.obsidian-place-template').click(Rolls.placeTemplate);
			html.find('[data-dmg], [data-apply-all]').click(Rolls.applyDamage);
			html.find('.obsidian-apply-save').click(Rolls.applySave);
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
}

export function updateApplyIcons (evt) {
	if (evt.key !== 'Control' && evt.key !== 'Shift') {
		return;
	}

	let dmg = '<i class="fas fa-check"></i>';
	let save = dmg;

	if (evt.type === 'keydown') {
		if (evt.key === 'Control') {
			dmg = '&frac12;';
			save = '<i class="fas fa-times"></i>'
		} else if (evt.key === 'Shift') {
			dmg = '&times;2';
		}
	}

	const chat = document.getElementById('chat-log');
	chat.querySelectorAll('[data-dmg], [data-apply-all]').forEach(el => el.innerHTML = dmg);
	chat.querySelectorAll('.obsidian-apply-save').forEach(el => el.innerHTML = save);
}
