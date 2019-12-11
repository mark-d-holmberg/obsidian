import {Obsidian} from './module/obsidian.js';
import {preloadPartials, preloadTemplates} from './templates.js';
import {loadSpellData} from './data.js';
import {restoreViewPins} from './dialogs/view.js';
import {runPatches} from './util/patch.js';
import {OBSIDIAN} from './rules/rules.js';
import {registerHandlebarHelpers} from './util/helpers.js';
import {registerHandlebarsExpr} from './util/helpers-expr.js';
import {ObsidianActor} from './module/actor.js';
import {ObsidianClassSheet} from './sheets/class.js';
import {ObsidianConsumableSheet} from './sheets/consumable.js';
import {ObsidianContainerSheet} from './sheets/container.js';
import {ObsidianFeatureSheet} from './sheets/feature.js';
import {ObsidianSpellSheet} from './sheets/spell.js';
import {ObsidianEffectSheet} from './sheets/effect.js';
import {Schema} from './module/schema.js';

runPatches();

const _init = async function () {
	CONFIG.Actor.entityClass = ObsidianActor;
	Actors.registerSheet('dnd5e', Obsidian, {types: ['character'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianClassSheet, {types: ['class'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianConsumableSheet, {types: ['consumable'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianContainerSheet, {types: ['backpack'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianFeatureSheet, {types: ['feat'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianSpellSheet, {types: ['spell'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianEffectSheet, {
		types: ['weapon', 'equipment'],
		makeDefault: true
	});

	// We need to set the game config first, before doing any async work
	// otherwise we yield execution and the game continues to initialise.
	registerHandlebarsExpr();
	registerHandlebarHelpers();
	await preloadPartials();
	await preloadTemplates();
};

let _initialising = null;

Hooks.once('init', function () {
	_initialising = _init();
});

Hooks.once('ready', async function () {
	let fontSheet = 'font';
	if (game.i18n.lang === 'ja') {
		fontSheet = 'ja';
	}

	const link = document.createElement('link');
	link.type = 'text/css';
	link.rel = 'stylesheet';
	link.href = `modules/obsidian/css/${fontSheet}.css`;
	document.getElementsByTagName('head')[0].appendChild(link);

	loadSpellData();

	await _initialising;
	restoreViewPins();
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

function enrichItemFlags (data) {
	if (!data.flags) {
		data.flags = {};
	}

	ObsidianClassSheet.enrichFlags(data);
	ObsidianConsumableSheet.enrichFlags(data);
	ObsidianContainerSheet.enrichFlags(data);
	ObsidianFeatureSheet.enrichFlags(data);
	ObsidianSpellSheet.enrichFlags(data);

	if (data.type === 'equipment') {
		data.flags.obsidian = mergeObject(Schema.Equipment, data.flags.obsidian || {});
	} else if (data.type === 'weapon') {
		data.flags.obsidian = mergeObject(Schema.Weapon, data.flags.obsidian || {});
	} else if (data.type === 'loot' || data.type === 'tool') {
		data.flags.obsidian = {};
	}
}

Hooks.on('preCreateItem', (constructor, data) => enrichItemFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => {
	enrichItemFlags(data);
	actor.linkClasses(data);
});

OBSIDIAN.notDefinedOrEmpty = function (obj) {
	return obj === undefined || obj === '';
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

Number.prototype.sgn = function () {
	return this < 0 ? `${this}` : `+${this}`;
};

Number.prototype.sgnex = function () {
	return this < 0 ? ` - ${this * -1}` : ` + ${this}`;
};
