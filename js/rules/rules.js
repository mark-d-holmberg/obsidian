export const Rules = {};
Rules.ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

Rules.WEAPON_TAGS = [
	'adamantine', 'ammunition', 'finesse', 'heavy', 'light', 'loading', 'lance', 'ma', 'net',
	'offhand', 'reach', 'silver', 'thrown', 'twohanded', 'versatile'
];

Rules.ALIGNMENTS = ['lg', 'ln', 'le', 'ng', 'n', 'ne', 'cg', 'cn', 'ce'];
Rules.ALIGNMENT_PARTS_1 = ['l', 'c'];
Rules.ALIGNMENT_PARTS_2 = ['g', 'n', 'e', 'u'];
Rules.ATTACK_TYPES = ['melee', 'ranged'];
Rules.ARMOUR_TYPES = ['light', 'medium', 'heavy', 'shield'];
Rules.CARRY_MULTIPLIER = 15;
Rules.COIN_WEIGHT = 0.02;
Rules.CONSUMABLE_TYPES = ['ammo', 'potion', 'scroll', 'wand', 'rod', 'trinket', 'gear'];
Rules.CLASSES = [
	'art', 'brb', 'brd', 'clr', 'drd', 'fgt', 'mnk', 'pal', 'rng', 'rog', 'src', 'war', 'wiz',
	'custom'
];

Rules.CURRENCY = ['pp', 'gp', 'ep', 'sp', 'cp'];
Rules.DAMAGE_DICE = [4, 6, 8, 10, 12];
Rules.DAMAGE_TYPES = [
	'blg', 'prc', 'slh', 'acd', 'cld', 'fir', 'frc', 'lig', 'ncr', 'psn', 'psy', 'rad', 'thn'
];

Rules.CONDITION_LEVELS = ['imm', 'adv', 'dis'];
Rules.CONDITIONS = [
	'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible',
	'paralysed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
];

Rules.CONVERT_CONDITIONS = Rules.CONDITIONS.concat('exhaustion');
Rules.CONVERT_DAMAGE_TYPES = Rules.DAMAGE_TYPES.concat('nonmagical');

