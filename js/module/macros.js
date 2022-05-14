import {ObsidianActor} from './actor.js';
import {Effect} from './effect.js';

let dnd5eDrop;

export function addMacroHook () {
	game.settings.register('obsidian', 'hotbar', {
		scope: 'world',
		type: Boolean,
		default: true,
		config: true,
		name: game.i18n.localize('OBSIDIAN.ConfigHotbarTitle'),
		hint: game.i18n.localize('OBSIDIAN.ConfigHotbarHint')
	});

	const hooks = Hooks._hooks.hotbarDrop;
	if (hooks.length) {
		dnd5eDrop = hooks[0];
	}

	hooks.forEach(hook => Hooks.off('hotbarDrop', hook));
	Hooks.on('hotbarDrop', onHotbarDrop);
}

async function onHotbarDrop (bar, data, slot) {
	const actor = game.actors.get(data.actorId);
	if ((data.type === 'Item' && !getProperty(data.data, 'flags.obsidian.effects'))
		|| !actor || !game.settings.get('obsidian', 'hotbar'))
	{
		if (dnd5eDrop) {
			dnd5eDrop(bar, data, slot);
		}

		return;
	}

	let command;
	let name;

	const args = {uuid: data.uuid};
	if (data.type === 'obsidian-roll') {
		args.rollData = data.data;
		command = `OBSIDIAN.Items.rollMacro(${JSON.stringify(args)})`;

		switch (args.rollData.roll) {
			case 'tool':
				name = actor.data.data.tools[args.rollData.tool].label;
				break;

			case 'skl':
				name = actor.data.data.skills[args.rollData.skl].label;
				break;

			case 'abl': case 'save':
				if (args.rollData.abl === 'init') {
					name = game.i18n.localize(`OBSIDIAN.Check.init`);
					break;
				}

				const abl = args.rollData[args.rollData.roll];
				const rollTranslation =
					game.i18n.localize(
						`OBSIDIAN.${args.rollData.roll === 'abl' ? 'CheckTitle' : 'Save'}`);

				name = `${game.i18n.localize(`OBSIDIAN.Ability.${abl}`)} ${rollTranslation}`;
				break;
		}
	} else if (data.effectId) {
		args.effect = data.effectId;
		command = `OBSIDIAN.Items.effectMacro(${JSON.stringify(args)})`;

		const effect =
			data.data.flags.obsidian.effects.find(effect => effect.uuid === data.effectId);

		if (effect) {
			name = OBSIDIAN.notDefinedOrEmpty(effect.name) ? data.data.name : effect.name;
		}
	} else {
		args.item = data.data._id;
		command = `OBSIDIAN.Items.itemMacro(${JSON.stringify(args)})`;
		name = data.data.name;
	}

	let macro =
		game.macros.contents.find(macro => macro.name === name && macro.command === command);

	if (!macro) {
		macro = await Macro.create({
			name: name,
			type: 'script',
			img: data.data.img,
			command: command,
			flags: {obsidian: {args: args}}
		}, {renderSheet: false});
	}

	game.user.assignHotbarMacro(macro, slot);
	return false;
}

export async function hotbarRender (hotbar, html) {
	for (const macro of hotbar.macros) {
		const args = macro.macro?.data.flags?.obsidian?.args;
		if (!args) {
			continue;
		}

		let actor = await fromUuid(args.uuid);
		if (args.token && args.scene) {
			actor = ObsidianActor.fromSceneTokenPair(args.scene, args.token);
		}

		if (!actor || !actor.data.obsidian) {
			continue;
		}

		const [remaining, max] =
			args.effect
				? resourcesFromEffect(actor, args.effect)
				: resourcesFromItem(actor, args.item);

		if (remaining === null && max === null) {
			continue;
		}

		let display = remaining.toString();
		if (max) {
			display += ` &sol; ${max}`;
		}

		html.find(`[data-macro-id="${macro.macro.id}"]`)
			.append(`<div class="obsidian-hotbar-counter">${display}</div>`);
	}
}

function resourcesFromEffect (actor, uuid) {
	const effect = actor.data.obsidian.effects.get(uuid);
	if (!effect) {
		return [null, null];
	}

	const resource = effect.components.find(c => c.type === 'resource');
	if (resource) {
		return [resource.remaining, resource.max];
	}

	if (effect.components.some(c => c.type === 'attack')) {
		return resourcesFromItem(actor, effect.parentItem);
	}

	return [null, null];
}

function resourcesFromItem (actor, id) {
	const item = actor.items.get(id);
	if (!item) {
		return [null, null];
	}

	if (item.obsidian.bestResource) {
		return [item.obsidian.bestResource.remaining, item.obsidian.bestResource.max];
	}

	const consumer = item.obsidian.collection.consume[0];
	if (consumer) {
		const [, , resource] = Effect.getLinkedResource(actor, consumer);
		if (resource) {
			return [resource.remaining, resource.max];
		}
	}

	const ammo = actor.items.get(item.data.flags.obsidian.ammo);
	if (ammo) {
		return [ammo.data.data.quantity, null];
	}

	if (item.data.quantity > 1) {
		return [item.data.data.quantity, null];
	}

	return [null, null];
}
