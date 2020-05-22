import {ObsidianActor} from './actor.js';
import {OBSIDIAN} from '../global.js';
import {Rolls} from '../rules/rolls.js';
import {Schema} from './schema.js';

export function initDurations () {
	Hooks.on('controlToken', renderDurations);
}

async function applyDuration (duration, actor, uuid, roll, active) {
	const effect = actor.data.obsidian.effects.get(uuid);
	if (!effect) {
		return;
	}

	if (effect.components.some(c => c.type === 'bonus' || c.type === 'roll-mod')) {
		for (const target of game.user.targets) {
			if (!target.actor.data.items.some(item =>
					item.flags.obsidian.duration
					&& item.flags.obsidian.duration.item === duration._id))
			{
				active.push([target.scene.data._id, target.data._id]);
				await createActiveEffect(target, actor, effect, duration);
			}
		}
	}

	if (roll && (!effect.isScaling || effect.selfScaling)) {
		Rolls.create(actor, {
			roll: 'fx',
			uuid: effect.uuid,
			scaling: duration.scaledAmount,
			withDuration: false
		});
	}
}

async function createDuration (actor, rounds, effect, scaledAmount) {
	let duration =
		actor.data.items.find(item =>
			item.type === 'feat'
			&& getProperty(item, 'flags.obsidian.duration')
			&& getProperty(item, 'flags.obsidian.ref') === effect);

	if (!duration) {
		duration = {
			type: 'feat',
			name: 'Duration',
			flags: {
				obsidian: {
					duration: true,
					ref: effect,
					remaining: rounds,
					scaledAmount: scaledAmount,
					version: Schema.VERSION
				}
			}
		};

		duration = await actor.createEmbeddedEntity('OwnedItem', duration);
		if (actor.isToken) {
			duration = duration.actorData.items.last();
		}
	}

	const active = [];
	await applyDuration(duration, actor, effect, false, active);
	await actor.updateEmbeddedEntity('OwnedItem', {
		_id: duration._id,
		'flags.obsidian.remaining': rounds,
		'flags.obsidian.active': active
	});

	renderDurations();
}

async function createActiveEffect (target, actor, effect, duration) {
	const originalItem = actor.data.obsidian.itemsByID.get(effect.parentItem);
	effect = duplicate(effect);
	effect.uuid = OBSIDIAN.uuid();
	effect.components = effect.components.filter(component => component.type !== 'duration');
	effect.components.forEach(component => component.uuid = OBSIDIAN.uuid());
	effect.activeEffect = true;
	effect.toggle = {active: true};
	effect.img = originalItem.img;

	const item = {
		type: 'feat',
		name: 'ActiveEffect',
		flags: {
			obsidian: {
				activeEffect: true,
				effects: [effect],
				duration: {
					item: duration._id
				}
			}
		}
	};

	if (actor.isToken) {
		item.flags.obsidian.duration.scene = actor.token.scene.data._id;
		item.flags.obsidian.duration.token = actor.token.data._id;
	} else {
		item.flags.obsidian.duration.actor = actor.data._id;
	}

	if (game.user.isGM) {
		await target.actor.createEmbeddedEntity('OwnedItem', item);
	} else {
		await game.socket.emit('module.obsidian', {
			action: 'CREATE.OWNED',
			sceneID: target.scene.data._id,
			tokenID: target.data._id,
			data: item
		});
	}
}

export function handleDurations (actor, item, effect, scaledAmount) {
	const durations = effect.components.filter(c => c.type === 'duration');
	const magnitude = getProperty(item, 'flags.obsidian.duration.type');
	const spellDuration =
		item.type === 'spell' && ['round', 'min', 'hour', 'day'].includes(magnitude);

	if (!durations.length && !spellDuration) {
		return;
	}

	let duration;
	if (durations.length) {
		duration = durations[0].duration;
	} else {
		duration = item.flags.obsidian.duration.n;
		if (magnitude === 'min') {
			duration *= 10;
		} else if (magnitude === 'hour') {
			duration *= 60;
		} else if (magnitude === 'day') {
			duration *= 60 * 24;
		}
	}

	createDuration(actor, duration, effect.uuid, scaledAmount);
}

export async function advanceDurations (combat) {
	if (!combat.combatant.actor) {
		return;
	}

	const durations =
		combat.combatant.actor.data.items.filter(item =>
			item.type === 'feat' && getProperty(item, 'flags.obsidian.duration'));

	const update = [];
	const expired = [];

	for (const duration of durations) {
		const remaining = duration.flags.obsidian.remaining - 1;
		if (remaining < 1) {
			expired.push(duration);
		} else {
			update.push({_id: duration._id, 'flags.obsidian.remaining': remaining});
		}
	}

	await cleanupExpired(expired);
	await combat.combatant.actor.deleteEmbeddedEntity('OwnedItem', expired.map(item => item._id));
	await OBSIDIAN.updateManyOwnedItems(combat.combatant.actor, update);
	renderDurations();
}

