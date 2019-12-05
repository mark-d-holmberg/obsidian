export const preloadPartials = function () {
	return loadTemplates([
		'modules/obsidian/html/components/damage.html',
		'modules/obsidian/html/components/dc.html',
		'modules/obsidian/html/components/hit.html',
		'modules/obsidian/html/components/spell-list.html',
		'modules/obsidian/html/components/uses.html',
		'modules/obsidian/html/components/charges.html',
		'modules/obsidian/html/components/spell-card.html',
		'modules/obsidian/html/components/inventory.html',
		'modules/obsidian/html/components/weapon-notes.html',
		'modules/obsidian/html/components/tag-dropdown.html',
		'modules/obsidian/html/components/weapon.html',
		'modules/obsidian/html/components/effects/resource.html',
		'modules/obsidian/html/components/effects/attack.html',
		'modules/obsidian/html/components/effects/damage.html',
		'modules/obsidian/html/components/effects/save.html'
	]);
};

export const preloadTemplates = function () {
	return loadTemplates([
		'modules/obsidian/html/obsidian.html',
		'modules/obsidian/html/tabs/actions.html',
		'modules/obsidian/html/tabs/attacks.html',
		'modules/obsidian/html/tabs/sub-actions.html',
		'modules/obsidian/html/tabs/spells.html',
		'modules/obsidian/html/tabs/sub-spells.html',
		'modules/obsidian/html/tabs/equipment.html',
		'modules/obsidian/html/tabs/features.html',
		'modules/obsidian/html/tabs/sub-features.html',
		'modules/obsidian/html/tabs/notes.html',
		'modules/obsidian/html/tabs/effects.html'
	]);
};
