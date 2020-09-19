import {OBSIDIAN} from '../global.js';
import {Rules} from './rules.js';
import {Rolls} from './rolls.js';

export function prepareNPC (flags, derived) {
	derived.details.tags = [];

	for (const [tag, val] of Object.entries(flags.details.tags)) {
		if (tag === 'custom' || !val) {
			continue;
		}

		derived.details.tags.push(game.i18n.localize(`OBSIDIAN.CreatureTag-${tag}`));
	}

	derived.details.tags = derived.tags.join(', ');
	if (!OBSIDIAN.notDefinedOrEmpty(flags.details.tags.custom)) {
		if (!OBSIDIAN.notDefinedOrEmpty(derived.details.tags)) {
			derived.details.tags += ', ';
		}

		derived.details.tags += flags.details.tags.custom;
	}

	prepareSpeed(flags, derived);
}

function prepareSpeed (flags, derived) {
	const speed = [];
	const feet = game.i18n.localize('OBSIDIAN.FeetAbbr');
	const hover = game.i18n.localize('OBSIDIAN.Hover').toLowerCase();
	const walk = flags.attributes.speed.walk?.override;

	if (!OBSIDIAN.notDefinedOrEmpty(walk)) {
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

	derived.attributes.speed = speed.join(', ');
}

export async function refreshNPC (combat) {
	const actor = combat.combatant?.actor;
	if (actor?.data.type !== 'npc') {
		return;
	}

	const itemUpdates = [];
	for (const item of actor.data.items) {
		if (!getProperty(item, 'flags.obsidian.effects.length')) {
			continue;
		}

		for (const effect of item.flags.obsidian.effects) {
			for (const component of effect.components) {
				if (component.type !== 'resource'
					|| component.recharge.time !== 'roll'
					|| component.remaining === component.max)
				{
					continue;
				}

				const recharge = Rolls.abilityRecharge(item, effect, component);
				Rolls.toChat(actor, recharge);

				if (recharge.flags.obsidian.addendum.success) {
					const updateKey =
						`flags.obsidian.effects.${effect.idx}`
						+ `.components.${component.idx}.remaining`;

					itemUpdates.push(
						OBSIDIAN.updateArrays(item, {
							_id: item._id,
							[`${updateKey}`]: component.max
						}));
				}
			}
		}
	}

	if (itemUpdates.length) {
		await OBSIDIAN.updateManyOwnedItems(actor, itemUpdates);
	}

	const legact = actor.data.data.resources.legact;
	if (!legact) {
		return;
	}

	if (legact.max && legact.value) {
		actor.update({'data.resources.legact.value': 0});
	}
}
