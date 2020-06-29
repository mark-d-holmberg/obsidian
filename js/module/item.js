import Item5e from '../../../../systems/dnd5e/module/item/entity.js';
import {Prepare} from '../rules/prepare.js';
import {Schema} from './schema.js';
import {spellNotes} from '../rules/spells.js';
import {OBSIDIAN} from '../global.js';
import {Effect} from './effect.js';

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

const prepareComponents = {
	attack: function (actor, item, effect, component, cls) {
		Prepare.calculateHit(actor.data, item, component, cls);
		Prepare.calculateAttackType(item.flags.obsidian, component);
	},

	damage: function (actor, item, effect, component, cls) {
		Prepare.calculateDamage(actor.data, item, component, cls);
	},

	description: function (actor, item, effect, component) {
		component.display = TextEditor.enrichHTML(component.raw, {
			entities: true,
			links: true,
			rollData: actor.getRollData(),
			secrets: actor.owner
		});
	},

	save: function (actor, item, effect, component, cls) {
		Prepare.calculateSave(actor.data, item, component, cls);
	},

	resource: function (actor, item, effect, component) {
		Prepare.calculateResources(actor.data, item, effect, component);

		component.label =
			component.name.length ? component.name : game.i18n.localize('OBSIDIAN.Unnamed');

		item.flags.obsidian.notes.push(
			'<div class="obsidian-table-note-flex">'
				+ `<div data-roll="fx" data-uuid="${effect.uuid}" class="rollable">`
					+ component.label
				+ `</div>: ${component.display}`
			+ '</div>');
	},

	target: function (actor, item, effect, component) {
		if (component.target === 'area' && !effect.isLinked) {
			item.flags.obsidian.notes.push(
				`${component.distance} ${game.i18n.localize('OBSIDIAN.FeetAbbr')} `
				+ game.i18n.localize(`OBSIDIAN.Target-${component.area}`));
		}
	},

	consume: function (actor, item, effect, component) {
		if (component.calc === 'var') {
			component.fixed = 1;
		}

		if (component.target === 'this-item' || component.target === 'this-effect') {
			component.itemID = item._id;
		}
	},

	spells: function (actor, item, effect, component) {
		const actorData = actor.data;
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
			&& OBSIDIAN.Data.SPELLS_BY_CLASS
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
			item.flags.obsidian.notes.push(...component.spells
				.map(id => actorData.obsidian.itemsByID.get(id))
				.filter(_ => _)
				.map(spell =>
					'<div class="obsidian-table-note-flex">'
					+ `<div data-roll="item" data-id="${spell._id}" class="rollable">`
					+ `${spell.name}</div></div>`));
		}
	}
};

