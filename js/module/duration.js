import {ObsidianActor} from './actor.js';
import {OBSIDIAN} from '../global.js';
import {Rolls} from '../rules/rolls.js';
import {Schema} from './schema.js';
import {ObsidianItems} from '../rules/items.js';

export function initDurations () {
	Hooks.on('controlToken', renderDurations);
}

async function applyDuration (duration, actor, uuid, roll, active) {
	const effect = actor.data.obsidian.effects.get(uuid);
	if (!effect) {
		return;
	}

	const targets = game.user.targets;
	if (targets.size < 1 && effect.targetComponent && effect.targetComponent.target === 'self') {
		if (actor.isToken) {
			targets.add(actor.token);
		} else {
			const tokens = actor.getActiveTokens(true);
			if (tokens.length) {
				targets.add(tokens[0]);
			}
		}
	}

	if (effect.applies.length) {
		for (const target of targets) {
			if (!target.actor.data.items.some(item =>
					item.flags.obsidian.duration?.src === duration._id))
			{
				active.push([target.scene.data._id, target.data._id]);
				await createActiveEffect(target, actor, effect, duration, 'target');
			}
		}
	}

	if (roll && (!effect.isScaling || effect.selfScaling)) {
		Rolls.create(actor, {
			roll: 'fx',
			uuid: effect.uuid,
			scaling: duration.flags.obsidian.scaledAmount,
			withDuration: false
		});
	}
}

export async function applyEffects (actor, effect, targets, on) {
	if (!effect.applies.length) {
		return;
	}

	const duration = findExistingDuration(actor, effect.uuid);
	let active = [];

	if (duration) {
		active = duplicate(duration.flags.obsidian.active);
	}

	for (const target of targets) {
		active.push([target.scene.data._id, target.data._id]);
		await createActiveEffect(target, actor, effect, duration, on);
	}

	if (duration) {
		actor.updateEmbeddedEntity('ActiveEffect', {
			_id: duration._id,
			'flags.obsidian.active': active
		});
	}
}

async function createDuration (actor, rounds, effect, scaledAmount) {
	let duration = findExistingDuration(actor, effect);
	if (!duration) {
		const item = actor.items.get(actor.data.obsidian.effects.get(effect)?.parentItem);
		duration = {
			icon: item?.img,
			flags: {
				obsidian: {
					active: [],
					duration: true,
					ref: effect,
					remaining: rounds,
					scaledAmount: scaledAmount,
					version: Schema.VERSION
				}
			}
		};

		duration = await actor.createEmbeddedEntity('ActiveEffect', duration);
	}

	const active = [];
	await applyDuration(duration, actor, effect, false, active);
	const newActive = duplicate(duration.flags.obsidian.active);
	newActive.push(...active.filter(([sceneA, tokenA]) =>
		!newActive.some(([sceneB, tokenB]) => sceneB === sceneA && tokenB === tokenA)));

	await actor.updateEmbeddedEntity('ActiveEffect', {
		_id: duration._id,
		'flags.obsidian.remaining': rounds,
		'flags.obsidian.active': newActive
	});

	renderDurations();
}

