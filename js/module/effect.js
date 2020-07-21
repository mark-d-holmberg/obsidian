import {OBSIDIAN} from '../global.js';
import {Filters} from '../rules/filters.js';
import {determineAdvantage} from '../rules/prepare.js';

export const Categories = ['rolls', 'resources', 'modifiers', 'special'];

export const Components = {
	applied: {
		data: {
			type: 'applied',
			ref: '',
			on: 'target'
		},
		metadata: {
			category: 'special',
			tray: 'AppliedEffect'
		}
	},
	attack: {
		data: {
			type: 'attack',
			attack: 'melee',
			category: 'weapon',
			ability: '',
			bonus: 0,
			crit: 20,
			proficient: false,
			reach: null,
			range1: null,
			range2: null,
			target: ''
		},
		metadata: {
			category: 'rolls',
			tray: 'AddAttack',
			addons: ['roll-mod', 'bonus']
		}
	},
	bonus: {
		data: {
			type: 'bonus',
			name: '',
			bonus: 0,
			prof: 0,
			ability: '',
			level: '',
			class: '',
			text: '',
			ndice: 0,
			die: 4,
			constant: 0,
			operator: 'plus',
			value: '',
			formula: false
		},
		metadata: {
			category: 'modifiers',
			addon: 'extraBonus',
			tray: ['AddBonus', 'RemoveBonus']
		}
	},
	check: {
		data: {
			type: 'check',
			calc: 'fixed',
			fixed: 0,
			bonus: 8,
			prof: 1,
			ability: '',
			target: 'str',
			skill: '',
			custom: ''
		},
		metadata: {
			category: 'rolls',
			tray: 'AbilityCheck'
		}
	},
	consume: {
		data: {
			type: 'consume',
			target: 'this-effect',
			itemID: '',
			featID: '',
			ref: '',
			fixed: 1,
			slots: 'any',
			class: '',
			slot: 1
		},
		metadata: {
			category: 'resources',
			tray: 'ConsumesResource'
		}
	},
	damage: {
		data: {
			type: 'damage',
			calc: 'formula',
			ndice: 1,
			die: 4,
			ability: '',
			bonus: 0,
			damage: '',
			versatile: false
		},
		metadata: {
			category: 'rolls',
			tray: 'DamageHeal',
			addons: ['roll-mod', 'bonus']
		}
	},
	defense: {
		data: {
			type: 'defense',
			disease: false,
			sleep: false,
			defense: '',
			damage: {level: 'res', dmg: 'acid', magic: '', material: ''},
			condition: {level: 'imm', condition: 'charmed'}
		},
		metadata: {
			category: 'modifiers',
			tray: 'AddDefense'
		}
	},
	description: {
		data: {
			type: 'description',
			raw: ''
		},
		metadata: {
			category: 'special',
			tray: 'AddDescription'
		}
	},
	duration: {
		data: {
			type: 'duration',
			duration: 1,
			concentration: false
		},
		metadata: {
			category: 'special',
			tray: 'CombatDuration'
		}
	},
	expression: {
		data: {
			type: 'expression',
			expr: '',
			flavour: ''
		},
		metadata: {
			category: 'rolls',
			tray: 'DiceExpression'
		}
	},
	filter: {
		data: {
			type: 'filter',
			filter: 'roll',
			score: 'ability',
			roll: 'attack',
			check: 'ability',
			dmg: 'damage',
			multi: 'any',
			some: '',
			collection: [],
			mode: ''
		},
		metadata: {
			category: 'modifiers',
			tray: 'AddFilter',
			addons: ['uses-ability']
		}
	},
	produce: {
		data: {
			type: 'produce',
			target: 'this-effect',
			itemID: '',
			featID: '',
			ref: '',
			calc: 'fixed',
			fixed: 1,
			unlimited: false,
			slot: 1
		},
		metadata: {
			category: 'resources',
			tray: 'ProducesResource'
		}
	},
	resource: {
		data: {
			type: 'resource',
			name: '',
			recharge: {time: 'long', calc: 'all', ndice: 0, die: 2, bonus: 0, roll: null},
			bonus: 0,
			operator: 'plus',
			key: 'abl',
			min: 0,
			calc: 'fixed',
			fixed: 0
		},
		metadata: {
			category: 'resources',
			tray: 'AddResource'
		}
	},
	'roll-mod': {
		data: {
			type: 'roll-mod',
			min: 1,
			reroll: 1,
			mode: 'reg',
			ndice: 0,
			max: false
		},
		metadata: {
			category: 'modifiers',
			addon: 'rollMod',
			tray: ['RollModifier', 'RollModifier']
		}
	},
	'roll-table': {
		data: {
			type: 'roll-table',
			tables: [],
			nrolls: 1,
			reset: true
		},
		metadata: {
			category: 'rolls',
			tray: 'RollOnTable'
		}
	},
	save: {
		data: {
			type: 'save',
			calc: 'fixed',
			fixed: 0,
			bonus: 8,
			prof: 1,
			ability: '',
			target: 'con',
			effect: '',
			save: 'half'
		},
		metadata: {
			category: 'rolls',
			tray: 'AddSave'
		}
	},
	scaling: {
		data: {
			type: 'scaling',
			method: 'spell',
			class: '',
			text: '',
			threshold: 0,
			ref: ''
		},
		metadata: {
			category: 'special',
			tray: 'AddScaling'
		}
	},
	setter: {
		data: {
			type: 'setter',
			score: 0,
			min: false
		},
		metadata: {
			category: 'modifiers',
			tray: 'SetScore'
		}
	},
	spells: {
		data: {
			type: 'spells',
			source: 'list',
			list: 'clr',
			spells: [],
			method: 'innate',
			class: '',
			ability: 'cha',
			upcast: false,
			level: 0
		},
		metadata: {
			category: 'special',
			tray: 'ProvidesSpells'
		}
	},
	target: {
		data: {
			type: 'target',
			target: 'individual',
			count: 1,
			area: 'cone',
			distance: 0
		},
		metadata: {
			category: 'special',
			tray: 'AddTargets'
		}
	},
	'uses-ability': {
		data: {
			type: 'uses-ability',
			abilities: {}
		},
		metadata: {
			addon: 'usesAbility',
			tray: ['UsesAbility', 'UsesAbility']
		}
	}
};

