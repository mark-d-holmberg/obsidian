Obsidian.SCHEMA = {
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
		classes: [],
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

Obsidian.EQUIP_TYPES = [
	'armour', 'helm', 'amulet', 'ring', 'belt', 'bracers', 'gauntlet', 'boots', 'cloak', 'gear'
];

Obsidian.CONSUMABLE_SCHEMA = {damage: [], hit: {enabled: false, stat: ''}, dc: {enabled: false}};
Obsidian.CONTAINER_SCHEMA = {currency: {}};
Obsidian.EQUIPMENT_SCHEMA = {subtype: 'gear'};

Obsidian.SPELL_SCHEMA = {
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

Obsidian.WEAPON_SCHEMA = {
	type: 'melee',
	mode: 'melee',
	damage: [],
	versatile: [],
	tags: {},
	hit: {enabled: true, stat: 'str', bonus: 0, proficient: true, crit: 20},
	dc: {enabled: false}
};