Rules.CLASS_HIT_DICE = {
	art: 8,
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

Rules.CLASS_SPELL_MODS = {
	art: 'int',
	brd: 'cha',
	clr: 'wis',
	drd: 'wis',
	pal: 'cha',
	rng: 'wis',
	src: 'cha',
	war: 'cha',
	wiz: 'int'
};

Rules.CLASS_SPELL_PROGRESSION = {
	art: 'artificer',
	brd: 'full',
	clr: 'full',
	drd: 'full',
	pal: 'half',
	rng: 'half',
	src: 'full',
	war: 'pact',
	wiz: 'full'
};

Rules.CLASS_SPELL_PREP = {
	art: 'prep',
	brd: 'known',
	clr: 'prep',
	drd: 'prep',
	pal: 'prep',
	rng: 'known',
	src: 'known',
	war: 'known',
	wiz: 'book'
};

Rules.CLASS_RITUALS = {
	art: 'prep',
	brd: 'prep',
	clr: 'prep',
	drd: 'prep',
	wiz: 'book'
};

Rules.CREATURE_TAGS = [
	'angel', 'any', 'demon', 'devil', 'inevitable', 'shapechanger', 'titan', 'yugoloth'
];

Rules.CREATURE_TYPES = [
	'aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant',
	'humanoid', 'monstrosity', 'ooze', 'plant', 'undead'
];

Rules.DEFENSE_LEVELS = ['res', 'imm', 'vuln'];
Rules.EFFECT_ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha', 'spell'];
Rules.EFFECT_ADD_SPELLS_METHOD = ['innate', 'known', 'prep', 'list', 'item'];
Rules.EFFECT_ADD_SPELLS_SOURCE = ['list', 'individual'];
Rules.EFFECT_APPLIED_ON = ['target', 'hit', 'save'];
Rules.EFFECT_ATTACK_CATS = ['weapon', 'spell'];
Rules.EFFECT_BONUS_LEVEL = ['chr', 'cls'];
Rules.EFFECT_BONUS_VALUES = ['abl', 'prof', 'chr', 'cls'];
Rules.EFFECT_CONSUME_CALC = ['fixed', 'var'];

Rules.EFFECT_CONSUME_SLOTS = ['any', 'class'];
Rules.EFFECT_DAMAGE_TYPES = [
	'blg', 'prc', 'slh', 'acd', 'cld', 'fir', 'frc', 'lig', 'ncr', 'psn', 'psy', 'rad', 'thn', 'hlg'
];

Rules.EFFECT_DEFENSES = ['damage', 'condition'];
Rules.EFFECT_FILTERS = ['roll', 'score'];
Rules.EFFECT_FILTER_ATTACKS = ['mw', 'rw', 'ms', 'rs'];
Rules.EFFECT_FILTER_CHECKS = ['ability', 'skill', 'tool', 'init'];
Rules.EFFECT_FILTER_DAMAGE = ['damage', 'attack'];
Rules.EFFECT_FILTER_IS_MULTI = {
	score: {ability: 1, passive: 1, speed: 1, dc: 1},
	roll: {
		attack: 1, save: 1, damage: 1,
		check: {ability: 1, skill: 1, tool: 1}
	}
};

Rules.EFFECT_FILTER_MULTI = ['any', 'some'];
Rules.EFFECT_FILTER_ROLLS = ['attack', 'check', 'save', 'damage'];
Rules.EFFECT_FILTER_SAVES = ['str', 'dex', 'con', 'int', 'wis', 'cha', 'death'];
Rules.EFFECT_FILTER_SCORES = ['ability', 'ac', 'max-hp', 'passive', 'prof', 'speed', 'dc'];
Rules.NPC_FEATURES = ['none', 'action', 'reaction', 'legendary', 'lair'];
Rules.EFFECT_RESOURCE_RECHARGE_CALC = ['all', 'formula'];
Rules.EFFECT_SAVE = ['half', 'none'];
Rules.EFFECT_SCALING_METHODS = ['spell', 'cantrip', 'resource', 'level', 'class'];
Rules.EFFECT_TARGETS = ['self', 'individual', 'area'];
Rules.EFFECT_TARGETS_AREA = ['cone', 'cube', 'cylinder', 'line', 'sphere'];
Rules.FEAT_ACTION = ['none', 'action', 'bonus', 'reaction', 'special'];
Rules.FEAT_TRIGGERS = ['hit', 'start'];
Rules.FEAT_SOURCE_TYPES = ['class', 'race', 'feat', 'other'];
Rules.FEAT_USES_KEYS = ['abl', 'chr', 'cls'];
Rules.HD = [2, 4, 6, 8, 10, 12, 20];
Rules.ITEM_CHARGE_DICE = [2, 3, 4, 6, 8, 10, 12, 20];
Rules.ITEM_RECHARGE = ['long', 'short', 'dawn', 'dusk', 'never', 'roll'];
Rules.MAX_LEVEL = 20;
Rules.NON_CASTERS = ['brb', 'fgt', 'mnk', 'rog'];
Rules.PROF_ARMOUR = ['lgt', 'med', 'hvy', 'shl'];
Rules.PROF_WEAPON = [
	'sim', 'mar', 'fire', 'club', 'dag', 'gclub', 'haxe', 'jav', 'lham', 'mace', 'staff', 'sickle',
	'spear', 'lxbow', 'dart', 'sbow', 'sling', 'baxe', 'flail', 'glaive', 'gaxe', 'gsword', 'halb',
	'lance', 'lsword', 'maul', 'star', 'pike', 'rapier', 'scim', 'ssword', 'tri', 'wpick', 'wham',
	'whip', 'blow', 'hand', 'hxbow', 'lbow', 'net', 'dscim'
];

Rules.PROF_LANG = [
	'common', 'all', 'aarakocra', 'abyssal', 'aquan', 'auran', 'celestial', 'daelkyr', 'deep',
	'draconic', 'druidic', 'dwarvish', 'elvish', 'giant', 'gith', 'gnoll', 'gnomish', 'goblin',
	'halfling', 'ignan', 'infernal', 'kraul', 'loxodon', 'marquesian', 'minotaur', 'naush', 'orc',
	'primordial', 'quori', 'riedran', 'sylvan', 'terran', 'cant', 'undercommon', 'vedalken',
	'zemnian'
];

Rules.PROF_TOOLS = ['dis', 'frg', 'hrb', 'nav', 'psn', 'thv', 'vhl', 'vhw'];
Rules.PROF_TOOLS_GAME = ['dice', 'chess', 'card', 'ante'];
Rules.PROF_TOOLS_ARTISAN = [
	'alc', 'brw', 'cal', 'crp', 'crt', 'cob', 'cook', 'gls', 'jwl', 'lth', 'msn', 'pnt', 'pot',
	'smt', 'tnk', 'wvr', 'wood'
];

Rules.PROF_TOOLS_INSTRUMENT = [
	'bag', 'drm', 'dul', 'flt', 'lut', 'lyr', 'hrn', 'pflt', 'swm', 'viol'
];

Rules.ALL_TOOLS =
	Rules.PROF_TOOLS
		.concat(Rules.PROF_TOOLS_GAME)
		.concat(Rules.PROF_TOOLS_ARTISAN)
		.concat(Rules.PROF_TOOLS_INSTRUMENT);

Rules.PLUS_PROF = {
	0.5: 'half',
	1: 'prof',
	2: 'expert'
};

Rules.PROFICIENCY_LEVELS = {
	0: 'none',
	0.5: 'half',
	1: 'prof',
	2: 'expert'
};

Rules.RESOURCE_USES = ['fixed', 'formula'];
Rules.ROLL = ['reg', 'adv', 'dis'];
Rules.SENSES = ['dark', 'blind', 'tremor', 'true'];
Rules.SKILLS = [
	'acr', 'ani', 'arc', 'ath', 'dec', 'his', 'ins', 'inv', 'itm', 'med', 'nat', 'per', 'prc',
	'prf', 'rel', 'slt', 'ste', 'sur'
];

Rules.SPEEDS = ['walk', 'burrow', 'climb', 'fly', 'swim'];
Rules.SPELL_COMPONENT_MAP = {v: 'Verbal', s: 'Somatic', m: 'Material', r: 'Royalty'};
Rules.SPELL_CAST_TIMES = ['action', 'ba', 'react', 'min', 'hour', 'special'];
Rules.SPELL_DURATIONS = ['instant', 'dispel', 'special', 'round', 'min', 'hour', 'day'];
Rules.SPELL_RANGES = ['self', 'touch', 'short', 'long', 'unlimited'];
Rules.SPELL_SCHOOLS = ['abj', 'con', 'div', 'enc', 'ill', 'trs', 'evo', 'nec'];
Rules.SPELL_SOURCES = ['class', 'custom'];
Rules.SPELL_PREP = ['known', 'prep', 'book'];
Rules.SPELL_PROGRESSION = ['third', 'half', 'full', 'pact', 'artificer'];
Rules.SPELL_RITUALS = ['none', 'prep', 'book'];

Rules.SPELLS_KNOWN_TABLE = {
	art: {
		cantrips: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4],
		known: []
	},
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

Rules.VEHICLE_LAND_FEATURES = ['none', 'action', 'weapon', 'reaction'];
Rules.VEHICLE_WATER_FEATURES = ['action', 'component', 'siege', 'none'];
Rules.VEHICLE_TYPES = ['land', 'water'];
Rules.WEAPON_CATEGORIES = ['simple', 'martial', 'unarmed', 'siege'];
