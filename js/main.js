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
import {ObsidianEquipmentSheet} from './sheets/equipment.js';
import {ObsidianFeatureSheet} from './sheets/feature.js';
import {ObsidianSpellSheet} from './sheets/spell.js';
import {ObsidianWeaponSheet} from './sheets/weapon.js';

runPatches();

OBSIDIAN._init = async function () {
	CONFIG.Actor.entityClass = ObsidianActor;
	Actors.registerSheet('dnd5e', Obsidian, {types: ['character'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianClassSheet, {types: ['class'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianConsumableSheet, {types: ['consumable'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianContainerSheet, {types: ['backpack'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianEquipmentSheet, {types: ['equipment'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianFeatureSheet, {types: ['feat'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianSpellSheet, {types: ['spell'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianWeaponSheet, {types: ['weapon'], makeDefault: true});

	// We need to set the game config first, before doing any async work
	// otherwise we yield execution and the game continues to initialise.
	registerHandlebarsExpr();
	registerHandlebarHelpers();
	await preloadPartials();
	await preloadTemplates();
};

OBSIDIAN._initialising = null;

Hooks.once('init', function () {
	OBSIDIAN._initialising = OBSIDIAN._init();
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

	await OBSIDIAN._initialising;
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
	ObsidianClassSheet.enrichFlags(data);
	ObsidianConsumableSheet.enrichFlags(data);
	ObsidianContainerSheet.enrichFlags(data);
	ObsidianEquipmentSheet.enrichFlags(data);
	ObsidianFeatureSheet.enrichFlags(data);
	ObsidianSpellSheet.enrichFlags(data);
	ObsidianWeaponSheet.enrichFlags(data);
}

Hooks.on('preCreateItem', (constructor, data) => enrichItemFlags(data));
Hooks.on('preCreateOwnedItem', (actor, id, data) => {
	enrichItemFlags(data);
	actor.linkClasses(data);
});

OBSIDIAN.notDefinedOrEmpty = function (obj) {
	return obj === undefined || obj === '';
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
