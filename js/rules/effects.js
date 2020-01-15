import {Prepare} from './prepare.js';

export function prepareEffects (actorData) {
	actorData.obsidian.attacks = [];
	actorData.obsidian.effects = new Map();
	actorData.obsidian.components = new Map();

	for (const item of actorData.items) {
		if (!item.flags || !item.flags.obsidian) {
			continue;
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
			consumers: [],
			actionable: [],
			scaling: []
		};

		let cls;
		if (flags.source && flags.source.type === 'class') {
			cls = actorData.obsidian.classes.find(cls => cls._id === flags.source.class);
		}

		for (let effectIdx = 0; effectIdx < effects.length; effectIdx++) {
			const effect = effects[effectIdx];
			actorData.obsidian.effects.set(effect.uuid, effect);
			effect.parentActor = actorData._id;
			effect.parentItem = item._id;
			effect.idx = effectIdx;
			effect.label = getEffectLabel(effect);

			const scalingComponent = effect.components.find(c => c.type === 'scaling');
			if (scalingComponent) {
				effect.isScaling = true;
				effect.selfScaling = scalingComponent.ref === effect.uuid;
				item.obsidian.scaling.push(effect);
			}

			let targetComponent;
			for (let componentIdx = 0; componentIdx < effect.components.length; componentIdx++) {
				const component = effect.components[componentIdx];
				actorData.obsidian.components.set(component.uuid, component);
				component.parentEffect = effect.uuid;
				component.idx = componentIdx;

				if (component.type === 'attack') {
					Prepare.calculateHit(component, data, cls);
					Prepare.calculateAttackType(flags, component);

					if (!effect.isScaling || effect.selfScaling) {
						item.obsidian.attacks.push(component);
					}
				} else if (component.type === 'damage'
					&& (!effect.isScaling || effect.selfScaling))
				{
					if (component.versatile) {
						item.obsidian.versatile.push(component);
					} else {
						item.obsidian.damage.push(component);
					}
				} else if (component.type === 'save') {
					Prepare.calculateSave(component, data, cls);
					if (!effect.isScaling || effect.selfScaling) {
						item.obsidian.saves.push(component);
					}
				} else if (component.type === 'resource') {
					Prepare.calculateResources(
						data, item, effect, component, actorData.obsidian.classes);
					item.obsidian.resources.push(component);

					if (flags.notes) {
						flags.notes.push(
							'<div class="obsidian-table-note-flex">'
								+ `<div data-roll="fx" data-uuid="${effect.uuid}" class="rollable">`
									+ effect.label
								+ `</div>: ${component.display}`
							+ '</div>');
					}
				} else if (component.type === 'target') {
					targetComponent = component;
					if (flags.notes && component.target === 'area' && !effect.isScaling) {
						flags.notes.push(
							`${component.distance} ${game.i18n.localize('OBSIDIAN.FeetAbbr')} `
							+ game.i18n.localize(`OBSIDIAN.Target-${component.area}`));
					}
				} else if (component.type === 'scaling') {
					effect.scalingComponent = component;
				} else if (component.type === 'consume') {
					if (component.target === 'this-item' || component.target === 'this-effect') {
						component.itemID = item._id;
					}

					if (component.target === 'this-effect') {
						component.ref = effect.uuid;
					}

					if (!effect.isScaling || effect.selfScaling) {
						item.obsidian.consumers.push(component);
					}
				}
			}

			if (targetComponent && targetComponent.target === 'individual') {
				effect.components
					.filter(c => c.type === 'attack')
					.forEach(atk => atk.targets = targetComponent.count);
			}

			if (!effect.isScaling || effect.selfScaling) {
				item.obsidian.actionable.push(effect);
			}
		}

		if (item.type === 'spell' && item.data.level === 0) {
			const cantripScaling =
				item.obsidian.scaling.find(effect => effect.scalingComponent.method === 'cantrip');

			if (cantripScaling) {
				// Cantrips are scaled up-front, not when rolled.
				const extra = Math.round((data.details.level.value + 1) / 6 + .5) - 1;
				if (extra > 0) {
					const targetComponent =
						cantripScaling.components.find(c => c.type === 'target');
					const damageComponents =
						cantripScaling.components.filter(c => c.type === 'damage');

					if (targetComponent) {
						item.obsidian.attacks.forEach(atk =>
							atk.targets += targetComponent.count * extra);
					} else if (damageComponents.length) {
						damageComponents.forEach(dmg => dmg.scaledDice = extra);
						item.obsidian.damage = item.obsidian.damage.concat(damageComponents);
					}
				}
			}
		}

		Prepare.calculateDamage(data, cls, item.obsidian.damage, item.obsidian.versatile);

		if (item.obsidian.attacks.length) {
			if (item.type !== 'weapon' || item.data.equipped) {
				actorData.obsidian.attacks =
					actorData.obsidian.attacks.concat(item.obsidian.attacks);
			}

			item.obsidian.bestAttack =
				item.obsidian.attacks.reduce((acc, atk) => atk.value > acc.value ? atk : acc);

			if (item.obsidian.bestAttack.targets > 1 && flags.notes) {
				flags.notes.push(
					`${game.i18n.localize('OBSIDIAN.Count')}: `
					+ item.obsidian.bestAttack.targets);
			}
		} else if (item.obsidian.damage.length) {
			const targetComponents =
				effects.filter(effect => !effect.isScaling || effect.selfScaling)
					.flatMap(effect => effect.components)
					.filter(c => c.type === 'target' && c.target === 'individual');

			if (targetComponents.length && flags.notes) {
				flags.notes.push(
					`${game.i18n.localize('OBSIDIAN.Count')}: ${targetComponents[0].count}`);
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
		}
	}
}

export function getEffectLabel (effect) {
	if (effect.name.length) {
		return effect.name;
	}

	return game.i18n.localize('OBSIDIAN.Unnamed');
}
