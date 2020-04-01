let dnd5eDrop;

export function addMacroHook () {
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
		|| !actor || actor.data.type === 'npc')
	{
		if (dnd5eDrop) {
			dnd5eDrop(bar, data, slot);
		}

		return;
	}

	let command;
	let name;

	const args = {
		actor: data.actorId,
		token: data.tokenID,
		scene: data.sceneID
	};

	if (data.type === 'obsidian-roll') {
		args.rollData = data.data;
		command = `OBSIDIAN.Items.rollMacro(${JSON.stringify(args)})`;

		switch (args.rollData.roll) {
			case 'tool':
				name = actor.data.flags.obsidian.skills.tools[args.rollData.tool].label;
				break;

			case 'skl':
				if (args.rollData.skl.startsWith('custom')) {
					const idx = Number(args.rollData.skl.split('.')[1]);
					name = actor.data.flags.obsidian.skills.custom[idx].label;
				} else {
					name = game.i18n.localize(`OBSIDIAN.Skill-${args.rollData.skl}`);
				}

				break;

			case 'abl': case 'save':
				if (args.rollData.abl === 'init') {
					name = game.i18n.localize(`OBSIDIAN.Check-init`);
					break;
				}

				const abl = args.rollData[args.rollData.roll];
				const rollTranslation =
					game.i18n.localize(
						`OBSIDIAN.${args.rollData.roll === 'abl' ? 'Check' : 'Save'}`);

				name = `${game.i18n.localize(`OBSIDIAN.Ability-${abl}`)} ${rollTranslation}`;
				break;
		}
	} else if (data.effectUUID) {
		args.effect = data.effectUUID;
		command = `OBSIDIAN.Items.effectMacro(${JSON.stringify(args)})`;

		const effect =
			data.data.flags.obsidian.effects.find(effect => effect.uuid === data.effectUUID);

		if (effect) {
			name = OBSIDIAN.notDefinedOrEmpty(effect.name) ? data.data.name : effect.name;
		}
	} else {
		args.item = data.data._id;
		command = `OBSIDIAN.Items.itemMacro(${JSON.stringify(args)})`;
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
		}, {renderSheet: false});
	}

	game.user.assignHotbarMacro(macro, slot);
	return false;
}
