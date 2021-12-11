import {preloadPartials, preloadTemplates} from './templates.js';
import {loadSpellData} from './data.js';
import {runPatches} from './util/patch.js';
import {registerHandlebarHelpers} from './util/helpers.js';
import {registerHandlebarsExpr} from './util/helpers-expr.js';
import {ObsidianActor} from './module/actor.js';
import {ObsidianClassSheet} from './sheets/class.js';
import {ObsidianEffectSheet} from './sheets/effect.js';
import {Migrate} from './migration/migrate.js';
import {patchItem5e} from './module/item.js';
import {addMacroHook, hotbarRender} from './module/macros.js';
import {addSocketListener} from './module/socket.js';
import {advanceDurations, initDurations} from './module/duration.js';
import {patchConditions} from './module/conditions.js';
import {ObsidianNPC} from './sheets/npc.js';
import {checkVersion} from './migration/run.js';
import {refreshNPC} from './data/npc.js';
import {addTransformHook} from './data/transform.js';
import {sendTriggers} from './module/triggers.js';
import {applyRollDragover, updateApplyIcons} from './module/message.js';
import {registerSettings} from './module/settings.js';
import {ObsidianVehicle} from './sheets/vehicle.js';
import ObsidianTable from './module/roll-table.js';
import {addLootSheetHook} from './module/compat/loot-sheet.js';
import {addCreateObjectHooks, convertObject} from './module/objects.js';
import {OBSIDIAN} from './global.js';
import {addTokenConfigHook} from './module/resources.js';
import {translateLabels} from './labels.js';
import ObsidianTableResult from './module/table-result.js';
import {ObsidianCharacter} from './sheets/obsidian.js';
import {extendPrimitives} from './util/primitives.js';
import {patchToken} from './module/token.js';

runPatches();
extendPrimitives();

Hooks.once('init', async function () {
	CONFIG.TableResult.documentClass = ObsidianTableResult;
	CONFIG.RollTable.documentClass = ObsidianTable;
	CONFIG.Actor.documentClass = ObsidianActor;
	Actors.registerSheet('dnd5e', ObsidianCharacter, {
		types: ['character'],
		makeDefault: true,
		label: 'OBSIDIAN.ActorSheet'
	});
	Actors.registerSheet('dnd5e', ObsidianNPC, {
		types: ['npc'],
		makeDefault: true,
		label: 'OBSIDIAN.NPCSheet'
	});
	Actors.registerSheet('dnd5e', ObsidianVehicle, {
		types: ['vehicle'],
		makeDefault: true,
		label: 'OBSIDIAN.VehicleSheet'
	});
	Items.registerSheet('dnd5e', ObsidianClassSheet, {
		types: ['class'],
		makeDefault: true,
		label: 'OBSIDIAN.ClassSheet'
	});
	Items.registerSheet('dnd5e', ObsidianEffectSheet, {
		types: ['weapon', 'equipment', 'consumable', 'backpack', 'feat', 'spell', 'tool', 'loot'],
		makeDefault: true,
		label: 'OBSIDIAN.ItemSheet'
	});

	patchItem5e();
	patchConditions();
	patchToken();

	// We need to set the game config first, before doing any async work
	// otherwise we yield execution and the game continues to initialise.
	registerHandlebarsExpr();
	registerHandlebarHelpers();
	await preloadPartials();
	await preloadTemplates();
});

Hooks.once('setup', translateLabels);

Hooks.once('ready', function () {
	let fontSheet = 'font';
	if (game.i18n.lang === 'ja') {
		fontSheet = 'ja';
	}

	if (game.i18n.lang === 'zh-TW') {
		fontSheet = 'zh-TW';
	}

	const link = document.createElement('link');
	link.type = 'text/css';
	link.rel = 'stylesheet';
	link.href = `modules/obsidian/css/${fontSheet}.css`;
	document.getElementsByTagName('head')[0].appendChild(link);

	registerSettings();
	addMacroHook();
	checkVersion();
	loadSpellData();
	addSocketListener();
	initDurations();
	addTransformHook();
	addLootSheetHook();
	addCreateObjectHooks();
	addTokenConfigHook();
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
	html.find('.compendium-pack').attr('draggable', 'true').each((i, el) =>
		el.ondragstart = evt => {
			const pack = game.packs.get(el.dataset.pack);
			evt.dataTransfer.setData('text/plain', JSON.stringify({
				type: 'Compendium',
				id: pack.collection,
				entity: pack.documentName
			}));
		});

	html.find('.compendium-footer span')
		.each((i, el) => el.innerText = el.innerText.replace(/[)(]/g, ''));
});

Hooks.on('renderActorDirectory', (directory, html) => {
	const actors = html.find('.actor');
	for (let i = 0; i < actors.length; i++) {
		const actor = actors[i];
		const name = actor.querySelector('.entity-name a');

		if (name?.textContent === OBSIDIAN.GENERIC_ACTOR) {
			actor.remove();
			return;
		}
	}
});

Hooks.on('renderHotbar', hotbarRender);
Hooks.on('obsidian.actorsPrepared', () => ui.hotbar.render());
Hooks.on('updateItem', () => ui.hotbar.render());
Hooks.on('updateToken', () => ui.hotbar.render());

function enrichActorFlags (data) {
	mergeObject(data, Migrate.convertActor(data));
}

function enrichItemFlags (data) {
	mergeObject(data, Migrate.convertItem(data));
}

Hooks.on('preCreateActor', actor => {
	convertObject(actor.data._source);
	enrichActorFlags(actor.data._source);
});

Hooks.on('preCreateItem', item => {
	enrichItemFlags(item.data._source);
	item.parent?.linkClasses(item.data._source);
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
document.addEventListener('dragenter', applyRollDragover);