async function cleanupExpired (expired) {
	for (const duration of expired) {
		for (const [sceneID, tokenID] of duration.flags.obsidian.active || []) {
			const actor = ObsidianActor.fromSceneTokenPair(sceneID, tokenID);
			if (!actor) {
				continue;
			}

			const items =
				actor.data.items
					.filter(item =>
						item.flags.obsidian.duration
						&& item.flags.obsidian.duration.item === duration._id)
					.map(item => item._id);

			if (!items.length) {
				continue;
			}

			if (game.user.isGM) {
				await actor.deleteEmbeddedEntity('OwnedItem', items);
			} else {
				await game.socket.emit({
					action: 'DELETE.MANY.OWNED',
					sceneID: sceneID,
					tokenID: tokenID,
					ids: items
				});
			}
		}
	}
}

async function onDelete (html) {
	const actor = canvas.tokens.controlled[0].actor;
	if (!actor) {
		return;
	}

	const duration = actor.data.obsidian.itemsByID.get(html.data('item-id'));
	if (!duration) {
		return;
	}

	await cleanupExpired([duration]);
	await actor.deleteEmbeddedEntity('OwnedItem', duration._id);
	renderDurations();
}

async function onEdit (html) {
	const actor = canvas.tokens.controlled[0].actor;
	if (!actor) {
		return;
	}

	const duration = actor.data.obsidian.itemsByID.get(html.data('item-id'));
	if (!duration) {
		return;
	}

	const doEdit = async remaining => {
		await actor.updateEmbeddedEntity('OwnedItem', {
			_id: duration._id,
			'flags.obsidian.remaining': remaining
		});

		renderDurations();
	};

	const dlg = await renderTemplate('modules/obsidian/html/dialogs/duration.html', {
		name: html.find('img').attr('alt'),
		remaining: duration.flags.obsidian.remaining
	});

	new Dialog({
		title: game.i18n.localize('OBSIDIAN.Duration'),
		content: dlg,
		default: 'update',
		buttons: {
			update: {
				icon: '<i class="fas fa-save"></i>',
				label: game.i18n.localize('OBSIDIAN.Update'),
				callback: dlg => doEdit(Number(dlg.find('input').val()))
			}
		}
	}, {classes: ['form', 'dialog', 'obsidian-window'], width: 300}).render(true);
}

async function onClick (evt) {
	const actor = canvas.tokens.controlled[0].actor;
	if (!actor) {
		return;
	}

	const duration = actor.data.obsidian.itemsByID.get(evt.currentTarget.dataset.itemId);
	if (!duration) {
		return;
	}

	const active = [];
	await applyDuration(duration, actor, duration.flags.obsidian.ref, true, active);
	if (game.user.targets.size) {
		actor.updateEmbeddedEntity('OwnedItem', {
			_id: duration._id,
			'flags.obsidian.active': active
		});
	}
}

function onEnter (evt) {
	if (evt.currentTarget.classList.contains('context')) {
		return;
	}

	const rect = evt.currentTarget.getBoundingClientRect();
	let tooltip = evt.currentTarget._tt;

	if (!tooltip) {
		tooltip = $(evt.currentTarget).find('.obsidian-msg-tooltip').clone().appendTo($('body'));
		evt.currentTarget._tt = tooltip;
	}

	tooltip.css({
		display: 'block',
		left: `${rect.left}px`,
		top: `${rect.top - tooltip.height() - 12}px`
	});
}

function onLeave (evt) {
	if (evt.currentTarget._tt) {
		evt.currentTarget._tt.css('display', 'none');
	}
}

export function renderDurations () {
	let durationBar = $('#obsidian-duration-bar');
	if (!durationBar.length) {
		durationBar = $('<div></div>');
		durationBar.attr('id', 'obsidian-duration-bar');
		$(document.body).append(durationBar);

		new ContextMenu(durationBar, '.obsidian-duration', [{
			name: '',
			icon: '<i class="fas fa-trash"></i>',
			callback: onDelete
		}, {
			name: '',
			icon: '<i class="fas fa-edit"></i>',
			callback: onEdit
		}]);
	}

	durationBar.find('.obsidian-duration').each((i, el) => {
		if (el._tt) {
			el._tt.remove();
		}
	});

	durationBar.empty();

	if (!canvas.tokens.controlled.length) {
		return;
	}

	const actor = canvas.tokens.controlled[0].actor;
	if (!actor) {
		return;
	}

	const durations =
		actor.data.items.filter(item =>
			item.type === 'feat' && getProperty(item, 'flags.obsidian.duration'));

	for (const duration of durations) {
		const effect = actor.data.obsidian.effects.get(duration.flags.obsidian.ref);
		if (!effect) {
			continue;
		}

		const item = actor.data.obsidian.itemsByID.get(effect.parentItem);
		if (!item) {
			continue;
		}

		const label = effect.name.length ? effect.name : item.name;
		let remaining = duration.flags.obsidian.remaining;

		if (remaining > 10) {
			remaining = '10+';
		}

		durationBar.append($(`
			<div class="obsidian-duration" data-item-id="${duration._id}">
				<img src="${item.img}" alt="${label}">
				<div class="obsidian-duration-remaining">${remaining}</div>
				<div class="obsidian-msg-tooltip">${label}</div>
			</div>
		`));
	}

	durationBar.find('.obsidian-duration').hover(onEnter, onLeave).click(onClick);
}
