export function filterToggleable (actorData) {
	const toggleable = [];
	for (const item of actorData.items) {
		if (!getProperty(item, 'flags.obsidian.effects.length')) {
			continue;
		}

		const flags = item.flags.obsidian;
		for (const effect of flags.effects) {
			actorData.obsidian.effects.set(effect.uuid, effect);
			effect.parentItem = item._id;
			effect.mods = [];
			effect.bonuses = [];
			effect.filters = [];

			for (const component of effect.components) {
				component.parentEffect = effect.uuid;
				if (component.type === 'roll-mod') {
					effect.mods.push(component);
					if (!flags.equippable || item.data.equipped) {
						toggleable.push(effect);
					}
				} else if (component.type === 'bonus') {
					effect.bonuses.push(component);
					if (!flags.equippable || item.data.equipped) {
						toggleable.push(effect);
					}
				} else if (component.type === 'filter') {
					effect.filters.push(component);
				}
			}
		}
	}

	return toggleable;
}
