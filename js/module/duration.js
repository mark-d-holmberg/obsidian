export function initDurations () {
	game.settings.register('obsidian', 'durations', {
		default: [],
		scope: 'world',
		onChange: renderDurations
	});

	renderDurations();
}

function renderDurations () {
	let durationBar = $('#obsidian-duration-bar');
	if (!durationBar.length) {
		durationBar = $('<div></div>');
		durationBar.attr('id', 'obsidian-duration-bar');
		$(document.body).append(durationBar);
	}

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

		const referencing = actor.data.obsidian.effects.get(effect.durationComponent.ref);
		if (!referencing) {
			continue;
		}

		const label = referencing.name.length ? referencing.name : item.name;
		const remaining = Math.clamped(duration.max - duration.elapsed, 0, duration.max);

		durationBar.append($(`
			<div class="obsidian-duration" data-actor="${duration.actor}"
			     data-effect="${effect.uuid}">
				<img src="${item.img}" alt="${label}">
				<div class="obsidian-duration-remaining">${remaining}</div>
			</div>
		`));
	}
}
