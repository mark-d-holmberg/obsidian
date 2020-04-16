import {OBSIDIAN} from '../global.js';
import {Rules} from './rules.js';

export function prepareNPC (actorData) {
	const flags = actorData.flags.obsidian;
	actorData.obsidian.tags = [];

	for (const [tag, val] of Object.entries(flags.details.tags)) {
		if (tag === 'custom' || !val) {
			continue;
		}

		actorData.obsidian.tags.push(game.i18n.localize(`OBSIDIAN.CreatureTag-${tag}`));
	}

	actorData.obsidian.tags = actorData.obsidian.tags.join(', ');
	if (!OBSIDIAN.notDefinedOrEmpty(flags.details.tags.custom)) {
		if (!OBSIDIAN.notDefinedOrEmpty(actorData.obsidian.tags)) {
			actorData.obsidian.tags += ', ';
		}

		actorData.obsidian.tags += flags.details.tags.custom;
	}

	prepareSpeed(actorData, flags);
}

function prepareSpeed (actorData, flags) {
	const speed = [];
	const feet = game.i18n.localize('OBSIDIAN.FeetAbbr');
	const hover = game.i18n.localize('OBSIDIAN.Hover').toLowerCase();
	const walk = flags.attributes.speed.walk?.override;

	if (walk) {
		speed.push(`${walk} ${feet}`);
	}

	for (const spd of Rules.SPEEDS) {
		const override = flags.attributes.speed[spd]?.override;
		if (spd === 'walk' || OBSIDIAN.notDefinedOrEmpty(override)) {
			continue;
		}

		let item = `${game.i18n.localize(`OBSIDIAN.SpeedAbbr-${spd}`)} ${override} ${feet}`;
		if (flags.attributes.speed[spd].hover) {
			item += ` (${hover})`;
		}

		speed.push(item);
	}

	actorData.obsidian.speedDisplay = speed.join(', ');
}
