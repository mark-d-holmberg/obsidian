import {OBSIDIAN} from '../global.js';
import {Filters} from '../rules/filters.js';
import {determineAdvantage} from '../rules/prepare.js';

export const Effect = {
	metadata: {
		active: new Set(['roll-mod', 'bonus', 'defense']),
		linked: ['applied', 'scaling'],
		single: new Set(['applied', 'scaling', 'duration', 'target']),
		rollable: new Set([
			'damage', 'save', 'target', 'duration', 'expression', 'consume', 'produce'
		]),
		components: [
			'resource', 'attack', 'damage', 'save', 'scaling', 'target', 'consume', 'produce',
			'spells', 'roll-mod', 'bonus', 'filter', 'duration', 'expression', 'applied',
			'uses-ability', 'defense'
		]
	},

	create: function () {
		return {
			name: '',
			uuid: OBSIDIAN.uuid(),
			components: []
		};
	},

	newResource: function () {
		return {
			type: 'resource',
			name: '',
			uuid: OBSIDIAN.uuid(),
			recharge: {time: 'long', calc: 'all', ndice: 0, die: 2, bonus: 0, roll: null},
			bonus: 0,
			operator: 'plus',
			key: 'abl',
			min: 0,
			calc: 'fixed',
			fixed: 0
		};
	},

	newAttack: function () {
		return {
			type: 'attack',
			uuid: OBSIDIAN.uuid(),
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
		};
	},

	newDamage: function () {
		return {
			type: 'damage',
			uuid: OBSIDIAN.uuid(),
			calc: 'formula',
			ndice: 1,
			die: 4,
			ability: '',
			bonus: 0,
			damage: '',
			versatile: false
		};
	},

	newSave: function () {
		return {
			type: 'save',
			uuid: OBSIDIAN.uuid(),
			calc: 'fixed',
			fixed: 0,
			bonus: 0,
			prof: 1,
			ability: '',
			target: 'con',
			effect: '',
			save: 'half'
		};
	},

	newScaling: function () {
		return {
			type: 'scaling',
			uuid: OBSIDIAN.uuid(),
			method: 'spell',
			ref: ''
		};
	},

	newTarget: function () {
		return {
			type: 'target',
			uuid: OBSIDIAN.uuid(),
			target: 'individual',
			count: 1,
			area: 'cone',
			distance: 0
		};
	},

	newConsume: function () {
		return {
			type: 'consume',
			uuid: OBSIDIAN.uuid(),
			target: 'this-effect',
			itemID: '',
			featID: '',
			ref: '',
			fixed: 1,
			slots: 'any',
			class: '',
			slot: 1
		};
	},

	newProduce: function () {
		return {
			type: 'produce',
			uuid: OBSIDIAN.uuid(),
			target: 'this-effect',
			itemID: '',
			featID: '',
			ref: '',
			calc: 'fixed',
			fixed: 1,
			unlimited: false,
			slot: 1
		};
	},

	newSpells: function () {
		return {
			type: 'spells',
			uuid: OBSIDIAN.uuid(),
			source: 'list',
			list: 'clr',
			spells: [],
			method: 'innate',
			class: '',
			ability: 'cha',
			upcast: false,
			level: 0
		};
	},

	newRollMod: function () {
		return {
			type: 'roll-mod',
			uuid: OBSIDIAN.uuid(),
			min: 1,
			reroll: 1,
			mode: 'reg',
			ndice: 0
		};
	},

	newBonus: function () {
		return {
			type: 'bonus',
			uuid: OBSIDIAN.uuid(),
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
		};
	},

	newFilter: function () {
		return {
			type: 'filter',
			uuid: OBSIDIAN.uuid(),
			filter: 'roll',
			score: 'ability',
			roll: 'attack',
			check: 'ability',
			dmg: 'damage',
			multi: 'any',
			some: '',
			collection: [],
			mode: ''
		};
	},

	newDuration: function () {
		return {
			type: 'duration',
			uuid: OBSIDIAN.uuid(),
			duration: 1,
			concentration: false
		};
	},

	newExpression: function () {
		return {
			type: 'expression',
			uuid: OBSIDIAN.uuid(),
			expr: '',
			flavour: ''
		};
	},

	newApplied: function () {
		return {
			type: 'applied',
			uuid: OBSIDIAN.uuid(),
			ref: '',
			on: 'target'
		};
	},

	newUsesAbility: function () {
		return {
			type: 'uses-ability',
			uuid: OBSIDIAN.uuid(),
			abilities: {}
		};
	},

	newDefense: function () {
		return {
			type: 'defense',
			uuid: OBSIDIAN.uuid(),
			disease: false,
			sleep: false,
			defense: '',
			damage: {level: 'res', dmg: 'acid', magic: '', material: ''},
			condition: 'charmed'
		};
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
			mods.push({min: 1, reroll: 1, ndice: 0, mode: 'reg'});
		}

		return {
			min: Math.max(...mods.map(mod => mod.min)),
			reroll: Math.max(...mods.map(mod => mod.reroll)),
			ndice: mods.reduce((acc, mod) => acc + mod.ndice, 0),
			mode: mods.reduce((acc, mod) => acc.concat(mod.mode), [])
		};
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
		let attackPred = filter => !Filters.damage.isAttack(filter);
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

	isConcentration: function (actorData, effect) {
		if (effect.durationComponent && effect.durationComponent.concentration) {
			return true;
		}

		const item = actorData.obsidian.itemsByID.get(effect.parentItem);
		return item && item.type === 'spell' && item.data.components.concentration;
	}
};
