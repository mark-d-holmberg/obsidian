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
			uuid: OBSIDIAN.uuid(),
			recharge: 'long',
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
			ability: 'str',
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
			count: 1
		};
	},

	newConsume: function () {
		return {
			type: 'consume',
			uuid: OBSIDIAN.uuid(),
			target: 'this-effect',
			itemID: -1,
			featID: -1,
			ref: '',
			calc: 'fixed',
			fixed: 1,
			slots: 'any',
			class: ''
		};
	},

	getLinkedResource: function (actorData, consumer) {
		const item =
			actorData.obsidian.itemsByID.get(
				consumer.target === 'feat' ? consumer.featID : consumer.itemID);

		if (!item || !item.flags || !item.flags.obsidian || !item.flags.obsidian.effects) {
			return [];
		}

		const effect = item.flags.obsidian.effects.find(effect => effect.uuid === consumer.ref);
		if (!effect) {
			return [];
		}

		const resources = effect.components.filter(c => c.type === 'resource');
		if (!resources.length) {
			return [];
		}

		return [item, effect, resources[0]];
	}
};
