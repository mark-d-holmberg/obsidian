import {Schema} from '../data/schema.js';

export function addCreateObjectHooks () {
	Hooks.on('renderDialog', onRenderDialog);
}

export function convertObject (data) {
	if (data.type !== 'object') {
		return;
	}

	const damageDefenses = data.flags?.obsidian?.defenses?.damage || [];
	damageDefenses.push({level: 'imm', dmg: 'psn'}, {level: 'imm', dmg: 'psy'});
	setProperty(data, 'flags.obsidian.details.type', 'object');
	setProperty(data, 'flags.obsidian.defenses.damage', damageDefenses);
	data.type = 'npc';

	if (!data.flags.obsidian.version) {
		data.flags.obsidian.version = Schema.VERSION;
	}
}

function onRenderDialog (dialog, html) {
	// Slightly hacky detection for whether this is the 'create new actor'
	// dialog. Is there a better way?
	const select = html.find('select[name="type"]');
	const types = new Set(select.find('option').map((i, el) => el.value));

	if (!game.system.documentTypes.Actor.every(type => types.has(type))) {
		return;
	}

	select.append($(`<option value="object">${game.i18n.localize('OBSIDIAN.Object')}</option>`));
}