prepareComponents.produce = prepareComponents.consume;

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
		actionable: [],
		collection: {versatile: []}
	};

	Effect.metadata.components.forEach(c => item.obsidian.collection[c] = []);

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
		effect.applies = [];
		effect.isLinked = false;
		effect.eagerScaling = false;

		Effect.metadata.single.forEach(single => effect[`${single}Component`] = null);
		Effect.metadata.linked.forEach(linked => {
			const found = effect.components.find(c => c.type === linked);
			const bool = `is${linked.capitalise()}`;
			const self = `self${linked.capitalise()}`;
			const component = `${linked}Component`;
			effect[bool] = !!found;
			effect[self] = found && found.ref === effect.uuid;
			effect[component] = found;
			effect.isLinked |= effect[bool] && !effect[self];

			if (found) {
				item.obsidian.collection[linked].push(effect);
			}
		});

		for (let componentIdx = 0; componentIdx < effect.components.length; componentIdx++) {
			const component = effect.components[componentIdx];
			if (componentMap) {
				componentMap.set(component.uuid, component);
			}

			component.parentEffect = effect.uuid;
			component.idx = componentIdx;

			if (Effect.metadata.single.has(component.type)) {
				effect[`${component.type}Component`] = component;
			} else if (!effect.isLinked) {
				let collection = component.type;
				if (component.type === 'damage' && component.versatile) {
					collection = 'versatile';
				}

				item.obsidian.collection[collection].push(component);
			}

			const prepare = prepareComponents[component.type];
			if (prepare) {
				prepare(actor, item, effect, component, cls);
			}
		}

		if (effect.targetComponent && effect.targetComponent.target === 'individual') {
			effect.components
				.filter(c => c.type === 'attack')
				.forEach(atk => atk.targets = effect.targetComponent.count);
		}

		if (!effect.isLinked && !effect.components.some(c => Effect.metadata.active.has(c.type))) {
			item.obsidian.actionable.push(effect);
		}

		const isRollable =
			effect.selfApplied || effect.components.some(c => Effect.metadata.rollable.has(c.type));

		if (isRollable
			&& item.type !== 'spell'
			&& !effect.components.some(c =>
				c.type === 'resource'
				|| c.type === 'attack'
				|| (c.type === 'spells' && c.source === 'individual' && c.method === 'item')))
		{
			flags.notes.push(
				'<div class="obsidian-table-note-flex">'
					+ `<div data-roll="fx" data-uuid="${effect.uuid}" class="rollable">`
						+ effect.label
					+ '</div>'
				+ '</div>');
		}
	}

	item.obsidian.collection.applied.forEach(e =>
		effectMap?.get(e.appliedComponent.ref)?.applies.push(e.uuid));

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

	if (item.obsidian.collection.scaling.some(Effect.isEagerScaling)) {
		let scaledAmount = 0;
		const component = item.obsidian.collection.scaling[0].scalingComponent;

		switch (component.method) {
			case 'level': scaledAmount = data.details.level; break;
			case 'cantrip': scaledAmount = Math.round((data.details.level + 1) / 6 + .5) - 1; break;
			case 'class':
				const cls = actorData.obsidian.itemsByID.get(component.class);
				scaledAmount = cls.data.levels;
				break;
		}

		effects.filter(effect => !effect.isLinked).forEach(effect => {
			const scaling = Effect.getScaling(actor, effect, scaledAmount);
			if (!scaling) {
				return;
			}

			effect.eagerScaling = {mode: scaling.mode, effect: scaling.effect.uuid};
			const targetComponent = scaling.effect.components.find(c => c.type === 'target');
			const damageComponents = scaling.effect.components.filter(c => c.type === 'damage');

			if (targetComponent) {
				effect.components
					.filter(c => c.type === 'attack')
					.forEach(atk =>
						atk.targets =
							Effect.scaleConstant(
								scaling, scaledAmount, atk.targets, targetComponent.count));
			}

			damageComponents.forEach(dmg => {
				if (dmg.calc === 'fixed') {
					const constant = dmg.rollParts.find(part => part.constant);
					if (constant) {
						constant.mod = Effect.scaleConstant(scaling, scaledAmount, 0, constant.mod);
						dmg.mod = dmg.rollParts.reduce((acc, part) => acc + part.mod, 0);
					}
				} else {
					dmg.scaledDice = Effect.scaleConstant(scaling, scaledAmount, 0, dmg.ndice);
					dmg.scaledCrit =
						Effect.scaleConstant(scaling, scaledAmount, 0, dmg.derived?.ncrit || 0);
				}
			});

			if (damageComponents.length) {
				if (scaling.mode === 'scaling') {
					item.obsidian.collection.damage.push(...damageComponents);
				} else {
					const oldComponents =
						new Set(effect.components.filter(c => c.type === 'damage'));

					item.obsidian.collection.damage =
						item.obsidian.collection.damage
							.filter(c => !oldComponents.has(c))
							.concat(damageComponents);
				}
			}
		});
	}

	if (item.obsidian.collection.attack.length) {
		if (attackList
			&& (item.type !== 'weapon' || item.data.equipped)
			&& (item.type !== 'spell' || item.flags.obsidian.visible))
		{
			attackList.push(...item.obsidian.collection.attack);
		}

		item.obsidian.bestAttack =
			item.obsidian.collection.attack.reduce((acc, atk) => atk.value > acc.value ? atk : acc);

		if (item.obsidian.bestAttack.targets > 1) {
			flags.notes.push(
				`${game.i18n.localize('OBSIDIAN.Count')}: `
				+ item.obsidian.bestAttack.targets);
		}
	} else if (item.obsidian.collection.damage.length) {
		const targetComponents =
			effects.filter(effect => !effect.isLinked)
				.flatMap(effect => effect.components)
				.filter(c => c.type === 'target' && c.target === 'individual');

		if (targetComponents.length) {
			flags.notes.push(
				`${game.i18n.localize('OBSIDIAN.Count')}: ${targetComponents[0].count}`);
		}
	}

	if (item.obsidian.collection.save.length) {
		item.obsidian.bestSave =
			item.obsidian.collection.save.reduce((acc, save) =>
				save.value > acc.value ? save : acc);
	}

	if (item.obsidian.collection.resource.length) {
		item.obsidian.bestResource =
			item.obsidian.collection.resource.reduce((acc, resource) =>
				resource.max > acc.max ? resource: acc);
	}
}

export function getEffectLabel (effect) {
	if (effect.name.length) {
		return effect.name;
	}

	return game.i18n.localize('OBSIDIAN.Unnamed');
}
