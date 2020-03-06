import {Filters} from './filters.js';

function filterToggleable (actorData) {
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

			if ((flags.attunement && !item.data.attuned)
				|| (flags.equippable && !item.data.equipped)
				|| item.type === 'spell'
				|| effect.durationComponent)
			{
				continue;
			}

			for (const component of effect.components) {
				component.parentEffect = effect.uuid;
				if (component.type === 'roll-mod') {
					effect.mods.push(component);
				} else if (component.type === 'bonus') {
					effect.bonuses.push(component);
				} else if (component.type === 'filter') {
					effect.filters.push(component);
				}
			}
		}
	}

	return toggleable;
}

export function prepareFilters (actorData) {
	// Convert it to an array here so it doesn't get nuked when duplicated.
	actorData.obsidian.toggleable = Array.from(new Set(filterToggleable(actorData)).values());
	actorData.obsidian.filters = {
		mods: Filters.mods(actorData.obsidian.toggleable),
		bonuses: Filters.bonuses(actorData.obsidian.toggleable)
	};
}