async function createActiveEffect (target, actor, effect, duration, on) {
	const originalItem = actor.data.obsidian.itemsByID.get(effect.parentItem);
	const effects =
		duplicate(
			effect.applies
				.map(uuid => actor.data.obsidian.effects.get(uuid))
				.filter(effect =>
					(!effect.appliedComponent.on && on === 'target')
					|| effect.appliedComponent.on === on));

	effects.forEach(e => {
		e.uuid = OBSIDIAN.uuid();
		e.components = e.components.filter(c => c.type !== 'duration' && c.type !== 'applied');
		e.components.forEach(c => c.uuid = OBSIDIAN.uuid());
		e.activeEffect = true;
		e.toggle = {active: true};
		e.img = originalItem.img;
	});

	const item = {
		type: 'feat',
		name: originalItem.name,
		flags: {
			obsidian: {
				version: Schema.VERSION,
				activeEffect: true,
				effects: effects,
				duration: {
					src: duration?._id
				}
			}
		}
	};

	let exhaustion = false;
	const permanentConditions = [];

	effects.forEach(e => e.components = e.components.reduce((acc, component) => {
		if (component.type === 'condition' || component.temp) {
			acc.push(component);
		} else if (component.condition === 'exhaustion') {
			exhaustion = true;
		} else {
			permanentConditions.push(component.condition);
		}

		return acc;
	}, []));

	let existingExhaustion;
	const existingConditions = new Set(target.actor.effects.reduce((acc, e) => {
		const id = e.getFlag('core', 'statusId');
		if (id?.startsWith('exhaust')) {
			existingExhaustion = e;
		} else if (id) {
			acc.push(id);
		}

		return acc;
	}, []));

	const conditions =
		permanentConditions
			.filter(condition => !existingConditions.has(condition))
			.map(condition => {
				return {
					label: game.i18n.localize(`OBSIDIAN.Condition-${condition}`),
					icon: `modules/obsidian/img/conditions/${condition}.svg`,
					'flags.core.statusId': condition
				};
			});

	if (exhaustion && existingExhaustion) {
		if (game.user.isGM) {
			await target.actor.deleteEmbeddedEntity('ActiveEffect', existingExhaustion.data._id);
		} else {
			await game.socket.emit('module.obsidian', {
				action: 'DELETE',
				entity: 'ActiveEffect',
				data: existingExhaustion.data._id
			});
		}
	}

	if (exhaustion) {
		let level = 1;
		if (existingExhaustion) {
			const id = existingExhaustion.getFlag('core', 'statusId');
			level = Number(id.substr(7));
		}

		conditions.push({
			label: game.i18n.localize('OBSIDIAN.Condition-exhaustion'),
			icon: `modules/obsidian/img/conditions/exhaust${level}.svg`,
			'flags.core.statusId': `exhaust${level}`
		});
	}

	if (conditions.length) {
		if (game.user.isGM) {
			await target.actor.createEmbeddedEntity('ActiveEffect', conditions);
		} else {
			await game.socket.emit('module.obsidian', {
				action: 'CREATE',
				entity: 'ActiveEffect',
				data: conditions
			});
		}
	}

	const flags = item.flags.obsidian;
	if (actor.isToken) {
		flags.duration.scene = actor.token.scene.data._id;
		flags.duration.token = actor.token.data._id;
	} else {
		flags.duration.actor = actor.data._id;
	}

	if (game.user.isGM) {
		await target.actor.createEmbeddedEntity('OwnedItem', item);
	} else {
		await game.socket.emit('module.obsidian', {
			action: 'CREATE',
			entity: 'OwnedItem',
			sceneID: target.scene.data._id,
			tokenID: target.data._id,
			data: item
		});
	}
}

export function handleDurations (actor, item, effect, scaledAmount, rolledDuration) {
	const durations = effect.components.filter(c => c.type === 'duration');
	const magnitude = getProperty(item, 'flags.obsidian.duration.type');
	const spellDuration =
		item.type === 'spell' && ['round', 'min', 'hour', 'day'].includes(magnitude);

	let duration;
	if (durations.length) {
		duration = rolledDuration === undefined ? durations[0].duration : rolledDuration;
	} else if (spellDuration) {
		duration = item.flags.obsidian.duration.n;
		if (magnitude === 'min') {
			duration *= 10;
		} else if (magnitude === 'hour') {
			duration *= 60;
		} else if (magnitude === 'day') {
			duration *= 60 * 24;
		}
	}

	if (effect.applies.length && !duration) {
		duration = 'Infinity';
	}

	if (item.type === 'spell' && !duration) {
		// Create a temporary bubble to allow retargeting/alternate effects for
		// instantaneous spells that expires at the end of the turn.
		duration = 0;
	}

	if (duration == null) {
		return;
	}

	createDuration(actor, duration, effect.uuid, scaledAmount);
}

