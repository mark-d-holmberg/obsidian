import {OBSIDIAN} from '../rules/rules.js';
import {Filters} from '../rules/filters.js';

export const Effect = {
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
			recharge: {time: 'long', calc: 'all', ndice: 0, die: 2, bonus: 0},
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
			proficient: false
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
			effect: ''
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
			calc: 'fixed',
			fixed: 1,
			slots: 'any',
			class: ''
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
			die: 4
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
			collection: []
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
			mode: mods.map(mod => mod.mode)
		};
	},

	filterDamage: (actorData, filter, dmg) => {
		let attackPred = filter => !Filters.damage.isAttack(filter);
		const parentEffect = actorData.obsidian.effects.get(dmg.parentEffect);

		if (parentEffect) {
			const attack = parentEffect.components.find(c => c.type === 'attack');
			if (attack) {
				const key = attack.attack[0] + attack.category[0];
				attackPred = filter =>
					Filters.damage.isAttack(filter) && Filters.inCollection(filter, key);
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
	}
};
