import {Migrate} from './migrate.js';
import {Schema} from '../module/schema.js';

async function beginMigration (html) {
	html.find('.obsidian-migrate-buttons').css('display', 'none');
	html.find('.obsidian-migrate-progress').css('display', 'block');
	const bar = html.find('.obsidian-migrate-bar');
	const totalMigrations =
		game.items.entities.length
		+ game.actors.entities.length
		+ game.scenes.entities.reduce((acc, scene) => acc + scene.data.tokens.length, 0);

	let item;
	let actor;
	let scene;
	let progress = 0;

	const updateProgress = () => {
		const pct = Math.round((progress / totalMigrations) * 100);
		bar.css('width', `${pct}%`);
	};

	const migrationFailed = () => {
		html.find('p').remove();
		html.find('.obsidian-migrate-box')
			.append(`<p>${game.i18n.localize('OBSIDIAN.MigrateFailed')}</p>`);
	};

	try {
		const updates = [];
		for (item of game.items.entities) {
			const update = Migrate.convertItem(duplicate(item.data));
			if (Object.keys(update).length > 0) {
				updates.push(update);
			}

			progress++;
			updateProgress();
		}

		await Item.update(updates);
	} catch (e) {
		console.error(item, e);
		migrationFailed();
		return;
	}

	try {
		const actorUpdates = [];
		for (actor of game.actors.entities) {
			const actorUpdate = Migrate.convertActor(duplicate(actor.data));
			if (Object.keys(actorUpdate).length > 0) {
				actorUpdates.push(actorUpdate);
			}
		}

		await Actor.update(actorUpdates);
	} catch (e) {
		console.error(actor, e);
		migrationFailed();
		return;
	}

	try {
		const updates = [];
		for (scene of game.scenes.entities) {
			const tokens = [];
			let requiresUpdate = false;

			for (const token of scene.data.tokens) {
				const items = [];
				tokens.push(token);

				if (token.actorLink) {
					continue;
				}

				const actor = game.actors.get(token.actorId);
				if (!actor) {
					continue;
				}

				if (token.actorData.items && token.actorData.items.length) {
					for (const item of token.actorData.items) {
						items.push(Migrate.convertItem(item));
					}

					token.actorData.items = items;
					requiresUpdate = true;
				}
			}

			if (requiresUpdate) {
				updates.push({_id: scene.data._id, tokens: tokens});
			}

			progress++;
			updateProgress();
		}

		await Scene.update(updates);
	} catch (e) {
		console.error(scene, e);
		migrationFailed();
		return;
	}

	await game.settings.set('obsidian', 'version', Schema.VERSION);
	location.reload();
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

	if (!game.items.entities.length
		&& !game.actors.entities.length
		&& !game.scenes.entities.length)
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
