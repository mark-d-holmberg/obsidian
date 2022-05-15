// Is monkey-patching better than extending ChatMessage and changing the
// entityClass? ¯\_(ツ)_/¯
import {Rolls} from './rolls.js';
import {ObsidianActor} from './actor.js';
import {ObsidianItems} from './items.js';

export function patchChatMessage () {
	ChatMessage.prototype.getHTML = (function () {
		const cached = ChatMessage.prototype.getHTML;
		return async function (force, options) {
			if (!this.data.flags || !this.data.flags.obsidian) {
				return cached.apply(this, arguments);
			}

			let triggers;
			const actor = ChatMessage.getSpeakerActor(this.data.speaker);
			const message = this.toObject(false);
			let details = message.flags.obsidian.details;

			if (actor) {
				details =
					TextEditor.enrichHTML(details, {
						secrets: this.user === game.userId,
						rollData: actor.getRollData()
					});
			}

			if (actor?.data.obsidian?.triggers) {
				triggers = duplicate(actor.data.obsidian.triggers);
			}

			const messageData = {
				triggers, message, details,
				user: game.user,
				author: this.user,
				alias: this.alias,
				isWhisper: this.data.whisper.some(id => id !== game.user.id),
				popout: options?.popout,
				whisperTo:
					this.data.whisper
						.map(user => game.users.get(user))
						.filter(_ => _)
						.map(user => user.name).join(', '),
				visible:
					!this.data.whisper.length
					|| game.user.isGM
					|| (!this.data.blind
						&& (this.data.whisper.includes(game.userId)
							|| this.data.user === game.userId))
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
				if (canvas.scene && canvas.scene.id !== this.data.speaker.scene) {
					return;
				}

				canvas.tokens.get(this.data.speaker.token)?._onHoverIn(null, true);
			}, () => {
				if (canvas.scene && canvas.scene.id !== this.data.speaker.scene) {
					return;
				}

				canvas.tokens.get(this.data.speaker.token)?._onHoverOut();
			});

			html.find('[data-roll]').click(evt => {
				const roll = evt.currentTarget.dataset.roll;
				if (roll === 'item') {
					ObsidianItems.roll(actor, evt.currentTarget.dataset);
				} else {
					Rolls.fromClick(actor, evt);
				}
			});

			html.find('.obsidian-summon').click(Rolls.summon);
			html.find('.obsidian-place-template').click(Rolls.placeTemplate);
			html.find('[data-dmg], [data-apply-all]').click(Rolls.applyDamage);
			html.find('.obsidian-apply-save').click(evt => Rolls.applySave(evt, 'saves'));
			html.find('.obsidian-apply-check').click(evt => Rolls.applySave(evt, 'checks'));
			html.find('.obsidian-msg-roll-box[draggable="true"]').each((i, el) => initRollDrag(el));
			html.find('.obsidian-dice-drop-target').each((i, el) => initRollDrop(el));
			$('.obsidian-msg-tooltip').css('display', 'none');
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
	chat.querySelectorAll('[data-apply-dmg], [data-apply-all]').forEach(el => el.innerHTML = dmg);
	chat.querySelectorAll('.obsidian-apply-save').forEach(el => el.innerHTML = save);
}

export function applyRollDragover (evt) {
	$('#chat-log .obsidian-dragover')
		.removeClass('obsidian-dragover obsidian-dragover-positive obsidian-dragover-negative');

	const target = evt.target.closest('.obsidian-dice-drop-target');
	if (target) {
		target.classList.add(
			'obsidian-dragover', `obsidian-dragover-${evt.shiftKey ? 'negative' : 'positive'}`);
	}
}

function initRollDrag (el) {
	el.addEventListener('dragstart', evt =>
		evt.dataTransfer.setData('application/json', JSON.stringify(el.dataset)));

	el.addEventListener('dragend', () =>
		$('#chat-log .obsidian-dragover').removeClass(
			'obsidian-dragover obsidian-dragover-positive obsidian-dragover-negative'));
}

function initRollDrop (el) {
	el.addEventListener('dragover', evt => {
		evt.preventDefault();
		evt.dataTransfer.dropEffect = 'copy';
	});

	el.addEventListener('drop', evt => {
		evt.preventDefault();
		const data = JSON.parse(evt.dataTransfer.getData('application/json'));

		if (data.value) {
			data.value = Number(data.value);
		}

		if (data.json) {
			data.json = JSON.parse(unescape(data.json));
		}

		const mode = evt.currentTarget.dataset.mode;
		const index = Number(evt.currentTarget.dataset.index);
		const msgID = evt.currentTarget.closest('[data-message-id]').dataset.messageId;
		const msg = game.messages.get(msgID);

		if (!msg) {
			return;
		}

		const flags = msg.data._source.flags.obsidian;
		if (!flags) {
			return;
		}

		const value = evt.shiftKey ? data.value * -1 : data.value;
		if (!mode && !isNaN(index) && flags.results.length && !data.dmg && !data.json) {
			const results = duplicate(flags.results);
			const result = results[index];

			if (!result) {
				return;
			}

			result.forEach(roll => {
				roll.total += value;
				roll.breakdown += `${value.sgnex()} ${data.flavour ? `[${data.flavour}]` : ''}`;
			});

			msg.setFlag('obsidian', 'results', results);
			return;
		}

		if (flags.damage && flags.damage[mode]) {
			const extra = data.json ? data.json : [{total: data.value, type: data.dmg}];
			const damage = duplicate(flags.damage[mode]);
			const first = damage.results[0];

			if (!first) {
				return;
			}

			let total = damage.total;
			damage.results.push(...extra.map(line => {
				total += line.total;
				return {
					type: line.type ? line.type : first.type,
					total: line.total,
					breakdown: line.total.toString()
				};
			}));

			damage.total = total;
			msg.setFlag('obsidian', `damage.${mode}`, damage);
		}
	});
}
