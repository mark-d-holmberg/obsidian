import {ObsidianActor} from './actor.js';
import {OBSIDIAN} from '../rules/rules.js';

export function initDurations () {
	Hooks.on('updateCombat', advanceDurations);
	renderDurations();
}

async function createDuration (actor, rounds, effect) {
	const durations = game.settings.get('obsidian', 'durations');
	let duration = durations.find(duration => duration.effect === effect);

	if (duration) {
		duration.remaining = rounds;
	} else {
		duration = {
			effect: effect,
			remaining: rounds
		};

		durations.push(duration);
		if (actor.isToken) {
			duration.scene = actor.token.scene.data._id;
			duration.token = actor.token.data._id;
		} else {
			duration.actor = actor.data._id;
		}
	}

	duration.active = [];
	if (game.user.targets.size) {
		for (const target of game.user.targets) {
			duration.active.push([target.scene.data._id, target.data._id, effect]);
			await createActiveEffect(target, effect);
		}
	}

	updateDurations(durations);
}

async function createActiveEffect (target, uuid) {
	let effect = target.actor.data.obsidian.effects.get(uuid);
	if (!effect) {
		return;
	}

	const originalItem = target.actor.data.obsidian.itemsByID.get(effect.parentItem);
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
				original: uuid,
				effects: [effect],
			}
		}
	};

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

export function handleDurations (actor, item, effect) {
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

	createDuration(actor, duration, effect.uuid);
}

export function updateDurations (durations) {
	if (game.user.isGM) {
		return game.settings.set('obsidian', 'durations', durations);
	} else {
		return game.socket.emit('module.obsidian', {
			action: 'SET.WORLD',
			key: 'durations',
			value: durations
		});
	}
}

async function advanceDurations (combat) {
	if (!combat.combatant.actor) {
		return;
	}

	const durations = game.settings.get('obsidian', 'durations');
	const filter = durationFilter(combat.combatant.actor);
	durations.filter(filter).forEach(duration => duration.remaining--);

	const expired = durations.filter(duration => duration.remaining < 1);
	await cleanupExpired(expired);
	await updateDurations(durations.filter(duration => !expired.includes(duration)));
	refreshOwners(expired);
}

export function durationFilter (actor) {
	if (actor.isToken) {
		return duration =>
			duration.scene === actor.token.scene.data._id
			&& duration.token === actor.token.data._id;
	} else {
		return duration => duration.actor === actor.data._id;
	}
}

async function cleanupExpired (expired) {
	for (const duration of expired) {
		for (const [sceneID, tokenID, effect] of duration.active) {
			const actor = ObsidianActor.fromSceneTokenPair(sceneID, tokenID);
			if (!actor) {
				continue;
			}

			const item =
				actor.data.items.find(item =>
					getProperty(item, 'flags.obsidian.original') === effect);

			if (!item) {
				continue;
			}

			if (game.user.isGM) {
				await actor.deleteEmbeddedEntity('OwnedItem', item._id);
			} else {
				await game.socket.emit({
					action: 'DELETE.OWNED',
					sceneID: sceneID,
					tokenID: tokenID,
					itemID: item._id
				});
			}
		}
	}
}

async function onDelete (html) {
	const durations = game.settings.get('obsidian', 'durations');
	const uuid = html.data('effect');
	const idx = durations.findIndex(duration => duration.effect === uuid);

	if (idx < 0) {
		return;
	}

	const expired = durations.splice(idx, 1);
	await cleanupExpired(expired);
	await updateDurations(durations);
	refreshOwners(expired);
}

function refreshOwners (expired) {
	for (const duration of expired) {
		const actor = getDurationActor(duration);
		if (actor) {
			actor.prepareData();
			actor.getActiveTokens().forEach(token => token.drawEffects());
		}
	}
}

async function onEdit (html) {
	const durations = game.settings.get('obsidian', 'durations');
	const duration = durations.find(duration => duration.effect === html.data('effect'));

	if (!duration) {
		return;
	}

	const doEdit = remaining => {
		duration.remaining = remaining;
		updateDurations(durations);
	};

	const dlg = await renderTemplate('modules/obsidian/html/dialogs/duration.html', {
		name: html.find('img').attr('alt'),
		remaining: duration.remaining
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
	if (!game.user.targets.size) {
		return;
	}

	const effect = evt.currentTarget.dataset.effect;
	const durations = game.settings.get('obsidian', 'durations');
	const duration = durations.find(duration => duration.effect === effect);

	if (!duration) {
		return;
	}

	duration.active = [];
	for (const target of game.user.targets) {
		duration.active.push([target.scene.data._id, target.data._id, effect]);
		await createActiveEffect(target, effect);
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

function ownsDuration (duration) {
	if (game.user.isGM) {
		return true;
	}

	let actor;
	if (duration.data('actor')) {
		actor = game.actors.get(duration.data('actor'));
	} else {
		actor = ObsidianActor.fromSceneTokenPair(duration.data('scene'), duration.data('token'));
	}

	return actor && actor.owner;
}

export function getDurationActor (duration) {
	if (duration.actor) {
		return game.actors.get(duration.actor);
	} else {
		return ObsidianActor.fromSceneTokenPair(duration.scene, duration.token);
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
			callback: onDelete,
			condition: ownsDuration
		}, {
			name: '',
			icon: '<i class="fas fa-edit"></i>',
			callback: onEdit,
			condition: ownsDuration
		}]);
	}

	durationBar.find('.obsidian-duration').each((i, el) => {
		if (el._tt) {
			el._tt.remove();
		}
	});

	durationBar.empty();
	const durations = game.settings.get('obsidian', 'durations');

	for (const duration of durations) {
		const actor = getDurationActor(duration);
		if (!actor || !getProperty(actor, 'data.obsidian.effects')) {
			continue;
		}

		const effect = actor.data.obsidian.effects.get(duration.effect);
		if (!effect) {
			continue;
		}

		const item = actor.data.obsidian.itemsByID.get(effect.parentItem);
		if (!item) {
			continue;
		}

		const label = effect.name.length ? effect.name : item.name;
		let remaining = duration.remaining;

		if (remaining > 10) {
			remaining = '10+';
		}

		durationBar.append($(`
			<div class="obsidian-duration" data-effect="${effect.uuid}"
			     ${duration.actor ? `data-actor="${duration.actor}"` : ''}
			     ${duration.scene ? `data-scene="${duration.scene}"` : ''}
			     ${duration.token ? `data-token="${duration.token}"` : ''}>
				<img src="${item.img}" alt="${label}">
				<div class="obsidian-duration-remaining">${remaining}</div>
				<div class="obsidian-msg-tooltip">${label}</div>
			</div>
		`));
	}

	durationBar.find('.obsidian-duration').hover(onEnter, onLeave).click(onClick);
}
