import {OBSIDIAN} from '../global.js';
import {patchChatMessage} from '../module/message.js';
import {Rolls} from '../rules/rolls.js';
import {patchOnEscape} from '../module/actor-placement.js';
import {within5ftOf} from '../module/token.js';

export function runPatches () {
	Combat.prototype.rollInitiative = async function (ids) {
		ids = typeof ids === 'string' ? [ids] : ids;
		const currentID = this.combatant.id;
		const updates = [];
		const messages = [];

		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];
			const combatant = this.getCombatant(id);

			if (!combatant || !combatant.actor) {
				continue;
			}

			const roll = Rolls.initiative(combatant.actor);
			const result = roll.flags.obsidian.results[0].find(r => r.active);
			updates.push({_id: id, initiative: result.total});

			const chatData =
				Rolls.toMessage(
					combatant.actor,
					combatant.token.hidden || combatant.hidden ? 'gmroll' : 'roll');

			if (i > 0) {
				chatData.sound = null;
			}

			roll.flags.obsidian.npc = combatant.actor.data.type === 'npc';
			messages.push(mergeObject(chatData, roll));
		}

		if (!updates.length) {
			return this;
		}

		await this.updateEmbeddedDocuments('Combatant', updates);
		await this.update({turn: this.turns.findIndex(turn => turn.id === currentID)});
		await ChatMessage.create(messages);
		return this;
	};

	ChatPopout.prototype._renderInner = async function () {
		const html = await this.message.render(false, {popout: true});
		html.find('.message-delete').remove();
		return html;
	};

	Token.prototype.within5ftOf = function (other) {
		if (!other || !(other instanceof Token)) {
			return false;
		}

		return within5ftOf(this, other);
	};

	Actor.schema.prototype.toObject = (function () {
		const cached = Actor.schema.prototype.toObject;
		return function (source = true) {
			const data = cached.apply(this, arguments);
			if (!source) {
				data.obsidian = cloneWithObject(this.obsidian, false);
			}

			return data;
		};
	})();

	Item.schema.prototype.toObject = (function () {
		const cached = Item.schema.prototype.toObject;
		return function (source = true) {
			const data = cached.apply(this, arguments);
			if (!source) {
				data.idx = this.idx;
				data.obsidian = cloneWithObject(this.obsidian, false);
			}

			return data;
		};
	})();

	patchChatMessage();
	patchOnEscape();
}

OBSIDIAN.detectArrays = function (original, updates) {
	const arrays = new Set();
	for (const update in updates) {
		const path = [];
		let target = original;
		for (const prop of update.split('.')) {
			if (prop in target) {
				path.push(prop);
				const val = target[prop];
				if (Array.isArray(val)) {
					arrays.add(path.join('.'));
					break;
				} else {
					target = val;
				}
			} else {
				break;
			}
		}
	}

	return [...arrays.values()];
};

OBSIDIAN.updateArrays = function (original, changed) {
	const arrays = OBSIDIAN.detectArrays(original, changed);
	const expanded = {};
	arrays.forEach(p => expanded[p] = duplicate(getProperty(original, p)));

	if (arrays.length > 0) {
		for (const [k, v] of Object.entries(changed)) {
			let found = false;
			for (const p of arrays) {
				if (k.startsWith(`${p}.`)) {
					found = true;
					setProperty(expanded[p], k.substr(p.length + 1), v);
				}
			}

			if (!found) {
				expanded[k] = v;
			}
		}
	}

	return Object.keys(expanded).length > 0 ? expanded : changed;
};

OBSIDIAN.updateManyOwnedItems = function (actor, data) {
	if (actor.isToken) {
		const byID = new Map(data.map(item => [item._id, item]));
		const items = duplicate(actor.data._source.items);

		items.forEach(item => {
			const update = byID.get(item._id);
			if (update) {
				mergeObject(item, OBSIDIAN.updateArrays(item, update));
			}
		});

		return actor.token.update({'actorData.items': items});
	}

	const expanded = data.map(update =>
		OBSIDIAN.updateArrays(actor.items.get(update._id).data._source, update));

	return actor.updateEmbeddedDocuments('Item', expanded);
};
