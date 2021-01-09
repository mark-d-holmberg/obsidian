import {Schema} from './schema.js';

export function addCreateObjectHooks () {
	Hooks.on('renderDialog', onRenderDialog);
}

export function convertObject (data) {
	if (data.type !== 'object') {
		return;
	}

	data.type = 'npc';
	if (!data.flags) {
		data.flags = {};
	}

	if (!data.flags.obsidian) {
		data.flags.obsidian = {};
	}

	if (!data.flags.obsidian.defenses) {
		data.flags.obsidian.defenses = {};
	}

	if (!data.flags.obsidian.defenses.damage) {
		data.flags.obsidian.defenses.damage = [];
	}

	if (!data.flags.obsidian.details) {
		data.flags.obsidian.details = {};
	}

	data.flags.obsidian.details.type = 'object';
	data.flags.obsidian.defenses.damage.push(
		{level: 'imm', dmg: 'psn'},
		{level: 'imm', dmg: 'psy'});

	if (!data.flags.obsidian.version) {
		data.flags.obsidian.version = Schema.VERSION;
	}
}

function onRenderDialog (dialog, html) {
	// Slightly hacky detection for whether this is the 'create new actor'
	// dialog. Is there a better way?
	const select = html.find('select[name="type"]');
	const types = new Set(select.find('option').map((i, el) => el.value));

	if (!game.system.entityTypes.Actor.every(type => types.has(type))) {
		return;
	}

	select.append($(`<option value="object">${game.i18n.localize('OBSIDIAN.Object')}</option>`));
}