function findExistingDuration (actor, ref) {
	const byRef = () =>
		actor.data.effects.find(effect =>
			getProperty(effect, 'flags.obsidian.duration')
			&& getProperty(effect, 'flags.obsidian.ref') === ref);

	const effect = actor.data.obsidian.effects.get(ref);
	if (!effect) {
		return byRef();
	}

	const item = actor.data.obsidian.itemsByID.get(effect.parentItem);
	if (!item) {
		return byRef();
	}

	if (item.type === 'spell') {
		const uuids = new Set(item.flags.obsidian.effects.map(effect => effect.uuid));
		return actor.data.effects.find(effect =>
			getProperty(effect, 'flags.obsidian.duration')
			&& uuids.has(getProperty(effect, 'flags.obsidian.ref')));
	}

	return byRef();
}

export async function advanceDurations (combat) {
	const actor = combat.combatant?.actor;
	if (!actor) {
		return;
	}

	const durations =
		actor.data.effects.filter(effect =>
			getProperty(effect, 'flags.obsidian.duration') === true);

	const update = [];
	const expired = [];

	for (const duration of durations) {
		if (duration.flags.obsidian.remaining === 'Infinity') {
			continue;
		}

		const remaining = duration.flags.obsidian.remaining - 1;
		if (remaining < 1) {
			expired.push(duration);
		} else {
			update.push({_id: duration._id, 'flags.obsidian.remaining': remaining});
		}
	}

	await cleanupExpired(actor, expired);
	await actor.deleteEmbeddedEntity('ActiveEffect', expired.map(item => item._id));
	await actor.updateEmbeddedEntity('ActiveEffect', update);
	renderDurations();
}

