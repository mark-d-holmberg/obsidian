import {OBSIDIAN} from '../global.js';
import {Config} from './config.js';
import {Rolls} from '../module/rolls.js';

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
		die: Config.NPC_SIZE_HD[size],
		const: maxHD * conMod
	};
}

export function prepareSpeed (data) {
	data.attributes.movement.walk ??= 0;
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
