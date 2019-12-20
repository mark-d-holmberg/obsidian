import {Schema} from '../module/schema.js';

export const OBSIDIAN = {};

OBSIDIAN.Schema = Schema;
OBSIDIAN.Rules = {};
OBSIDIAN.Rules.ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

OBSIDIAN.Rules.WEAPON_TAGS = [
	'adamantine', 'ammunition', 'finesse', 'heavy', 'light', 'loading', 'lance', 'ma', 'net',
	'offhand', 'reach', 'silver', 'thrown', 'twohanded', 'versatile'
];

OBSIDIAN.Rules.ALIGNMENTS = ['lg', 'ln', 'le', 'ng', 'n', 'ne', 'cg', 'cn', 'ce'];
OBSIDIAN.Rules.ATTACK_TYPES = ['melee', 'ranged'];
OBSIDIAN.Rules.ARMOUR_TYPES = ['light', 'medium', 'heavy', 'shield'];
OBSIDIAN.Rules.COIN_WEIGHT = 0.02;
OBSIDIAN.Rules.CONSUMABLE_TYPES = ['ammo', 'potion', 'gear'];
OBSIDIAN.Rules.CLASSES = [
	'brb', 'brd', 'clr', 'drd', 'fgt', 'mnk', 'pal', 'rng', 'rog', 'src', 'war', 'wiz', 'custom'
];

OBSIDIAN.Rules.CURRENCY = ['pp', 'gp', 'ep', 'sp', 'cp'];
OBSIDIAN.Rules.DAMAGE_DICE = [4, 6, 8, 10, 12];
OBSIDIAN.Rules.DAMAGE_TYPES = [
	'blg', 'prc', 'slh', 'acd', 'cld', 'fir', 'frc', 'lig', 'ncr', 'psn', 'psy', 'rad', 'thn'
];

OBSIDIAN.Rules.CONDITIONS = [
	'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible',
	'paralysed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
];

OBSIDIAN.Rules.CLASS_HIT_DICE = {
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

OBSIDIAN.Rules.CLASS_SPELL_MODS = {
	brd: 'cha',
	clr: 'wis',
	drd: 'wis',
	pal: 'cha',
	rng: 'wis',
	src: 'cha',
	war: 'cha',
	wiz: 'int'
};

OBSIDIAN.Rules.CLASS_SPELL_PROGRESSION = {
	brd: 'full',
	clr: 'full',
	drd: 'full',
	pal: 'half',
	rng: 'half',
	src: 'full',
	war: 'pact',
	wiz: 'full'
};

OBSIDIAN.Rules.CLASS_SPELL_PREP = {
	brd: 'known',
	clr: 'prep',
	drd: 'prep',
	pal: 'prep',
	rng: 'known',
	src: 'known',
	war: 'known',
	wiz: 'book'
};

OBSIDIAN.Rules.CLASS_RITUALS = {
	brd: 'prep',
	clr: 'prep',
	drd: 'prep',
	wiz: 'book'
};

OBSIDIAN.Rules.DEFENSE_LEVELS = ['res', 'imm', 'vuln'];
OBSIDIAN.Rules.EFFECT_ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha', 'spell'];
OBSIDIAN.Rules.EFFECT_ATTACK_CATS = ['weapon', 'spell'];
OBSIDIAN.Rules.EFFECT_DAMAGE_TYPES = [
	'blg', 'prc', 'slh', 'acd', 'cld', 'fir', 'frc', 'lig', 'ncr', 'psn', 'psy', 'rad', 'thn', 'hlg'
];

OBSIDIAN.Rules.EFFECT_SCALING_METHODS = ['spell', 'cantrip', 'resource'];
OBSIDIAN.Rules.EFFECT_TARGETS = ['individual'];
OBSIDIAN.Rules.FEAT_ACTION = ['action', 'ba', 'react', 'trigger'];
OBSIDIAN.Rules.FEAT_ACTIVE = ['active', 'passive'];
OBSIDIAN.Rules.FEAT_SOURCE_TYPES = ['class', 'race', 'feat', 'other'];
OBSIDIAN.Rules.FEAT_USES_KEYS = ['abl', 'chr', 'cls'];
OBSIDIAN.Rules.HD = [2, 4, 6, 8, 10, 12, 20];
OBSIDIAN.Rules.ITEM_CHARGE_DICE = [2, 3, 4, 6, 8, 10, 12, 20];
OBSIDIAN.Rules.ITEM_RECHARGE = ['long', 'short', 'dawn', 'dusk', 'never'];
OBSIDIAN.Rules.MAX_LEVEL = 20;
OBSIDIAN.Rules.NON_CASTERS = ['brb', 'fgt', 'mnk', 'rog'];

OBSIDIAN.Rules.PLUS_PROF = {
	0.5: 'half',
	1: 'prof',
	2: 'expert'
};

OBSIDIAN.Rules.PROFICIENCY_LEVELS = {
	0: 'none',
	0.5: 'half',
	1: 'prof',
	2: 'expert'
};

OBSIDIAN.Rules.RESOURCE_USES = ['fixed', 'formula'];
OBSIDIAN.Rules.ROLL = ['reg', 'adv', 'dis'];
OBSIDIAN.Rules.SENSES = ['dark', 'blind', 'tremor', 'true'];
OBSIDIAN.Rules.SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
OBSIDIAN.Rules.SPEEDS = ['walk', 'burrow', 'climb', 'fly', 'swim'];
OBSIDIAN.Rules.SPELL_COMPONENT_MAP = {v: 'Verbal', s: 'Somatic', m: 'Material', r: 'Royalty'};
OBSIDIAN.Rules.SPELL_CAST_TIMES = ['action', 'ba', 'react', 'min', 'hour', 'special'];
OBSIDIAN.Rules.SPELL_DURATIONS = ['instant', 'dispel', 'special', 'round', 'min', 'hour', 'day'];
OBSIDIAN.Rules.SPELL_RANGES = ['self', 'touch', 'short', 'long'];
OBSIDIAN.Rules.SPELL_SCHOOLS = ['abj', 'con', 'div', 'enc', 'ill', 'trs', 'evo', 'nec'];
OBSIDIAN.Rules.SPELL_SOURCES = ['class', 'custom'];
OBSIDIAN.Rules.SPELL_PREP = ['known', 'prep', 'book'];
OBSIDIAN.Rules.SPELL_PROGRESSION = ['third', 'half', 'full', 'pact', 'artificer'];
OBSIDIAN.Rules.SPELL_RITUALS = ['prep', 'book'];

OBSIDIAN.Rules.SPELLS_KNOWN_TABLE = {
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

OBSIDIAN.Rules.SPELL_SLOT_TABLE = [
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

OBSIDIAN.Rules.WEAPON_CATEGORIES = ['simple', 'martial', 'unarmed'];
