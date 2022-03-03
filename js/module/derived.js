import {Partitioner} from '../util/partition.js';
import {Effect} from './effect.js';

class ObsidianDerived {
	toObject (source = true) {
		if (source) {
			return;
		}

		const data = {};
		for (const p in this) {
			if (!this.hasOwnProperty(p)) {
				continue;
			}

			const v = this[p];
			if (v instanceof Object) {
				data[p] = cloneWithObject(v, source);
			} else {
				data[p] = v;
			}
		}

		return data;
	}
}

export class ObsidianActorDerived extends ObsidianDerived {
	constructor () {
		super();
		this.ammo = [];
		this.attributes = {init: {}, speed: {}};
		this.classes = [];
		this.components = new Map();
		this.details = {};
		this.effects = new Map();
		this.itemsByType = new Partitioner(game.system.documentTypes.Item);
		this.magicalItems = [];
		this.rules = {};
		this.spellbook = {concentration: [], rituals: []};
		this.toggleable = [];
		this.triggers = {};

		this.inventory = {
			weight: 0,
			attunements: 0,
			items: [],
			root: [],
			containers: []
		};
	}
}

export class ObsidianItemDerived extends ObsidianDerived {
	constructor () {
		super();
		this.actionable = [];
		this.attributes = {};
		this.collection = {versatile: []};
		this.notes = [];
		this.source = {display: ''};

		Effect.metadata.components.forEach(c => this.collection[c] = []);
	}
}
