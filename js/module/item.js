import Item5e from '../../../../systems/dnd5e/module/item/entity.js';
import {Prepare} from '../rules/prepare.js';
import {OBSIDIAN} from '../global.js';
import {Effect} from './effect.js';
import {Filters} from '../rules/filters.js';
import {cssIconHexagon} from '../util/html.js';
import {Rules} from '../rules/rules.js';
import {Schema} from './schema.js';
import {Migrate} from '../migration/migrate.js';

export function patchItem_prepareData () {
	Item5e.prototype.prepareData = (function () {
		const cached = Item5e.prototype.prepareData;
		return function () {
			cached.apply(this, arguments);
			prepareData(this);
			prepareEffects(this);
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

function prepareData (item) {
	if (!item.data.flags?.obsidian || (item.data.flags.obsidian.version || 0) < Schema.VERSION) {
		Migrate.convertItem(item.data, item.actor?.data);
	}

	if (!item.data.obsidian) {
		item.data.obsidian = {};
	}

	const data = item.data.data;
	const flags = item.data.flags.obsidian;
	const derived = item.data.obsidian;
	derived.actionable = [];
	derived.attributes = {};
	derived.collection = {versatile: []};
	derived.notes = [];
	Effect.metadata.components.forEach(c => derived.collection[c] = []);

	const prepare = prepareItem[item.data.type];
	if (prepare) {
		prepare(item, data, flags, derived);
	}
}

const prepareItem = {
	backpack: function (item, data, flags, derived) {
		if (flags.currency) {
			const currencyWeight =
				Object.values(flags.currency).reduce((acc, currency) => acc + currency, 0)
				* Rules.COIN_WEIGHT;

			derived.carriedWeight += currencyWeight;
		}
	},

	'class': function (item, data, flags, derived) {
		data.levels = Number(data.levels);
		derived.label =
			item.name === 'custom'
				? flags.custom
				: game.i18n.localize(`OBSIDIAN.Class-${item.name}`);

		if (!flags.spellcasting) {
			return;
		}

		if (data.spellcasting === 'none') {
			data.spellcasting = Rules.CLASS_SPELL_PROGRESSION[item.name] || 'none';
		}

		if (flags.spellcasting.preparation === undefined) {
			flags.spellcasting.preparation = Rules.CLASS_SPELL_PREP[item.name];
		}

		if (flags.spellcasting.rituals === undefined) {
			flags.spellcasting.rituals = Rules.CLASS_RITUALS[item.name] || 'none';
		}

		derived.spellcasting = duplicate(flags.spellcasting);
		const spellcasting = derived.spellcasting;
		const levels = data.levels;

		spellcasting.list = item.name === 'custom' ? flags.custom : item.name;
		spellcasting.spellList = [];

		if (OBSIDIAN.Data.SPELLS_BY_CLASS && OBSIDIAN.Data.SPELLS_BY_CLASS[spellcasting.list]) {
			const originalList = OBSIDIAN.Data.SPELLS_BY_CLASS[spellcasting.list];
			spellcasting.spellList = [].concat(originalList);
		}

		if (spellcasting.spell === undefined) {
			spellcasting.spell = Rules.CLASS_SPELL_MODS[item.name];
		}

		if (!OBSIDIAN.notDefinedOrEmpty(spellcasting.spell) && item.isOwned) {
			const actorData = item.actor.data.data;
			const mod = actorData.abilities[spellcasting.spell].mod;
			spellcasting.mod = mod;
			spellcasting.attack = mod + actorData.attributes.prof;
			spellcasting.save = mod + actorData.attributes.prof + 8;
		}

		const spellsKnown = Rules.SPELLS_KNOWN_TABLE[item.name];
		if (spellsKnown !== undefined) {
			spellcasting.maxKnown = spellsKnown.known[levels - 1];
			spellcasting.maxCantrips = spellsKnown.cantrips[levels - 1];
			if (spellcasting.maxCantrips === undefined) {
				spellcasting.maxCantrips = spellsKnown.cantrips[spellsKnown.cantrips.length - 1];
			}
		}

		if (spellcasting.preparation === 'prep') {
			spellcasting.maxPrepared = spellcasting.mod || 0;
			switch (data.spellcasting) {
				case 'third': spellcasting.maxPrepared += Math.floor(levels / 3); break;
				case 'half': case 'artificer': spellcasting.maxPrepared += Math.floor(levels / 2); break;
				case 'full': spellcasting.maxPrepared += levels; break;
			}
		}
	},

	equipment: function (item, data, flags, derived) {
		if (item.isOwned && flags.subtype === 'vehicle') {
			derived.display = TextEditor.enrichHTML(data.description.value || '', {
				entities: false,
				links: false,
				rollData: item.actor.getRollData(),
				secrets: item.actor.owner
			});
		}

		if (!flags.armour) {
			return;
		}

		if (data.armor.type === 'shield') {
			derived.notes.push(
				`${data.armor.value.sgn()} ${game.i18n.localize('OBSIDIAN.ACAbbr')}`);
		} else {
			derived.notes.push(
				`${game.i18n.localize('OBSIDIAN.ACAbbr')} ${data.armor.value.baseAC}`);

			if (!OBSIDIAN.notDefinedOrEmpty(data.strength)) {
				derived.notes.push(
					`${game.i18n.localize('OBSIDIAN.AbilityAbbr-str')} ${data.strength}`);
			}

			if (data.stealth) {
				derived.notes.push(`
					<div class="obsidian-table-note-flex">
						${game.i18n.localize('OBSIDIAN.Skill-ste')}
						${cssIconHexagon('OBSIDIAN.DisadvantageAbbr', false)}
					</div>
				`);
			}
		}
	},

	feat: function (item, data, flags, derived) {
		if (!item.isOwned || !item.actor.data.obsidian) {
			return;
		}

		if (flags.source.type === 'class') {
			const cls = item.actor.data.obsidian.itemsByID.get(flags.source.class);
			derived.source = {className: cls?.obsidian.label};
		}

		// Check CONFIG is ready first.
		try {
			CONFIG.JournalEntry.entityClass.collection;
		} catch {
			return;
		}

		derived.display = TextEditor.enrichHTML(data.description.value || '', {
			entities: true,
			links: true,
			rollData: item.actor.getRollData(),
			secrets: item.actor.owner
		});
	},

	spell: function (item, data, flags, derived) {
		derived.source = {display: ''};

		if (OBSIDIAN.notDefinedOrEmpty(flags.time.n)) {
			flags.time.n = 1;
		} else {
			flags.time.n = Number(flags.time.n);
		}

		if (flags.components.m && data.materials.value.length) {
			derived.notes.push(
				`${game.i18n.localize('OBSIDIAN.MaterialAbbr')}: ${data.materials.value}`);
		}

		if (flags.time.type === 'react' && flags.time.react.length > 0) {
			derived.notes.push(
				`${game.i18n.localize('OBSIDIAN.CastTimeAbbr-react')}}: ${flags.time.react}`);
		}

		derived.components =
			Object.entries(flags.components)
				.filter(([, val]) => val)
				.map(([key,]) => Rules.SPELL_COMPONENT_MAP[key])
				.filter(_ => _)
				.map(s => game.i18n.localize(`OBSIDIAN.${s}Abbr`))
				.join(', ');

		let cls;
		if (flags.source === undefined) {
			derived.source.display = game.i18n.localize('OBSIDIAN.Class-custom');
		} else if (flags.source.type === 'custom') {
			derived.source.display = flags.source.custom;
		} else if (flags.source.type === 'class' && item.isOwned && item.actor.data.obsidian) {
			cls = item.actor.data.obsidian.itemsByID.get(flags.source.class);
			derived.source.display = cls?.obsidian.label;
		}

		if (cls) {
			const spellcasting = cls.obsidian.spellcasting;
			if (data.level === 0) {
				flags.known = true;
				derived.visible = true;
			} else if (spellcasting.preparation === 'known') {
				if (flags.known === undefined) {
					flags.known = true;
				}

				derived.visible = flags.known;
			} else if (spellcasting.preparation === 'prep') {
				if (flags.prepared === undefined) {
					flags.prepared = true;
				}

				derived.visible = flags.prepared;
			} else if (spellcasting.preparation === 'book') {
				if (flags.book === undefined) {
					flags.book = true;
				}

				if (flags.prepared === undefined) {
					flags.prepared = false;
				}

				derived.visible = flags.book && flags.prepared;
			}

			if (data.components.ritual) {
				derived.visible = derived.visible || spellcasting.rituals === 'book';
			}
		} else {
			derived.visible = true;
		}
	},

	weapon: function (item, data, flags, derived) {
		if (flags.type === 'melee') {
			derived.attributes.reach = 5;
			if (flags.tags.reach) {
				derived.attributes.reach += 5;
			}
		}

		if (flags.tags.ammunition && item.isOwned && item.actor.data.obsidian) {
			derived.ammo = `
				<select data-name="items.${item.data.idx}.flags.obsidian.ammo.id">
					<option value="" ${OBSIDIAN.notDefinedOrEmpty(flags.ammo) ? 'selected' : ''}>
						${game.i18n.localize('OBSIDIAN.AtkTag-ammunition')}
					</option>
					${item.actor.data.obsidian.ammo.map(ammo =>
						`<option value="${ammo._id}" ${ammo._id === flags.ammo ? 'selected': ''}>
							${ammo.name}
						</option>`)}
				</select>
			`;
		}

		if (flags.category) {
			derived.notes.push(game.i18n.localize(`OBSIDIAN.WeaponCat-${flags.category}`));
		}

		if (flags.magical) {
			derived.notes.push(game.i18n.localize('OBSIDIAN.Magical'));
		}

		derived.notes.push(...Object.entries(flags.tags).map(([tag, val]) => {
			if (tag === 'custom' && val.length) {
				return val;
			}

			if (!val) {
				return null;
			}

			if (tag === 'ammunition') {
				return derived.ammo;
			}

			return game.i18n.localize(`OBSIDIAN.AtkTag-${tag}`);
		}).filter(tag => tag != null));

		derived.display = TextEditor.enrichHTML(data.description.value || '', {
			entities: false,
			links: false,
			rollData: item.actor?.getRollData(),
			secrets: !!item.actor?.owner
		});
	}
};

const prepareComponents = {
	attack: function (actor, item, effect, component, cls) {
		Prepare.calculateHit(actor?.data, item, component, cls);
		Prepare.calculateAttackType(item.flags.obsidian, component);
	},

	check: function (actor, item, effect, component, cls) {
		let pred = () => () => false;
		if (component.calc === 'formula' && component.ability === 'spell') {
			pred = () => Filters.appliesTo.spellDCs;
		}

		Prepare.calculateDC(actor?.data, item, component, cls, pred);
	},

	damage: function (actor, item, effect, component, cls) {
		Prepare.calculateDamage(actor?.data, item, component, cls);
	},

	description: function (actor, item, effect, component) {
		component.display = TextEditor.enrichHTML(component.raw || '', {
			entities: true,
			links: true,
			rollData: actor?.getRollData(),
			secrets: actor?.owner
		});
	},

	save: function (actor, item, effect, component, cls) {
		Prepare.calculateDC(actor?.data, item, component, cls, Filters.appliesTo.saveDCs);
	},

	resource: function (actor, item, effect, component) {
		Prepare.calculateResources(actor?.data, item, effect, component);

		component.label =
			component.name.length ? component.name : game.i18n.localize('OBSIDIAN.Unnamed');

		item.obsidian.notes.push(
			'<div class="obsidian-table-note-flex">'
				+ `<div data-roll="fx" data-uuid="${effect.uuid}" class="rollable">`
					+ component.label
				+ `</div>: ${component.display}`
			+ '</div>');
	},

	target: function (actor, item, effect, component) {
		if (component.target === 'area' && !effect.isLinked) {
			item.obsidian.notes.push(
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
		if (!actor || !actor.data.obsidian) {
			return;
		}

		const actorData = actor.data;
		if (component.source === 'individual' && component.method === 'list') {
			const cls = actorData.obsidian.classes.find(cls => cls._id === component.class);
			component.spells.forEach(id => {
				const spell = actorData.obsidian.itemsByID.get(id);
				if (!spell) {
					return;
				}

				spell.obsidian.visible = false;
				if (cls?.obsidian?.spellcasting?.spellList) {
					cls.obsidian.spellcasting.spellList.push(spell);
				}
			});
		} else if (component.source === 'list'
			&& getProperty(item, 'flags.obsidian.source.type') === 'class'
			&& OBSIDIAN.Data.SPELLS_BY_CLASS
			&& OBSIDIAN.Data.SPELLS_BY_CLASS[component.list])
		{
			const cls = actorData.obsidian.classes.find(cls =>
				cls._id === item.flags.obsidian.source.class);

			if (!cls || !getProperty(cls, 'flags.spellcasting.spellList')) {
				return;
			}

			const list = cls.obsidian.spellcasting.spellList;
			const existing = new Set(list.map(spell => spell._id));

			cls.obsidian.spellcasting.spellList =
				list.concat(
					OBSIDIAN.Data.SPELLS_BY_CLASS[component.list]
						.filter(spell => !existing.has(spell._id)));
		}

		if (component.source === 'individual' && component.method === 'item') {
			item.obsidian.notes.push(...component.spells
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

function prepareEffects (item) {
	const flags = item.data.flags?.obsidian;
	if (!flags) {
		return;
	}

	let cls;
	let actorData;
	const effects = flags.effects || [];
	const derived = item.data.obsidian;
	const myEffects = new Map();

	if (item.isOwned) {
		actorData = item.actor.data;
	}

	if (flags.source && item.isOwned && actorData.obsidian) {
		cls = getSourceClass(actorData, flags.source);
	}

	for (let effectIdx = 0; effectIdx < effects.length; effectIdx++) {
		const effect = effects[effectIdx];
		myEffects.set(effect.uuid, effect);

		if (item.isOwned && actorData.obsidian) {
			actorData.obsidian.effects.set(effect.uuid, effect);
		}

		if (!effect.toggle) {
			effect.toggle = {active: true, display: ''};
		}

		effect.parentActor = actorData?._id;
		effect.parentItem = item.data._id;
		effect.idx = effectIdx;
		effect.label = getEffectLabel(effect);
		effect.applies = [];
		effect.isLinked = false;

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
				derived.collection[linked].push(effect);
			}
		});

		for (let componentIdx = 0; componentIdx < effect.components.length; componentIdx++) {
			const component = effect.components[componentIdx];
			if (item.isOwned && actorData.obsidian) {
				actorData.obsidian.components.set(component.uuid, component);
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

				derived.collection[collection].push(component);
			}

			const prepare = prepareComponents[component.type];
			if (prepare) {
				prepare(item.actor, item.data, effect, component, cls);
			}
		}

		if (effect.targetComponent && effect.targetComponent.target === 'individual') {
			effect.components
				.filter(c => c.type === 'attack')
				.forEach(atk => atk.targets = effect.targetComponent.count);
		}

		if (!effect.isLinked && !effect.components.some(c => Effect.metadata.active.has(c.type))) {
			derived.actionable.push(effect);
		}

		const isRollable =
			effect.selfApplied || effect.components.some(c => Effect.metadata.rollable.has(c.type));

		if (isRollable
			&& item.data.type !== 'spell'
			&& !effect.components.some(c =>
				c.type === 'resource' || c.type === 'attack'
				|| (c.type === 'spells' && c.source === 'individual' && c.method === 'item')))
		{
			derived.notes.push(`
				<div class="obsidian-table-note-flex">
					<div data-roll="fx" data-uuid="${effect.uuid}" class="rollable">
						${effect.label}
					</div>
				</div>
			`);
		}
	}

	derived.collection.applied.forEach(e =>
		myEffects.get(e.appliedComponent.ref)?.applies.push(e.uuid));

	derived.actionable = derived.actionable.flatMap(action => {
		const spells = action.components.filter(c => c.type === 'spells');
		if (spells.length) {
			return spells.flatMap(component =>
				component.spells.map(entry => {
					if (item.isOwned && actorData.obsidian) {
						return actorData.obsidian.itemsByID.get(entry);
					}

					return entry;
				}));
		}

		return action;
	});

	if (item.isOwned && actorData.obsidian) {
		effects.filter(effect => !effect.isLinked).forEach(effect => {
			const scalingEffects =
				derived.collection.scaling.filter(e => e.scalingComponent.ref === effect.uuid);

			if (scalingEffects.length < 1 || !Effect.isEagerScaling(scalingEffects[0])) {
				return;
			}

			let scaledAmount = 0;
			const actorLevel = actorData.data.details.level;
			const component = scalingEffects[0].scalingComponent;

			switch (component.method) {
				case 'level':
					scaledAmount = actorLevel;
					break;
				case 'cantrip':
					scaledAmount = Math.round((actorLevel + 1) / 6 + .5) - 1;
					break;
				case 'class':
					scaledAmount = actorData.obsidian.itemsByID.get(component.class)?.data.levels;
					break;
			}

			const scaling = Effect.getScaling(item.actor, effect, scaledAmount);
			if (!scaling) {
				return;
			}

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

			if (damageComponents.length) {
				if (scaling.mode === 'scaling') {
					for (const dmg of damageComponents) {
						const existing =
							effect.components.find(c =>
								c.type === 'damage' && c.damage === dmg.damage);

						if (existing) {
							Effect.scaleExistingDamage(dmg, existing, scaling, scaledAmount);
							existing.display = Prepare.damageFormat(existing);
						}
					}
				} else {
					const oldComponents =
						new Set(effect.components.filter(c => c.type === 'damage'));

					derived.collection.damage =
						derived.collection.damage
							.filter(c => !oldComponents.has(c))
							.concat(damageComponents);
				}
			}
		});
	}

	if (derived.collection.attack.length) {
		derived.bestAttack =
			derived.collection.attack.reduce((acc, atk) => atk.value > acc.value ? atk : acc);

		if (derived.bestAttack.targets > 1) {
			derived.notes.push(
				`${game.i18n.localize('OBSIDIAN.Count')}: ${derived.bestAttack.targets}`);
		}
	} else if (derived.collection.damage.length) {
		const targetComponents =
			effects.filter(effect => !effect.isLinked)
				.flatMap(effect => effect.components)
				.filter(c => c.type === 'target' && c.target === 'individual');

		if (targetComponents.length) {
			derived.notes.push(
				`${game.i18n.localize('OBSIDIAN.Count')}: ${targetComponents[0].count}`);
		}
	}

	if (derived.collection.save.length) {
		derived.bestSave =
			derived.collection.save.reduce((acc, save) => save.value > acc.value ? save : acc);
	}

	if (derived.collection.resource.length) {
		derived.bestResource =
			derived.collection.resource.reduce((acc, res) => res.max > acc.max ? res : acc);
	}
}

export function getEffectLabel (effect) {
	if (effect.name.length) {
		return effect.name;
	}

	return game.i18n.localize('OBSIDIAN.Unnamed');
}
