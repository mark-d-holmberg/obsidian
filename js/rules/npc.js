import {OBSIDIAN} from '../global.js';
import {Rules} from './rules.js';
import {Rolls} from './rolls.js';

export function prepareNPC (flags, derived) {
	derived.details.tags = [];

	for (const [tag, val] of Object.entries(flags.details.tags)) {
		if (tag === 'custom' || !val) {
			continue;
		}

		derived.details.tags.push(game.i18n.localize(`OBSIDIAN.CreatureTag.${tag}`));
	}

	derived.details.tags = derived.details.tags.join(', ');
	if (!OBSIDIAN.notDefinedOrEmpty(flags.details.tags.custom)) {
		if (!OBSIDIAN.notDefinedOrEmpty(derived.details.tags)) {
			derived.details.tags += ', ';
		}

		derived.details.tags += flags.details.tags.custom;
	}
}

export function prepareNPCHD (data, flags, derived) {
	const size = data.traits.size;
	const conMod = data.abilities.con.mod;
	const maxHD = flags.attributes.hd.max || 0;

	derived.attributes.hd = {
		die: Rules.NPC_SIZE_HD[size],
		const: maxHD * conMod
	};
}

export function prepareSpeed (data, derived) {
	const speed = [];
	const feet = game.i18n.localize('OBSIDIAN.FeetAbbr');
	const hover = game.i18n.localize('OBSIDIAN.Hover').toLowerCase();
	const walk = derived.attributes.speed.walk || 0;
	speed.push(`${walk} ${feet}`);

	for (const spd of Rules.SPEEDS) {
		const value = derived.attributes.speed[spd];
		if (spd === 'walk' || !value) {
			continue;
		}

		let display = `${game.i18n.localize(`OBSIDIAN.SpeedAbbr.${spd}`)} ${value} ${feet}`;
		if (spd === 'fly' && data.attributes.movement.hover) {
			display += ` (${hover})`;
		}

		speed.push(display);
	}

	derived.attributes.speed.display = speed.join(', ');
}

export async function refreshNPC (combat) {
	const actor = combat.combatant?.actor;
	if (actor?.type !== 'npc') {
		return;
	}

	const itemUpdates = [];
	for (const item of actor.items) {
		if (item.getFlag('obsidian', 'effects.length')) {
			continue;
		}

		for (const effect of item.data.flags.obsidian.effects) {
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
						OBSIDIAN.updateArrays(item.data._source, {
							_id: item.id,
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
