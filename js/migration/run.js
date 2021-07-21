import {Migrate} from './migrate.js';
import {Schema} from '../data/schema.js';

async function beginMigration (html) {
	html.find('.obsidian-migrate-buttons').css('display', 'none');
	html.find('.obsidian-migrate-progress').css('display', 'block');
	const bar = html.find('.obsidian-migrate-bar');

	let progress = 0;
	const progressInterval = setInterval(() => {
		progress++;
		if (progress > 100) {
			clearInterval(progressInterval);
			return;
		}

		bar.css('width', `${progress}%`);
	}, 1000);

	const migrationFailed = () => {
		clearInterval(progressInterval);
		bar.css('background-color', 'var(--obs-negative)');
		html.find('p').remove();
		html.find('.obsidian-migrate-box')
			.append(`<p>${game.i18n.localize('OBSIDIAN.MigrateFailed')}</p>`);
	};

	if (game.settings.get('obsidian', 'version') < 15) {
		// One time clear of all durations, and macro migration.
		try {
			await clearDurations();
			await migrateMacros();
		} catch (e) {
			console.error(e);
			migrationFailed();
			return;
		}
	}

	try {
		const updates = [];
		for (const item of game.items.contents) {
			console.debug(`Migrating Item '${item.name}'...`);
			const itemData = duplicate(item.toObject());
			Migrate.convertItem(itemData);
			updates.push(itemData);
		}

		console.debug('Persisting Item updates...');
		await Item.updateDocuments(updates, {diff: false, recursive: false});
	} catch (e) {
		console.error(e);
		migrationFailed();
		return;
	}

	try {
		const updates = [];
		for (const actor of game.actors.contents) {
			console.debug(`Migrating Actor '${actor.name}'...`);
			const actorData = duplicate(actor.toObject());
			Migrate.convertActor(actorData);
			updates.push(actorData);
		}

		console.debug('Persisting Actor updates...');
		await Actor.updateDocuments(updates, {diff: false, recursive: false});
	} catch (e) {
		console.error(e);
		migrationFailed();
		return;
	}

	try {
		for (const scene of game.scenes.contents) {
			const updates = [];
			console.debug(`Migrating scene '${scene.name}'...`);
			for (const token of scene.tokens.contents) {
				console.debug(`Migrating token '${token.name}'...`);
				const actorData = duplicate(token.toJSON().actorData);
				if (!Object.keys(actorData).length || !token.actor) {
					continue;
				}

				setProperty(
					actorData,
					'flags.obsidian.version',
					token.actor.getFlag('obsidian', 'version'));

				Migrate.convertActor(actorData);

				delete actorData.flags.obsidian.version;
				updates.push({_id: token.id, actorData});
			}

			console.debug('Persisting Scene updates...');
			await scene.updateEmbeddedDocuments('Token', updates, {diff: false});
		}
	} catch (e) {
		console.error(e);
		migrationFailed();
		return;
	}

	if (game.settings.get('obsidian', 'version') < 15) {
		// One time cleanup of old skill data.
		try {
			await cleanupSkills();
		} catch (e) {
			console.error(e);
			migrationFailed();
			return;
		}
	}

	await game.settings.set('obsidian', 'version', Schema.VERSION);
	location.reload();
}

async function clearDurations () {
	console.debug('Clearing durations...');

	const actorUpdates = [];
	for (const actor of game.actors.contents) {
		console.debug(`Clearing durations from '${actor.name}...'`);
		const effects = duplicate(actor.toObject().effects);
		const filtered = effects.filter(e => !e.flags?.obsidian?.duration);

		if (effects.length !== filtered.length) {
			actorUpdates.push({_id: actor.id, effects: filtered});
		}
	}

	await Actor.updateDocuments(actorUpdates, {diff: false, recursive: false});

	for (const scene of game.scenes.contents) {
		const updates = [];
		console.debug(`Clearing durations from '${scene.name}'...`);
		for (const token of scene.tokens.contents) {
			console.debug(`Clearing durations from '${token.name}'...`);
			const effects = duplicate(token.toJSON().actorData?.effects || []);
			const filtered = effects.filter(e => !e.flags?.obsidian?.duration);

			if (effects.length !== filtered.length) {
				updates.push({_id: token.id, 'actorData.effects': filtered});
			}
		}

		await scene.updateEmbeddedDocuments('Token', updates, {diff: false, recursive: false});
	}
}

