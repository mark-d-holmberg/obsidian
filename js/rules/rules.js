Obsidian.Rules = {};
Obsidian.Rules.ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

Obsidian.Rules.WEAPON_TAGS = [
	'ma', 'adamantine', 'silver', 'ammunition', 'finesse', 'heavy', 'light', 'loading', 'reach',
	'lance', 'net', 'offhand', 'thrown', 'twohanded', 'versatile', 'custom'
];

Obsidian.Rules.ATTACK_TYPES = ['melee', 'ranged', 'unarmed'];
Obsidian.Rules.ARMOUR_TYPES = ['light', 'medium', 'heavy', 'shield'];
Obsidian.Rules.COIN_WEIGHT = 0.02;
Obsidian.Rules.CONSUMABLE_TYPES = ['ammo', 'potion'];
Obsidian.Rules.CLASSES = [
	'brb', 'brd', 'clr', 'drd', 'fgt', 'mnk', 'pal', 'rng', 'rog', 'src', 'war', 'wiz', 'custom'
];

Obsidian.Rules.CURRENCY = ['pp', 'gp', 'ep', 'sp', 'cp'];
Obsidian.Rules.DAMAGE_DICE = [4, 6, 8, 10, 12];
Obsidian.Rules.DAMAGE_TYPES = [
	'blg', 'prc', 'slh', 'acd', 'cld', 'fir', 'frc', 'lig', 'ncr', 'psn', 'psy', 'rad', 'thn'
];

Obsidian.Rules.CONDITIONS = [
	'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible',
	'paralysed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
];

Obsidian.Rules.CLASS_HIT_DICE = {
	brb: 12,
	brd: 8,
	clr: 8,
	drd: 8,
	fgt: 10,
	mnk: 8,
	pal: 10,
	rng: 10,
	rog: 8,
	src: 6,
	war: 8,
	wiz: 6
};

Obsidian.Rules.CLASS_SPELL_MODS = {
	brd: 'cha',
	clr: 'wis',
	drd: 'wis',
	pal: 'cha',
	rng: 'wis',
	src: 'cha',
	war: 'cha',
	wiz: 'int'
};

Obsidian.Rules.CLASS_SPELL_PROGRESSION = {
	brd: 'full',
	clr: 'full',
	drd: 'full',
	pal: 'half',
	rng: 'half',
	src: 'full',
	war: 'pact',
	wiz: 'full'
};

Obsidian.Rules.CLASS_SPELL_PREP = {
	brd: 'known',
	clr: 'prep',
	drd: 'prep',
	pal: 'prep',
	rng: 'known',
	src: 'known',
	war: 'known',
	wiz: 'book'
};

Obsidian.Rules.CLASS_RITUALS = {
	brd: 'prep',
	clr: 'prep',
	drd: 'prep',
	wiz: 'book'
};

Obsidian.Rules.FEAT_ACTION = ['action', 'ba', 'react', 'trigger'];
Obsidian.Rules.FEAT_ACTIVE = ['active', 'passive'];
Obsidian.Rules.FEAT_SOURCE_TYPES = ['class', 'race', 'feat', 'other'];
Obsidian.Rules.FEAT_USES_KEYS = ['abl', 'chr', 'cls'];
Obsidian.Rules.HD = [2, 4, 6, 8, 10, 12, 20];
Obsidian.Rules.ITEM_CHARGE_DICE = [2, 3, 4, 6, 8, 10, 12, 20];
Obsidian.Rules.ITEM_RECHARGE = ['never', 'dawn', 'dusk'];
Obsidian.Rules.MAX_LEVEL = 20;

Obsidian.Rules.PLUS_PROF = {
	0.5: 'half',
	1: 'prof',
	2: 'expert'
};

Obsidian.Rules.PROFICIENCY_LEVELS = {
	0: 'none',
	0.5: 'half',
	1: 'prof',
	2: 'expert'
};

Obsidian.Rules.ROLL = ['reg', 'adv', 'dis'];
Obsidian.Rules.SENSES = ['dark', 'blind', 'tremor', 'true'];
Obsidian.Rules.SPEEDS = ['walk', 'burrow', 'climb', 'fly', 'swim'];
Obsidian.Rules.SPELL_COMPONENT_MAP = {v: 'Verbal', s: 'Somatic', m: 'Material', r: 'Royalty'};
Obsidian.Rules.SPELL_CAST_TIMES = ['action', 'ba', 'react', 'min', 'hour', 'special'];
Obsidian.Rules.SPELL_DURATIONS = ['instant', 'dispel', 'special', 'round', 'min', 'hour', 'day'];
Obsidian.Rules.SPELL_RANGES = ['self', 'touch', 'short', 'long'];
Obsidian.Rules.SPELL_SCHOOLS = ['abj', 'con', 'div', 'enc', 'ill', 'trs', 'evo', 'nec'];
Obsidian.Rules.SPELL_PREP = ['known', 'prep', 'book'];
Obsidian.Rules.SPELL_PROGRESSION = ['third', 'half', 'full', 'pact', 'artificer'];
Obsidian.Rules.SPELL_RITUALS = ['prep', 'book'];

Obsidian.Rules.SPELLS_KNOWN_TABLE = {
	brd: {
		cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
		known: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22]
	},
	clr: {
		cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5],
		known: []
	},
	drd: {
		cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
		known: []
	},
	rng: {
		cantrips: [],
		known: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11]
	},
	src: {
		cantrips: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6],
		known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15]
	},
	war: {
		cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
		known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15]
	},
	wiz: {
		cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5],
		known: []
	}
};

Obsidian.Rules.SPELL_SLOT_TABLE = [
	[2],
	[3],
	[4, 2],
	[4, 3],
	[4, 3, 2],
	[4, 3, 3],
	[4, 3, 3, 1],
	[4, 3, 3, 2],
	[4, 3, 3, 3, 1],
	[4, 3, 3, 3, 2],
	[4, 3, 3, 3, 2, 1],
	[4, 3, 3, 3, 2, 1],
	[4, 3, 3, 3, 2, 1, 1],
	[4, 3, 3, 3, 2, 1, 1],
	[4, 3, 3, 3, 2, 1, 1, 1],
	[4, 3, 3, 3, 2, 1, 1, 1],
	[4, 3, 3, 3, 2, 1, 1, 1, 1],
	[4, 3, 3, 3, 3, 1, 1, 1, 1],
	[4, 3, 3, 3, 3, 2, 1, 1, 1],
	[4, 3, 3, 3, 3, 2, 2, 1, 1]
];

Obsidian.Rules.WEAPON_CATEGORIES = ['simple', 'martial'];
