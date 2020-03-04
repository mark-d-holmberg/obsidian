export function initDurations () {
	game.settings.register('obsidian', 'durations', {
		default: [],
		scope: 'world',
		onChange: renderDurations
	});

	Hooks.on('updateCombat', advanceDurations);
	renderDurations();
}

function createDuration (actor, duration, effect) {
	const durations = game.settings.get('obsidian', 'durations');
	const existing = durations.find(duration => duration.effect === effect);

	if (existing) {
		existing.remaining = duration;
	} else {
		durations.push({
			actor: actor.data._id,
			effect: effect,
			remaining: duration
		});
	}

	updateDurations(durations);
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
		game.settings.set('obsidian', 'durations', durations);
	} else {
		game.socket.emit('module.obsidian', {
			action: 'SET.WORLD',
			key: 'durations',
			value: durations
		});
	}
}

function advanceDurations (combat) {
	if (!combat.combatant.actor) {
		return;
	}

	const actor = combat.combatant.actor.data._id;
	const durations = game.settings.get('obsidian', 'durations');
	durations
		.filter(duration => duration.actor === actor)
		.forEach(duration => duration.remaining--);

	const expired = durations.filter(duration => duration.remaining < 1);

	// Here is where we do something special with the expired durations.

	updateDurations(durations.filter(duration => !expired.includes(duration)));
}

function onDelete (html) {
	const durations = game.settings.get('obsidian', 'durations');
	const uuid = html.data('effect');
	const idx = durations.findIndex(duration => duration.effect === uuid);

	if (idx < 0) {
		return;
	}

	durations.splice(idx, 1);
	updateDurations(durations);
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

	const actor = game.actors.get(duration.data('actor'));
	return actor && actor.owner;
}

function renderDurations () {
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
		const actor = game.actors.get(duration.actor);
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
			<div class="obsidian-duration" data-actor="${duration.actor}"
			     data-effect="${effect.uuid}">
				<img src="${item.img}" alt="${label}">
				<div class="obsidian-duration-remaining">${remaining}</div>
				<div class="obsidian-msg-tooltip">${label}</div>
			</div>
		`));
	}

	durationBar.find('.obsidian-duration').hover(onEnter, onLeave);
}