export const Effect = {
	metadata: {
		components: Object.keys(Components),
		active: new Set(['roll-mod', 'bonus', 'defense', 'setter']),
		linked: ['applied', 'scaling'],
		single: new Set(['applied', 'scaling', 'duration', 'target']),
		rollable: new Set([
			'damage', 'save', 'target', 'duration', 'expression', 'consume', 'produce',
			'description', 'roll-table'
		])
	},

	create: function () {
		return {
			name: '',
			uuid: OBSIDIAN.uuid(),
			components: []
		};
	},

	createComponent: function (component) {
		const o = duplicate(Components[component].data);
		o.uuid = OBSIDIAN.uuid();
		return o;
	},

	determineMulti: function (filter) {
		let prop = 'filter';
		let tree = OBSIDIAN.Rules.EFFECT_FILTER_IS_MULTI;

		do {
			prop = filter[prop];
			tree = tree[prop];
		} while (typeof tree === 'object');

		return !!tree;
	},

	combineRollMods: mods => {
		if (!mods.length) {
			mods.push({min: 1, reroll: 1, ndice: 0, mode: 'reg', max: false});
		}

		return {
			min: Math.max(...mods.map(mod => mod.min)),
			reroll: Math.max(...mods.map(mod => mod.reroll)),
			ndice: mods.reduce((acc, mod) => acc + mod.ndice, 0),
			mode: mods.reduce((acc, mod) => acc.concat(mod.mode), []),
			max: mods.some(mod => mod.max)
		};
	},

	combineSetters: setters => {
		const strict = setters.find(setter => !setter.min);
		if (strict) {
			return strict;
		}

		return setters.reduce((min, setter) => {
			if (setter.score > min.score) {
				return setter;
			}

			return min;
		}, {score: 0, min: true});
	},

	determineRollMods: (actor, globalMod, pred) => {
		// Because roll mods themselves can change the mode of a roll, we have
		// to do two passes over the available modifiers. The first pass
		// collects all the mods that aren't contingent on the mode of the
		// roll. Then, in case one of those roll mods then results in changing
		// the mode of the roll, we do another pass with the updated mode to
		// collect any roll mods that might be contingent on that mode too.

		const mods = actor.data.obsidian.filters.mods;
		const firstPass = mods(pred());
		const adv = determineAdvantage(...Effect.combineRollMods(firstPass.concat(globalMod)).mode);
		const mode = adv > 0 ? 'adv' : adv === 0 ? 'reg' : 'dis';
		const secondPass = mods(pred(mode));
		return Effect.combineRollMods(secondPass.concat(globalMod));
	},

	makeModeRollMod: modes => {
		return {min: 1, reroll: 1, ndice: 0, mode: [].concat(modes)}
	},

	sheetGlobalRollMod: actor => Effect.makeModeRollMod(actor.data.flags.obsidian.sheet.roll),

	filterDamage: (actorData, filter, dmg) => {
		let attackPred = filter => Filters.damage.isAttack(filter) && filter.multi === 'any';
		const parentEffect = actorData.obsidian.effects.get(dmg.parentEffect);

		if (parentEffect) {
			const attack = parentEffect.components.find(c => c.type === 'attack');
			if (attack) {
				const key = attack.attack[0] + attack.category[0];
				attackPred = filter =>
					Filters.damage.isAttack(filter)
					&& Filters.inCollection(filter, key)
					&& Filters.usesAbility(filter, attack.ability);
			}
		}

		let damagePred = filter => Filters.damage.isDamage(filter) && filter.multi === 'any';
		if (!OBSIDIAN.notDefinedOrEmpty(dmg.damage)) {
			damagePred = filter =>
				Filters.damage.isDamage(filter) && Filters.inCollection(filter, dmg.damage);
		}


		return filter(filter =>
			Filters.isDamage(filter) && (attackPred(filter) || damagePred(filter)));
	},

	getLinkedResource: function (actorData, consumer) {
		const item =
			actorData.obsidian.itemsByID.get(
				consumer.target === 'feat' ? consumer.featID : consumer.itemID);

		if (!item || !getProperty(item, 'flags.obsidian.effects.length')) {
			return [];
		}

		let effect;
		let resource;

		outer:
		for (const e of item.flags.obsidian.effects) {
			for (const c of e.components) {
				if (c.uuid === consumer.ref) {
					resource = c;
					effect = e;
					break outer;
				}
			}
		}

		if (!effect || !resource) {
			return [];
		}

		return [item, effect, resource];
	},

	getScaling: function (actor, effect, value) {
		const item = actor.data.obsidian.itemsByID.get(effect.parentItem);
		if (!item) {
			return;
		}

		const scalingEffects =
			item.obsidian.collection.scaling.filter(e => e.scalingComponent.ref === effect.uuid);

		if (scalingEffects.length < 1) {
			return;
		}

		if (scalingEffects.length < 2 && !scalingEffects[0].scalingComponent.threshold) {
			return {mode: 'scaling', effect: scalingEffects[0]};
		}

		// Returns the scaling component with the highest threshold less than
		// the scaling value.
		// Example: Thresholds = {3, 5, 9}, Value = 6, Return = 5

		const scaling = scalingEffects.reduce((min, e) => {
			const threshold = e.scalingComponent.threshold;
			if ((!min || threshold > min.scalingComponent.threshold) && value >= threshold) {
				return e;
			}

			return min;
		});

		if (!scaling) {
			return;
		}

		return {mode: 'breakpoint', effect: scaling};
	},

	isConcentration: function (actorData, effect) {
		if (effect.durationComponent && effect.durationComponent.concentration) {
			return true;
		}

		const item = actorData.obsidian.itemsByID.get(effect.parentItem);
		return item && item.type === 'spell' && item.data.components.concentration;
	},

	isEagerScaling: function (effect) {
		return ['cantrip', 'level', 'class'].includes(effect.scalingComponent.method);
	},

	scaleConstant: function (scaling, value, base, constant) {
		if (scaling.mode === 'scaling') {
			return Math.floor(base + constant * value);
		} else {
			return constant;
		}
	},

	scaleDamage: function (actor, scaling, scaledAmount, damage) {
		if (!damage.length) {
			return [];
		}

		let scalingEffect = scaling.effect;
		if (typeof scalingEffect === 'string') {
			scalingEffect = actor.data.obsidian.effects.get(scalingEffect);
		}

		let damageComponents =
			duplicate(scalingEffect.components.filter(c => c.type === 'damage'));

		if (Effect.isEagerScaling(scalingEffect)) {
			damageComponents = damageComponents.map(dmg => {
				dmg.ndice = dmg.scaledDice || 0;
				dmg.derived.ncrit = dmg.scaledCrit || 0;
				return dmg;
			}).filter(dmg => dmg.ndice);

			if (scaling.mode === 'scaling') {
				damage.push(...damageComponents);
				return damage;
			} else {
				return damageComponents;
			}
		} else {
			if (scaling.mode === 'scaling') {
				damage.push(...damageComponents.map(dmg => {
					if (dmg.calc === 'fixed') {
						const constant = dmg.rollParts.find(part => part.constant);
						if (constant) {
							constant.mod =
								Effect.scaleConstant(scaling, scaledAmount, 0, constant.mod);
						}
					} else {
						dmg.ndice = Effect.scaleConstant(scaling, scaledAmount, 0, dmg.ndice);
						dmg.derived.ncrit =
							Effect.scaleConstant(scaling, scaledAmount, 0, dmg.derived.ncrit);
					}

					return dmg;
				}));

				return damage;
			} else {
				return damageComponents;
			}
		}
	}
};
