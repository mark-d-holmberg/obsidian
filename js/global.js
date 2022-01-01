import {ObsidianItems} from './module/items.js';
import {Schema} from './data/schema.js';
import {Config} from './data/config.js';
import {Migrate} from './migration/migrate.js';

export const OBSIDIAN = {};
OBSIDIAN.Items = ObsidianItems;
OBSIDIAN.Schema = Schema;
OBSIDIAN.Config = Config;
OBSIDIAN.Migrate = Migrate;
OBSIDIAN.Labels = {};
OBSIDIAN.GENERIC_ACTOR = '_OBSIDIAN_GenericActor';

OBSIDIAN.notDefinedOrEmpty = function (obj) {
	return obj == null || obj === '';
};

OBSIDIAN.uuid = function () {
	return ([1e7]+-1e3+-4e3+-8e3+-1e11)
		.replace(/[018]/g, c =>
			(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
};

OBSIDIAN.isMigrated = function () {
	if (!game.settings?.settings.has('obsidian.version')) {
		return false;
	}

	const moduleVersion = game.settings.get('obsidian', 'version');
	return moduleVersion === undefined || moduleVersion >= Schema.VERSION;
};

OBSIDIAN.getFont = function () {
	let fontSheet = 'font';
	if (game.i18n.lang === 'ja') {
		fontSheet = 'ja';
	}

	if (game.i18n.lang === 'zh-TW') {
		fontSheet = 'zh-TW';
	}

	return `modules/obsidian/css/${fontSheet}.css`;
};

function cloneWithObject (original, source = true) {
	// Perform a deepClone but attempt to call toObject on complex objects
	// instead of returning the original instance.
	if (typeof original !== 'object' || original == null) {
		return original;
	}

	if (original instanceof Array) {
		return original.map(x => cloneWithObject(x, source));
	}

	if (original instanceof Date) {
		return new Date(original);
	}

	if (original.constructor !== Object) {
		if (typeof original.toObject === 'function') {
			return cloneWithObject(original.toObject(source), source);
		}

		return original;
	}

	const clone = {};
	for (const k of Object.keys(original)) {
		clone[k] = cloneWithObject(original[k], source);
	}

	return clone;
}

window.OBSIDIAN = OBSIDIAN;
window.cloneWithObject = cloneWithObject;
