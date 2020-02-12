export function addMacroHook () {
	Hooks.on('hotbarDrop', onHotbarDrop);
}

async function onHotbarDrop (bar, data, slot) {
	if (data.type !== 'ObsidianItem' || !getProperty(data.data, 'flags.obsidian.effects')) {
		return;
	}

	let command;
	let name;

	if (data.effectUUID) {
		command = `OBSIDIAN.Items.effectMacro('${data.actorID}', '${data.effectUUID}')`;
		const effect =
			data.data.flags.obsidian.effects.find(effect => effect.uuid === data.effectUUID);

		if (effect) {
			name = OBSIDIAN.notDefinedOrEmpty(effect.name) ? data.data.name : effect.name;
		}
	} else {
		command = `OBSIDIAN.Items.itemMacro('${data.actorID}', '${data.data._id}')`;
		name = data.data.name;
	}

	let macro =
		game.macros.entities.find(macro => macro.name === name && macro.command === command);

	if (!macro) {
		macro = await Macro.create({
			name: name,
			type: 'script',
			img: data.data.img,
			command: command
		}, {displaySheet: false});
	}

	game.user.assignHotbarMacro(macro, slot);
	return false;
}
