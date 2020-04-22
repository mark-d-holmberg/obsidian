import {Item5e} from '../../../../systems/dnd5e/module/item/entity.js';
import {Prepare} from '../rules/prepare.js';
import {Schema} from './schema.js';
import {spellNotes} from '../rules/spells.js';
import {OBSIDIAN} from '../global.js';

export function patchItem_prepareData () {
	Item5e.prototype.prepareData = (function () {
		const cached = Item5e.prototype.prepareData;
		return function (attackList, effectMap, componentMap, toggleList) {
			cached.apply(this, arguments);
			prepareEffects(this.actor, this.data, attackList, effectMap, componentMap, toggleList);
		};
	})();
}

export function getSourceClass (actorData, source) {
	if (source.type === 'class') {
		return actorData.obsidian.classes.find(cls => cls._id === source.class);
	} if (source.type === 'item') {
		const parent = actorData.obsidian.itemsByID.get(source.item);
		if (parent
			&& getProperty(parent, 'flags.obsidian.source')
			&& parent.flags.obsidian.source.type === 'class')
		{
			return actorData.obsidian.classes.find(cls =>
				cls._id === parent.flags.obsidian.source.class);
		}
	}
}

export function prepareEffects (actor, item, attackList, effectMap, componentMap) {
	if (!item.flags || !item.flags.obsidian || !actor) {
		return;
	}

	const actorData = actor.data;
	if (!actorData.flags
		|| !actorData.obsidian
		|| !actorData.flags.obsidian
		|| (actorData.flags.obsidian.version || 0) < Schema.VERSION)
	{
		return;
	}

	const data = actorData.data;
	const flags = item.flags.obsidian;
	const effects = flags.effects || [];
	flags.notes = [];

	if (item.type === 'equipment' && item.flags.obsidian.armour) {
		Prepare.armourNotes(item);
	}

	if (item.type === 'weapon') {
		Prepare.weaponNotes(item);
	}

	item.obsidian = {
		attacks: [],
		saves: [],
		damage: [],
		versatile: [],
		resources: [],
		consumers: [],
		producers: [],
		actionable: [],
		scaling: [],
		durations: []
	};

	let cls;
	if (flags.source) {
		cls = getSourceClass(actorData, flags.source);
	}

	for (let effectIdx = 0; effectIdx < effects.length; effectIdx++) {
		const effect = effects[effectIdx];
		if (effectMap) {
			effectMap.set(effect.uuid, effect);
		}

		effect.parentActor = actorData._id;
		effect.parentItem = item._id;
		effect.idx = effectIdx;
		effect.label = getEffectLabel(effect);

		const scalingComponent = effect.components.find(c => c.type === 'scaling');
		if (scalingComponent) {
			effect.isScaling = true;
			effect.selfScaling = scalingComponent.ref === effect.uuid;
			item.obsidian.scaling.push(effect);
		} else {
			effect.isScaling = false;
			effect.selfScaling = false;
			effect.scalingComponent = null;
		}

		if (effect.components.some(c => c.type === 'duration')) {
			item.obsidian.durations.push(effect);
		} else {
			effect.durationComponent = null;
		}

		let targetComponent;
		let isRollable = false;

		for (let componentIdx = 0; componentIdx < effect.components.length; componentIdx++) {
			const component = effect.components[componentIdx];
			if (componentMap) {
				componentMap.set(component.uuid, component);
			}

			component.parentEffect = effect.uuid;
			component.idx = componentIdx;

			if (component.type === 'attack') {
				Prepare.calculateHit(actorData, component, data, cls);
				Prepare.calculateAttackType(flags, component);

				if (!effect.isScaling || effect.selfScaling) {
					item.obsidian.attacks.push(component);
				}
			} else if (component.type === 'damage') {
				isRollable = true;
				Prepare.calculateDamage(actorData, component, data, cls);
				if (!effect.isScaling || effect.selfScaling) {
					if (component.versatile) {
						item.obsidian.versatile.push(component);
					} else {
						item.obsidian.damage.push(component);
					}
				}
			} else if (component.type === 'save') {
				isRollable = true;
				Prepare.calculateSave(actorData, item, component, data, cls);
				if (!effect.isScaling || effect.selfScaling) {
					item.obsidian.saves.push(component);
				}
			} else if (component.type === 'resource') {
				Prepare.calculateResources(
					data, item, effect, component, actorData.obsidian.classes);

				item.obsidian.resources.push(component);
				component.label =
					component.name.length ? component.name : game.i18n.localize('OBSIDIAN.Unnamed');

				flags.notes.push(
					'<div class="obsidian-table-note-flex">'
						+ `<div data-roll="fx" data-uuid="${effect.uuid}" class="rollable">`
							+ component.label
						+ `</div>: ${component.display}`
					+ '</div>');
			} else if (component.type === 'target') {
				isRollable = true;
				targetComponent = component;
				if (component.target === 'area' && !effect.isScaling) {
					flags.notes.push(
						`${component.distance} ${game.i18n.localize('OBSIDIAN.FeetAbbr')} `
						+ game.i18n.localize(`OBSIDIAN.Target-${component.area}`));
				}
			} else if (component.type === 'scaling') {
				effect.scalingComponent = component;
			} else if (component.type === 'duration') {
				isRollable = true;
				effect.durationComponent = component;
			} else if (component.type === 'expression') {
				isRollable = true;
			} else if (component.type === 'consume' || component.type === 'produce') {
				isRollable = true;
				if (component.calc === 'var') {
					component.fixed = 1;
				}

				if (component.target === 'this-item' || component.target === 'this-effect') {
					component.itemID = item._id;
				}

				if (!effect.isScaling || effect.selfScaling) {
					item.obsidian[`${component.type}rs`].push(component);
				}
			} else if (component.type === 'spells') {
				if (component.source === 'individual' && component.method === 'list') {
					const cls = actorData.obsidian.classes.find(cls => cls._id === component.class);
					component.spells.forEach(id => {
						const spell = actorData.obsidian.itemsByID.get(id);
						if (!spell) {
							return;
						}

						spell.flags.obsidian.visible = false;
						if (cls && getProperty(cls, 'flags.obsidian.spellcasting.spellList')) {
							cls.flags.obsidian.spellcasting.spellList.push(spell);
						}
					});
				} else if (component.source === 'list'
					&& getProperty(item, 'flags.obsidian.source.type') === 'class'
					&& OBSIDIAN.Data.SPELLS_BY_CLASS[component.list])
				{
					const cls = actorData.obsidian.classes.find(cls =>
						cls._id === item.flags.obsidian.source.class);

					if (!cls || !getProperty(cls, 'flags.obsidian.spellcasting.spellList')) {
						return;
					}

					const list = cls.flags.obsidian.spellcasting.spellList;
					const existing = new Set(list.map(spell => spell._id));

					cls.flags.obsidian.spellcasting.spellList =
						list.concat(
							OBSIDIAN.Data.SPELLS_BY_CLASS[component.list]
								.filter(spell => !existing.has(spell._id)));
				}

				if (component.source === 'individual' && component.method === 'item') {
					flags.notes.push(...component.spells
						.map(id => actorData.obsidian.itemsByID.get(id))
						.map(spell =>
							'<div class="obsidian-table-note-flex">'
							+ `<div data-roll="item" data-id="${spell._id}" class="rollable">`
							+ `${spell.name}</div></div>`));
				}
			}
		}

		if (targetComponent && targetComponent.target === 'individual') {
			effect.components
				.filter(c => c.type === 'attack')
				.forEach(atk => atk.targets = targetComponent.count);
		}

		if ((!effect.isScaling || effect.selfScaling)
			&& (!getProperty(effect, 'bonuses.length') || effect.durationComponent)
			&& (!getProperty(effect, 'mods.length') || effect.durationComponent))
		{
			item.obsidian.actionable.push(effect);
		}

		if (isRollable
			&& item.type !== 'spell'
			&& !effect.components.some(c => c.type === 'resource' || c.type === 'attack'))
		{
			flags.notes.push(
				'<div class="obsidian-table-note-flex">'
					+ `<div data-roll="fx" data-uuid="${effect.uuid}" class="rollable">`
						+ effect.label
					+ '</div>'
				+ '</div>');
		}
	}

	item.obsidian.actionable = item.obsidian.actionable.flatMap(action => {
		const spells = action.components.filter(c => c.type === 'spells');
		if (spells.length) {
			return spells.flatMap(spell =>
				spell.spells.map(id => actorData.obsidian.itemsByID.get(id)));
		} else {
			return action;
		}
	});

	if (item.type === 'spell') {
		spellNotes(item);
	}

	if (item.type === 'spell' && item.data.level === 0) {
		const cantripScaling =
			item.obsidian.scaling.find(effect => effect.scalingComponent.method === 'cantrip');

		if (cantripScaling) {
			// Cantrips are scaled up-front, not when rolled.
			const extra = Math.round((data.details.level + 1) / 6 + .5) - 1;
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

	if (item.obsidian.attacks.length) {
		if (attackList && (item.type !== 'weapon' || item.data.equipped)) {
			attackList.push(...item.obsidian.attacks);
		}

		item.obsidian.bestAttack =
			item.obsidian.attacks.reduce((acc, atk) => atk.value > acc.value ? atk : acc);

		if (item.obsidian.bestAttack.targets > 1) {
			flags.notes.push(
				`${game.i18n.localize('OBSIDIAN.Count')}: `
				+ item.obsidian.bestAttack.targets);
		}
	} else if (item.obsidian.damage.length) {
		const targetComponents =
			effects.filter(effect => !effect.isScaling || effect.selfScaling)
				.flatMap(effect => effect.components)
				.filter(c => c.type === 'target' && c.target === 'individual');

		if (targetComponents.length) {
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

export function getEffectLabel (effect) {
	if (effect.name.length) {
		return effect.name;
	}

	return game.i18n.localize('OBSIDIAN.Unnamed');
}
