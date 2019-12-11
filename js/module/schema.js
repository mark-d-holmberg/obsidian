export const Schema = {};

Schema.Actor = {
	obsidian: {
		attributes: {
			ac: {
				ability1: 'dex',
				base: 10
			},
			conditions: {},
			death: {
				adv: false,
				bonus: 0,
				threshold: 10
			},
			hd: {},
			hpMaxMod: 0,
			init: {
				ability: 'dex'
			},
			senses: {},
			speed: {}
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
			milestone: false
		},
		order: {
			equipment: {
				root: [],
				containers: []
			}
		},
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
			tools: [],
			passives: ['prc', 'inv']
		},
		spells: {
			slots: {}
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
	}
};

Schema.EquipTypes = [
	'armour', 'helm', 'amulet', 'ring', 'belt', 'bracers', 'gauntlet', 'boots', 'cloak', 'gear'
];

Schema.Consumable = {
	unlimited: false
};

Schema.Container = {currency: {}};
Schema.Equipment = {subtype: 'gear'};

Schema.Feature = {
	active: 'active',
	action: 'action',
	source: {},
	uses: {enabled: false},
	dc: {enabled: false},
	hit: {enabled: false},
	damage: []
};

Schema.Spell = {
	damage: [],
	upcast: {enabled: false, damage: []},
	time: {},
	range: {},
	duration: {},
	components: {},
	hit: {enabled: false, stat: ''},
	dc: {enabled: false, bonus: 8, prof: 1, ability: 'spell'},
	source: {type: 'custom'}
};

Schema.Weapon = {
	category: 'simple',
	type: 'melee',
	mode: 'melee',
	tags: {}
};