async function cleanupExpired (actor, expired) {
	const summonedTokens =
		canvas?.tokens.placeables.filter(t => t.data.actorData.flags?.obsidian?.summon);

	for (const duration of expired) {
		const scenes = new Map();
		const expiredTokens = summonedTokens.filter(t => {
			const component =
				actor.data.obsidian.components.get(
					t.data.actorData.flags.obsidian.summon.parentComponent);

			if (!component) {
				return false;
			}

			return component.parentEffect === duration.flags.obsidian.ref;
		});

		expiredTokens.forEach(t => {
			let scene = scenes.get(t.scene.data._id);
			if (!scene) {
				scene = [];
				scenes.set(t.scene.data._id, scene);
			}

			scene.push(t.data._id);
		});

		if (expiredTokens.length) {
			if (game.user.isGM) {
				await Promise.all(
					Array.from(scenes.entries()).map(([sceneID, tokenIDs]) => {
						const scene = game.scenes.get(sceneID);
						return scene.deleteEmbeddedEntity('Token', tokenIDs);
					}));
			} else {
				await game.socket.emit('module.obsidian', {
					action: 'DELETE.TOKENS',
					tokens: Array.from(scenes.entries())
				});
			}
		}

		for (const [sceneID, tokenID] of duration.flags.obsidian.active || []) {
			const actor = ObsidianActor.fromSceneTokenPair(sceneID, tokenID);
			if (!actor) {
				continue;
			}

			const items =
				actor.data.items
					.filter(item => item.flags.obsidian.duration?.src === duration._id)
					.map(item => item._id);

			if (!items.length) {
				continue;
			}

			if (game.user.isGM) {
				await actor.deleteEmbeddedEntity('OwnedItem', items);
			} else {
				await game.socket.emit('module.obsidian', {
					action: 'DELETE',
					entity: 'OwnedItem',
					sceneID: sceneID,
					tokenID: tokenID,
					data: items
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

	const duration = actor.effects.get(html.data('item-id'));
	if (!duration) {
		return;
	}

	await cleanupExpired(actor, [duration.data]);
	await actor.deleteEmbeddedEntity('ActiveEffect', duration.data._id);
	renderDurations();
}

async function onEdit (html) {
	const actor = canvas.tokens.controlled[0].actor;
	if (!actor) {
		return;
	}

	const duration = actor.effects.get(html.data('item-id'));
	if (!duration) {
		return;
	}

	const doEdit = async remaining => {
		await actor.updateEmbeddedEntity('ActiveEffect', {
			_id: duration.data._id,
			'flags.obsidian.remaining': remaining
		});

		renderDurations();
	};

	const dlg = await renderTemplate('modules/obsidian/html/dialogs/duration.html', {
		name: html.find('img').attr('alt'),
		remaining: duration.data.flags.obsidian.remaining
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

	const duration = actor.effects.get(evt.currentTarget.dataset.itemId);
	if (!duration) {
		return;
	}

	const effect = actor.data.obsidian.effects.get(duration.data.flags.obsidian.ref);
	if (effect) {
		const item = actor.data.obsidian.itemsByID.get(effect.parentItem);
		if (item && item.type === 'spell') {
			ObsidianItems.rollItem(actor, {
				roll: 'item',
				id: item._id,
				spellLevel: item.data.level + (duration.data.flags.obsidian.scaledAmount || 0),
				parentResolved: true
			});

			return;
		}
	}

	const active = [];
	await applyDuration(duration.data, actor, duration.data.flags.obsidian.ref, true, active);
	const newActive = duplicate(duration.data.flags.obsidian.active);
	newActive.push(...active.filter(([sceneA, tokenA]) =>
		!newActive.some(([sceneB, tokenB]) => sceneB === sceneA && tokenB === tokenA)));

	if (game.user.targets.size) {
		actor.updateEmbeddedEntity('ActiveEffect', {
			_id: duration.data._id,
			'flags.obsidian.active': newActive
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

function initContextMenu (durationBar) {
	const render = target => {
		const menu = $('#obsidian-duration-menu');
		const html = menu.length ? menu : $('<nav id="obsidian-duration-menu"></nav>');
		const ol = $('<ol class="context-items"></ol>');
		html.html(ol);

		[['trash', onDelete], ['edit', onEdit]].forEach(([icon, callback]) => {
			const li = $(`<li class="context-item"><i class="fas fa-${icon} fa-fw"></i></li>`);
			ol.append(li);
			li.click(evt => {
				evt.preventDefault();
				evt.stopPropagation();
				callback(target);
				menu.remove();
				$('.context').removeClass('context');
			});
		});

		target.append(html).addClass('context');
	};

	durationBar.on('contextmenu', '.obsidian-duration', evt => {
		evt.preventDefault();
		const menu = document.getElementById('obsidian-duration-menu');
		$('.context').removeClass('context');

		if ($.contains(evt.currentTarget, menu)) {
			$(menu).remove();
		} else {
			render($(evt.currentTarget));
		}
	});
}

export function renderDurations () {
	let durationBar = $('#obsidian-duration-bar');
	if (!durationBar.length) {
		durationBar = $('<div></div>');
		durationBar.attr('id', 'obsidian-duration-bar');
		$(document.body).append(durationBar);
		initContextMenu(durationBar);
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
		actor.data.effects.filter(item => getProperty(item, 'flags.obsidian.duration'));

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

		if (remaining === 'Infinity') {
			remaining = '∞';
		} else if (remaining > 10) {
			remaining = '10+';
		} else if (remaining < 1) {
			remaining = false;
		}

		durationBar.append($(`
			<div class="obsidian-duration" data-item-id="${duration._id}">
				<img src="${duration.icon}" alt="${label}">
				${remaining !== false
					? `<div class="obsidian-duration-remaining">${remaining}</div>`
					: ''}
				<div class="obsidian-msg-tooltip">${label}</div>
			</div>
		`));
	}

	durationBar.find('.obsidian-duration').hover(onEnter, onLeave).click(onClick);
}
