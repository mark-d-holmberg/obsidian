import {Obsidian} from './module/obsidian.js';
import {preloadPartials, preloadTemplates} from './templates.js';
import {loadSpellData} from './data.js';
import {patchGetClassFeatures, runPatches} from './util/patch.js';
import {registerHandlebarHelpers} from './util/helpers.js';
import {registerHandlebarsExpr} from './util/helpers-expr.js';
import {ObsidianActor} from './module/actor.js';
import {ObsidianClassSheet} from './sheets/class.js';
import {ObsidianEffectSheet} from './sheets/effect.js';
import {addSettingsHook} from './rules/spell-lists.js';
import {Migrate} from './migration/migrate.js';
import {patchItem_prepareData} from './module/item.js';
import {addCompendiumContextMenuHook} from './module/compendium-convert.js';
import {addMacroHook, hotbarRender} from './module/macros.js';
import {addSocketListener} from './module/socket.js';
import {advanceDurations, initDurations} from './module/duration.js';
import {patchConditions} from './rules/conditions.js';
import {ObsidianNPC} from './module/npc.js';
import {checkVersion} from './migration/run.js';
import {refreshNPC} from './rules/npc.js';
import {addTransformHook} from './rules/transform.js';
import {sendTriggers} from './module/triggers.js';
import {updateApplyIcons} from './module/message.js';
import {registerSettings} from './module/settings.js';
import {ObsidianVehicle} from './module/vehicle.js';
import ObsidianTable from './module/tables.js';

runPatches();

Hooks.once('init', async function () {
	CONFIG.RollTable.entityClass = ObsidianTable;
	CONFIG.Actor.entityClass = ObsidianActor;
	Actors.registerSheet('dnd5e', Obsidian, {types: ['character'], makeDefault: true});
	Actors.registerSheet('dnd5e', ObsidianNPC, {types: ['npc'], makeDefault: true});
	Actors.registerSheet('dnd5e', ObsidianVehicle, {types: ['vehicle'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianClassSheet, {types: ['class'], makeDefault: true});
	Items.registerSheet('dnd5e', ObsidianEffectSheet, {
		types: ['weapon', 'equipment', 'consumable', 'backpack', 'feat', 'spell', 'tool', 'loot'],
		makeDefault: true
	});

	patchItem_prepareData();
	patchConditions();

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

	// Disable buggy auto class features until 0.9.9 fix released.
	if (isNewerVersion('0.99', game.system.data.version)) {
		patchGetClassFeatures();
	}

	registerSettings();
	addMacroHook();
	checkVersion();
	loadSpellData();
	addSocketListener();
	initDurations();
	addTransformHook();
});

Hooks.on('renderCompendium', (compendium, html) => {
	html.addClass('obsidian-compendium');
	html.find('.header-search > i').remove();
	html.find('.header-search')
		.append($('<i class="fas fa-search"></i>'))
		.append($('<span class="obsidian-clear-search">&times;</span>'));
	html.find('.header-search > span').click(evt => {
		evt.currentTarget.previousElementSibling.previousElementSibling.value = '';
		compendium._onFilterResults({currentTarget: {value: ''}, preventDefault: () => {}});
	});
});

Hooks.on('renderCompendiumDirectory', (compendium, html) => {
	html.find('.compendium-footer span')
		.each((i, el) => el.innerText = el.innerText.replace(/[)(]/g, ''));
});

Hooks.on('renderHotbar', hotbarRender);
Hooks.on('obsidian.actorsPrepared', () => ui.hotbar.render());
Hooks.on('updateOwnedItem', () => ui.hotbar.render());

addCompendiumContextMenuHook();
addSettingsHook();

function enrichActorFlags (data) {
	mergeObject(data, Migrate.convertActor(data));
}

function enrichItemFlags (data) {
	mergeObject(data, Migrate.convertItem(data));
}

Hooks.on('preCreateActor', data => enrichActorFlags(data));
Hooks.on('preCreateItem', data => enrichItemFlags(data));
Hooks.on('preCreateOwnedItem', (actor, data) => {
	enrichItemFlags(data);
	actor.linkClasses(data);
});

Hooks.on('updateCombat', async combat => {
	if (!game.user.isGM) {
		return;
	}

	sendTriggers(combat);
	await advanceDurations(combat);
	refreshNPC(combat);
});

document.addEventListener('click', evt => {
	// Click anywhere to clear the 'delete prompt' on delete icons.
	if (!evt.target.classList.contains('obsidian-delete')
		&& !evt.target.parentElement?.classList.contains('obsidian-delete'))
	{
		$('.obsidian-delete.obsidian-alert').removeClass('obsidian-alert');
	}

	// Remove the duration context menu if appropriate.
	const nav = evt.target.closest('nav');
	if (nav?.id !== 'obsidian-duration-menu') {
		$('#obsidian-duration-menu').remove();
		$('.context').removeClass('context');
	}
});

document.addEventListener('keydown', updateApplyIcons);
document.addEventListener('keyup', updateApplyIcons);
