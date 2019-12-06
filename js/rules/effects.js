import {Prepare} from './prepare.js';

export function prepareEffects (actorData, item) {
	if (!item.flags
		|| !item.flags.obsidian
		|| !item.flags.obsidian.effects
		|| !item.flags.obsidian.effects.length)
	{
		return;
	}

	const data = actorData.data;
	const flags = item.flags.obsidian;
	const effects = flags.effects;

	item.obsidian = {
		attacks: [],
		damage: [],
		versatile: []
	};

	for (const effect of effects) {
		for (const component of effect.components) {
			if (component.type === 'attack') {
				Prepare.calculateHit(component, data);
				item.obsidian.attacks.push(component);
			} else if (component.type === 'damage') {
				if (component.versatile) {
					item.obsidian.versatile.push(component);
				} else {
					item.obsidian.damage.push(component);
				}
			}
		}
	}

	Prepare.calculateDamage(data, null, item.obsidian.damage, item.obsidian.versatile);

	if (item.obsidian.attacks.length) {
		actorData.obsidian.attacks.push(item);
		item.obsidian.bestAttack =
			item.obsidian.attacks.reduce((acc, atk) => atk.value > acc.value ? atk : acc);
	}
}
