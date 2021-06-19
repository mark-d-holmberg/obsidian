export const Schema = {};

Schema.VERSION = 15;

Schema.Actor = {
	attributes: {
		ac: {
			ability1: 'dex',
			base: 10
		},
		death: {
			adv: false,
			bonus: 0,
			threshold: 10
		},
		hd: {},
		init: {
			ability: 'dex'
		}
	},
	defenses: {
		damage: [],
		conditions: [],
		disease: false,
		sleep: false
	},
	details: {
		gender: null,
		subrace: null,
		milestone: false,
		tags: {}
	},
	order: {
		equipment: {
			root: [],
			containers: []
		}
	},
	rules: {},
	saves: {
		bonus: 0
	},
	sheet: {
		roll: 'reg'
	},
	skills: {
		bonus: 0,
		joat: false,
		custom: [],
		passives: ['prc', 'inv']
	},
	spells: {
		slots: {}
	},
	tools: {
		custom: []
	},
	traits: {
		profs: {
			custom: {
				armour: [],
				weapons: [],
				langs: []
			}
		}
	}
};

Schema.EquipTypes = [
	'armour', 'helm', 'amulet', 'ring', 'belt', 'bracers', 'gauntlet', 'boots', 'cloak', 'gear',
	'vehicle'
];

Schema.Consumable = {
	unlimited: false,
	subtype: 'potion'
};

Schema.Container = {currency: {}};
Schema.Equipment = {subtype: 'gear', magical: false};
Schema.Feature = {source: {}};

Schema.Spell = {
	time: {},
	range: {},
	duration: {},
	components: {},
	source: {type: 'custom'}
};

Schema.Weapon = {
	category: 'simple',
	type: 'melee',
	mode: 'melee',
	tags: {},
	magical: false
};
