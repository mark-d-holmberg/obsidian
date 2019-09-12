Obsidian.Rules = {};
Obsidian.Rules.ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

Obsidian.Rules.ATTACK_TAGS = [
	'ma', 'adamantine', 'silver', 'ammunition', 'finesse', 'heavy', 'light', 'loading', 'reach',
	'lance', 'net', 'thrown', 'twohanded', 'versatile', 'custom'
];

Obsidian.Rules.ATTACK_TYPES = ['melee', 'ranged', 'unarmed'];
Obsidian.Rules.CLASSES = [
	'brb', 'brd', 'clr', 'drd', 'fgt', 'mnk', 'pal', 'rng', 'rog', 'src', 'war', 'wiz', 'custom'
];

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
Obsidian.Rules.SPELL_CAST_TIMES = ['action', 'ba', 'react', 'min', 'hour'];
Obsidian.Rules.SPELL_DURATIONS = ['instant', 'dispel', 'special', 'round', 'min', 'hour'];
Obsidian.Rules.SPELL_RANGES = ['self', 'touch', 'short', 'long'];
Obsidian.Rules.SPELL_SCHOOLS = ['abj', 'con', 'div', 'enc', 'ill', 'trs', 'evo', 'nec'];
Obsidian.Rules.SPELL_PREP = ['known', 'prep', 'book'];
Obsidian.Rules.SPELL_PROGRESSION = ['third', 'half', 'full', 'pact', 'artificer'];
Obsidian.Rules.SPELL_RITUALS = ['prep', 'book'];

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
