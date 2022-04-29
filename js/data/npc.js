import {OBSIDIAN} from '../global.js';
import {Config} from './config.js';
import {Rolls} from '../module/rolls.js';

export function prepareNPC (flags, derived) {
	derived.details.tags = [];

	for (const [tag, val] of Object.entries(flags.details.tags)) {
		if (tag === 'custom' || !val) {
			continue;
		}

		derived.details.tags.push(game.i18n.localize(`OBSIDIAN.CreatureTag.${tag}`));
	}

	derived.details.tags = derived.details.tags.join(', ');
	if (!OBSIDIAN.notDefinedOrEmpty(flags.details.tags.custom)) {
		if (!OBSIDIAN.notDefinedOrEmpty(derived.details.tags)) {
			derived.details.tags += ', ';
		}

		derived.details.tags += flags.details.tags.custom;
	}
}

export function prepareNPCHD (data, flags, derived) {
	const size = data.traits.size;
	const conMod = data.abilities.con.mod;
	const maxHD = flags.attributes.hd.max || 0;

	derived.attributes.hd = {
		die: Config.NPC_SIZE_HD[size],
		const: maxHD * conMod
	};
}

export function prepareSpeed (data) {
	const move = data.attributes.movement;
	Config.SPEEDS.forEach(spd => {
		if (!move[spd]) {
			delete move[spd];
		}
	});
	move.walk ??= 0;
}

export function prepareVehicleActions (data, derived) {
	const actions = data.attributes.actions;
	if (!actions.value) {
		return;
	}

	const crew = derived.layout.crew;
	const thresholds =
		Object.entries(actions.thresholds)
			.map(([n, _]) => [Number(n), _])
			.filter(([n]) => n < actions.value)
			.sort(([a], [b]) => b - a);

	actions.max = actions.value;
	actions.value = 0;

	for (const [n, threshold] of thresholds) {
		if (threshold && crew >= threshold) {
			actions.value = n + 1;
			break;
		}
	}
}

export function prepareVehicleQuality (flags) {
	if (OBSIDIAN.notDefinedOrEmpty(flags.attributes.quality)) {
		flags.attributes.quality = 4;
	}
}

export function prepareVehicleLayout (actor, flags, derived) {
	const layout = {groups: {}, items: {}, actors: {}};
	derived.layout = layout;
	(flags.layout?.groups || []).forEach(g => {
		g = duplicate(g);
		g.items = [];
		layout.groups[g.id] = g;

		if (OBSIDIAN.notDefinedOrEmpty(g.name)) {
			g.name = '[Unnamed]';
		}

		const item = actor.items.get(g.id);
		if (item) {
			g.img = item.data.img;
			g.name = item.data.name;
		}
	});

	['crew', 'passengers', 'cargo'].forEach((id, i) => {
		if (layout.groups[id]) {
			return;
		}

		layout.groups[id] = {
			id, x: i * 3, y: 0, w: 3, h: 5, items: [],
			name: game.i18n.localize(`OBSIDIAN.LayoutGroup.${id}`)
		};
	});

	const existingItems = [];
	(flags.layout?.items || []).forEach(i => {
		const item = actor.items.get(i.id);
		if (!item || layout.groups[item.id]) {
			return;
		}

		existingItems.push(i);
		i = duplicate(i);
		i.type = 'items';
		layout.items[i.id] = i;
		layout.groups[i.parent]?.items.push(i);
	});

	if (flags.layout) {
		flags.layout.items = existingItems;
	}

	for (const item of actor.items) {
		const hasQuantity = 'quantity' in item.data.data;
		const requiresCrew =
			!OBSIDIAN.notDefinedOrEmpty(item.data.flags.obsidian?.conditions?.crew);

		if (!hasQuantity && !requiresCrew) {
			continue;
		}

		let i = layout.items[item.id];
		if (!i && !layout.groups[item.id]) {
			i = layout.items[item.id] = {id: item.id, parent: null};
		}

		if (i) {
			i.quantity = item.data.data.quantity;
			i.name = item.data.name;
			i.img = item.data.img;
			i.type = 'items';
			layout.groups[i.parent]?.items.push(i);
		}
	}

	(flags.layout?.actors || []).forEach(a => {
		a = duplicate(a);
		a.type = 'actors';
		layout.actors[a.id] = a;
		layout.groups[a.parent]?.items.push(a);
	});

	layout.passengers = 0;
	layout.crew = 0;

	Object.values(layout.actors).forEach(a => {
		if (a.parent === 'passengers') {
			layout.passengers += a.quantity;
		} else {
			layout.crew += a.quantity;
		}
	});
}

export async function refreshNPC (combat) {
	const actor = combat.combatant?.actor;
	if (actor?.type !== 'npc') {
		return;
	}

	const itemUpdates = [];
	for (const item of actor.items) {
		if (item.getFlag('obsidian', 'effects.length')) {
			continue;
		}

		for (const effect of item.data.flags.obsidian.effects) {
			for (const component of effect.components) {
				if (component.type !== 'resource'
					|| component.recharge.time !== 'roll'
					|| component.remaining === component.max)
				{
					continue;
				}

				const recharge = Rolls.abilityRecharge(item, effect, component);
				Rolls.toChat(actor, recharge);

				if (recharge.flags.obsidian.addendum.success) {
					const updateKey =
						`flags.obsidian.effects.${effect.idx}`
						+ `.components.${component.idx}.remaining`;

					itemUpdates.push(
						OBSIDIAN.updateArrays(item.data._source, {
							_id: item.id,
							[`${updateKey}`]: component.max
						}));
				}
			}
		}
	}

	if (itemUpdates.length) {
		await OBSIDIAN.updateManyOwnedItems(actor, itemUpdates);
	}

	const legact = actor.data.data.resources.legact;
	if (!legact) {
		return;
	}

	if (legact.max && legact.value) {
		actor.update({'data.resources.legact.value': 0});
	}
}