async function cleanupSkills () {
	console.debug('Cleaning up skills...');

	const actorUpdates = [];
	for (const actor of game.actors.contents) {
		console.debug(`Cleaning up skills for '${actor.name}'...`);
		actorUpdates.push({
			_id: actor.id,
			'flags.obsidian.skills.-=custom': null,
			'flags.obsidian.skills.-=tools': null,
			'flags.obsidian.skills.-=value': null,
			'flags.obsidian.tools.-=custom': null
		});
	}

	await Actor.updateDocuments(actorUpdates, {diff: false});

	for (const scene of game.scenes.contents) {
		const updates = [];
		console.debug(`Cleaning up skills in '${scene.name}'...`);
		for (const token of scene.tokens.contents) {
			console.debug(`Cleaning up skills in ${token.name}...`);
			if (token.data.actorLink) {
				continue;
			}

			const obsidian = token.data.actorData?.flags?.obsidian;
			if (!obsidian) {
				continue;
			}

			const update = {_id: token.id};
			if (obsidian.skills || obsidian.tools) {
				updates.push(update);
			} else {
				continue;
			}

			if (obsidian.skills) {
				update['actorData.flags.obsidian.skills.-=custom'] = null;
				update['actorData.flags.obsidian.skills.-=tools'] = null;
			}

			if (obsidian.tools) {
				update['actorData.flags.obsidian.tools.-=custom'] = null;
			}
		}

		await scene.updateEmbeddedDocuments('Token', updates, {diff: false});
	}
}

async function migrateMacros () {
	console.debug('Migrating macros...');

	const macroUpdates = [];
	for (const macro of game.macros.contents) {
		const args = macro.getFlag('obsidian', 'args');
		if (!args) {
			continue;
		}

		console.debug(`Migrating macro '${macro.name}...'`);
		if (args.scene && args.token) {
			args.uuid = `Scene.${args.scene}.Token.${args.token}`;
		} else if (args.actor) {
			args.uuid = `Actor.${args.actor}`;
		}

		args['-=actor'] = null;
		args['-=scene'] = null;
		args['-=token'] = null;

		macroUpdates.push({_id: macro.id, 'flags.obsidian.args': args});
	}

	return Macro.updateDocuments(macroUpdates, {diff: false, recursive: false});
}

function launchMigrationDialog () {
	const html = $(`
		<section class="obsidian-bg">
			<div class="obsidian-migrate-container">
				<div class="obsidian-migrate-box">
					<h3>${game.i18n.localize('OBSIDIAN.MigrateTitle')}</h3>
					<p>${game.i18n.localize('OBSIDIAN.MigrateMessage')}</p>
					<p>${game.i18n.localize('OBSIDIAN.MigrateMessage2')}</p>
					<div class="obsidian-migrate-buttons">
						<button type="button" class="obsidian-btn-positive">
							<i class="fas fa-check-circle"></i>
							${game.i18n.localize('OBSIDIAN.MigrateStart')}
						</button>
						<button type="button" class="obsidian-btn-negative">
							<i class="fas fa-times-circle"></i>
							${game.i18n.localize('OBSIDIAN.MigrateCancel')}
						</button>
					</div>
				</div>
				<div class="obsidian-migrate-progress">
					<div class="obsidian-migrate-bar" style="width: 0;"></div>
				</div>
			</div>
		</section>
	`);

	if (!game.user.isGM) {
		html.find('p').remove();
		html.find('.obsidian-migrate-buttons').remove();
		html.find('.obsidian-migrate-box')
			.append($(`<p>${game.i18n.localize('OBSIDIAN.MigrateNotPermitted')}</p>`));
	}

	html.find('.obsidian-btn-positive').click(() => beginMigration(html));
	html.find('.obsidian-btn-negative').click(() => html.remove());
	$('body').append(html);
}

export function checkVersion () {
	game.settings.register('obsidian', 'version', {
		scope: 'world',
		type: Number,
		default: 0
	});

	if (!game.items.contents.length
		&& !game.actors.contents.length
		&& !game.scenes.contents.length)
	{
		// This is a new world, no need to migrate anything.
		game.settings.set('obsidian', 'version', Schema.VERSION);
		return;
	}

	const currentVersion = game.settings.get('obsidian', 'version');
	if (currentVersion < Schema.VERSION) {
		launchMigrationDialog();
	}
}
