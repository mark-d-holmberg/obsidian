import {Obsidian} from './module/obsidian.js';
import {preloadPartials, preloadTemplates} from './templates.js';
import {loadSpellData} from './data.js';
import {runPatches} from './util/patch.js';
import {OBSIDIAN} from './rules/rules.js';
import {registerHandlebarHelpers} from './util/helpers.js';
import {registerHandlebarsExpr} from './util/helpers-expr.js';
import {ObsidianActor} from './module/actor.js';
import {ObsidianClassSheet} from './sheets/class.js';
import {ObsidianEffectSheet} from './sheets/effect.js';
import {addSettingsHook} from './rules/spell-lists.js';
import {checkVersion, Migrate} from './module/migrate.js';
import {patchItem_prepareData} from './module/item.js';
import {addCompendiumContextMenuHook} from './module/compendium-convert.js';
import {ObsidianItems} from './rules/items.js';
import {addMacroHook} from './module/macros.js';
import {addSocketListener} from './module/socket.js';

runPatches();

Hooks.once('init', async function () {
	CONFIG.Actor.entityClass = ObsidianActor;
	Actors.registerSheet('dnd5e', Obsidian, {types: ['character'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianClassSheet, {types: ['class'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianEffectSheet, {
		types: ['weapon', 'equipment', 'consumable', 'backpack', 'feat', 'spell'],
		makeDefault: true
	});

	patchItem_prepareData();

	// We need to set the game config first, before doing any async work
	// otherwise we yield execution and the game continues to initialise.
	registerHandlebarsExpr();
	registerHandlebarHelpers();
	await preloadPartials();
	await preloadTemplates();
});

Hooks.once('ready', function () {
	let fontSheet = 'font';
	if (game.i18n.lang === 'ja') {
		fontSheet = 'ja';
	}

	const link = document.createElement('link');
	link.type = 'text/css';
	link.rel = 'stylesheet';
	link.href = `modules/obsidian/css/${fontSheet}.css`;
	document.getElementsByTagName('head')[0].appendChild(link);

	checkVersion();
	loadSpellData();
	addSocketListener();
});

Hooks.on('renderCompendium', (compendium, html) => {
	html.addClass('obsidian-compendium');
	html.find('.header-search > i').remove();
	html.find('.header-search')
		.append($('<i class="fas fa-search"></i>'))
		.append($('<span class="obsidian-clear-search">&times;</span>'));
	html.find('.header-search > span').click(evt => {
		evt.currentTarget.previousElementSibling.previousElementSibling.value = '';
		compendium._onSearch('');
	});
});

Hooks.on('renderCompendiumDirectory', (compendium, html) => {
	html.find('.compendium-footer span')
		.each((i, el) => el.innerText = el.innerText.replace(/[)(]/g, ''));
});

addCompendiumContextMenuHook();
addSettingsHook();
addMacroHook();

function enrichActorFlags (data) {
	if (data.type === 'character') {
		mergeObject(data, Migrate.convertActor(data));
	}
}

function enrichItemFlags (data) {
	mergeObject(data, Migrate.convertItem(data));
}

Hooks.on('preCreateActor', (collection, data) => enrichActorFlags(data));
Hooks.on('preCreateItem', (constructor, data) => enrichItemFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => {
	enrichItemFlags(data);
	actor.linkClasses(data);
});

Hooks.on('createOwnedItem', (actor, id, data) => {
	if (actor instanceof CONFIG.Actor.entityClass) {
		actor.importSpells(data);
	}
});

OBSIDIAN.notDefinedOrEmpty = function (obj) {
	return obj == null || obj === '';
};

OBSIDIAN.uuid = function () {
	return ([1e7]+-1e3+-4e3+-8e3+-1e11)
		.replace(/[018]/g, c =>
			(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
};

// Click anywhere to clear the 'delete prompt' on delete icons.
document.addEventListener('click', evt => {
	if (!evt.target.parentNode || evt.target.parentNode.nodeType !== Node.ELEMENT_NODE
		|| (!evt.target.className.startsWith('obsidian-delete')
			&& !evt.target.parentNode.className.startsWith('obsidian-delete')))
	{
		$('.obsidian-delete.obsidian-alert').removeClass('obsidian-alert');
	}
});

String.prototype.capitalise = function () {
	if (!this.length) {
		return this;
	}

	return this[0].toLocaleUpperCase() + this.substring(1);
};

String.prototype.format = function (...args) {
	let str = this.toString();
	if (args.length) {
		const type = typeof args[0];
		if (!['string', 'number'].includes(type)) {
			args = args[0];
		}

		for (const key in args) {
			str = str.replace(new RegExp(`\\{${key}\\}`, 'gi'), args[key]);
		}
	}

	return str;
};

Number.prototype.sgn = function () {
	return this < 0 ? `${this}` : `+${this}`;
};

Number.prototype.sgnex = function () {
	return this < 0 ? ` - ${this * -1}` : ` + ${this}`;
};

Array.range = function (start, end) {
	return [...Array(end - start + 1).keys()].map(i => i + start);
};

Array.prototype.last = function () {
	return this[this.length - 1];
};

OBSIDIAN.Items = ObsidianItems;
window.OBSIDIAN = OBSIDIAN;
