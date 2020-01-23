import {OBSIDIAN} from '../rules/rules.js';

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
			versatile: false,
			ncrit: 1
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
			operator: 'lt',
			once: true
		};
	},

	getLinkedResource: function (actorData, consumer) {
		const item =
			actorData.obsidian.itemsByID.get(
				consumer.target === 'feat' ? consumer.featID : consumer.itemID);

		if (!item || !item.flags || !item.flags.obsidian || !item.flags.obsidian.effects) {
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
