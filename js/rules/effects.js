import {Prepare} from './prepare.js';

export function prepareEffects (actorData) {
	actorData.obsidian.attacks = [];
	actorData.obsidian.effects = new Map();
	actorData.obsidian.components = new Map();

	for (const item of actorData.items) {
		if (!item.flags || !item.flags.obsidian) {
			return;
		}

		const data = actorData.data;
		const flags = item.flags.obsidian;
		const effects = flags.effects || [];

		item.obsidian = {
			attacks: [],
			saves: [],
			damage: [],
			versatile: [],
			resources: [],
			scaling: null
		};

		for (let effectIdx = 0; effectIdx < effects.length; effectIdx++) {
			const effect = effects[effectIdx];
			const isScaling = effect.components.some(c => c.type === 'scaling');

			actorData.obsidian.effects.set(effect.uuid, effect);
			effect.parentActor = actorData._id;
			effect.parentItem = item.id;
			effect.idx = effectIdx;

			let targetComponent;
			for (let componentIdx = 0; componentIdx < effect.components.length; componentIdx++) {
				const component = effect.components[componentIdx];
				actorData.obsidian.components.set(component.uuid, component);
				component.parentEffect = effect.uuid;
				component.idx = componentIdx;

				if (component.type === 'attack') {
					Prepare.calculateHit(component, data);
					item.obsidian.attacks.push(component);
				} else if (component.type === 'damage' && !isScaling) {
					if (component.versatile) {
						item.obsidian.versatile.push(component);
					} else {
						item.obsidian.damage.push(component);
					}
				} else if (component.type === 'save') {
					Prepare.calculateSave(component, data);
					item.obsidian.saves.push(component);
				} else if (component.type === 'resource') {
					Prepare.calculateResources(
						item.id, item.idx, data, component, actorData.obsidian.classes);
					item.obsidian.resources.push(component);
				} else if (component.type === 'target') {
					targetComponent = component;
				}
			}

			if (targetComponent) {
				effect.components
					.filter(c => c.type === 'attack')
					.forEach(atk => atk.targets = targetComponent.count);
			}

			if (isScaling) {
				item.obsidian.scaling = effect;
			}
		}

		if (item.obsidian.scaling && item.obsidian.scaling.method === 'cantrip') {
			// Cantrips are scaled up-front, not when rolled.
			const extra = Math.round((data.details.level.value + 1) / 6 + .5) - 1;
			const targetComponent = item.obsidian.scaling.components.find(c => c.type === 'target');
			const damageComponents =
				item.obsidian.scaling.components.filter(c => c.type === 'damage');

			if (targetComponent) {
				item.obsidian.attacks.forEach(atk => atk.targets += targetComponent.count * extra);
			} else if (damageComponents.length) {
				item.obsidian.damage =
					item.obsidian.damage.concat(
						damageComponents.map(dmg => dmg.ndice *= (extra + 1)));
			}
		}

		Prepare.calculateDamage(data, null, item.obsidian.damage, item.obsidian.versatile);

		if (item.obsidian.attacks.length) {
			actorData.obsidian.attacks.push(item);
			item.obsidian.bestAttack =
				item.obsidian.attacks.reduce((acc, atk) => atk.value > acc.value ? atk : acc);

			if (item.obsidian.bestAttack.targets > 1 && flags.notes) {
				flags.notes.push(
					`${game.i18n.localize('OBSIDIAN.Count')}: `
					+ item.obsidian.bestAttack.targets);
			}
		}

		if (item.obsidian.saves.length) {
			item.obsidian.bestSave =
				item.obsidian.saves.reduce((acc, save) => save.value > acc.value ? save : acc);
		}

		if (item.obsidian.resources.length) {
			item.obsidian.bestResource =
				item.obsidian.resources.reduce((acc, resource) =>
					resource.max > acc.max ? resource: acc);

			if (flags.notes) {
				flags.notes.push(
					'<div class="obsidian-table-note-flex">'
					+ `${item.obsidian.bestResource.name}: ${item.obsidian.bestResource.display}`
					+'</div>');
			}
		}
	}
}
