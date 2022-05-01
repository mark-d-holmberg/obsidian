// The Config object categorises and enumerates the various options available
// when building characters, items, and effects in the system. Most of these
// are informed by the game rules itself, but some are specific to obsidian's
// implementation of them.

export const Config = {};

Config.ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
Config.WEAPON_TAGS = [
	'adamantine', 'ammunition', 'finesse', 'heavy', 'light', 'loading', 'lance', 'ma', 'net',
	'offhand', 'reach', 'silver', 'thrown', 'twohanded', 'versatile'
];

Config.ALIGNMENTS = ['lg', 'ln', 'le', 'ng', 'n', 'ne', 'cg', 'cn', 'ce'];
Config.ALIGNMENT_PARTS_1 = ['l', 'n', 'c'];
Config.ALIGNMENT_PARTS_2 = ['g', 'n', 'e', 'u'];
Config.ATTACK_TYPES = ['melee', 'ranged'];
Config.ARMOUR_TYPES = ['light', 'medium', 'heavy', 'shield'];
Config.CONSUMABLE_TYPES = ['ammo', 'potion', 'scroll', 'wand', 'rod', 'trinket', 'gear', 'food'];
Config.CLASS_MAP = {
	artificer: 'art', barbarian: 'brb', bard: 'brd', cleric: 'clr', druid: 'drd', fighter: 'fgt',
	monk: 'mnk', paladin: 'pal', ranger: 'rng', rogue: 'rog', sorcerer: 'src', warlock: 'war',
	wizard: 'wiz'
};
Config.CLASSES = [
	'artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger',
	'rogue', 'sorcerer', 'warlock', 'wizard'
];

Config.CURRENCY = ['pp', 'gp', 'ep', 'sp', 'cp'];
Config.DAMAGE_DICE = [4, 6, 8, 10, 12];
Config.DAMAGE_TYPES = [
	'blg', 'prc', 'slh', 'acd', 'cld', 'fir', 'frc', 'lig', 'ncr', 'psn', 'psy', 'rad', 'thn'
];

Config.CONDITION_LEVELS = ['imm', 'adv', 'dis'];
Config.CONDITIONS = [
	'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible',
	'paralysed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
];

Config.CONVERT_CONDITIONS = Config.CONDITIONS.concat('exhaustion');
Config.CONVERT_DAMAGE_TYPES = Config.DAMAGE_TYPES.concat('nonmagical');

Config.CLASS_HIT_DICE = {
	artificer: 8,
	barbarian: 12,
	bard: 8,
	cleric: 8,
	druid: 8,
	fighter: 10,
	monk: 8,
	paladin: 10,
	ranger: 10,
	rogue: 8,
	sorcerer: 6,
	warlock: 8,
	wizard: 6
};

Config.CLASS_SPELL_MODS = {
	artificer: 'int',
	bard: 'cha',
	cleric: 'wis',
	druid: 'wis',
	paladin: 'cha',
	ranger: 'wis',
	sorcerer: 'cha',
	warlock: 'cha',
	wizard: 'int'
};

Config.CLASS_SPELL_PROGRESSION = {
	artificer: 'artificer',
	bard: 'full',
	cleric: 'full',
	druid: 'full',
	paladin: 'half',
	ranger: 'half',
	sorcerer: 'full',
	warlock: 'pact',
	wizard: 'full'
};

Config.CLASS_SPELL_PREP = {
	artificer: 'prep',
	bard: 'known',
	cleric: 'prep',
	druid: 'prep',
	paladin: 'prep',
	ranger: 'known',
	sorcerer: 'known',
	warlock: 'known',
	wizard: 'book'
};

Config.CLASS_RITUALS = {
	artificer: 'prep',
	bard: 'prep',
	cleric: 'prep',
	druid: 'prep',
	wizard: 'book'
};

Config.CREATURE_TAGS = [
	'angel', 'any', 'demon', 'devil', 'inevitable', 'shapechanger', 'titan', 'yugoloth'
];

Config.CREATURE_TYPES = [
	'aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant',
	'humanoid', 'monstrosity', 'object', 'ooze', 'plant', 'undead'
];

Config.DEFENSE_LEVELS = ['res', 'imm', 'vuln'];
Config.EFFECT_ABILITIES = Config.ABILITIES.concat(['spell']);
Config.EFFECT_ADD_SPELLS_METHOD = ['innate', 'known', 'prep', 'list', 'item'];
Config.EFFECT_ADD_SPELLS_SOURCE = ['list', 'individual'];
Config.EFFECT_APPLIED_ON = ['target', 'hit', 'save'];
Config.EFFECT_ATTACK_CATS = ['weapon', 'spell'];
Config.EFFECT_BONUS_LEVEL = ['chr', 'cls'];
Config.EFFECT_BONUS_METHOD = ['dice', 'formula'];
Config.EFFECT_BONUS_VALUES = ['abl', 'prof', 'chr', 'cls'];
Config.EFFECT_CONSUME_CALC = ['fixed', 'var'];
Config.EFFECT_CONSUME_SLOTS = ['any', 'class'];
Config.EFFECT_DAMAGE_TYPES = [
	'blg', 'prc', 'slh', 'acd', 'cld', 'fir', 'frc', 'lig', 'ncr', 'psn', 'psy', 'rad', 'thn', 'hlg'
];

Config.EFFECT_DEFENSES = ['damage', 'condition'];
Config.EFFECT_FILTERS = ['roll', 'score'];
Config.EFFECT_FILTER_ATTACKS = ['mw', 'rw', 'ms', 'rs'];
Config.EFFECT_FILTER_CHECKS = ['ability', 'skill', 'tool', 'init'];
Config.EFFECT_FILTER_DAMAGE = ['damage', 'attack'];
Config.EFFECT_FILTER_IS_MULTI = {
	score: {ability: 1, passive: 1, speed: 1, dc: 1},
	roll: {
		attack: 1, save: 1, damage: 1,
		check: {ability: 1, skill: 1, tool: 1}
	}
};

Config.EFFECT_FILTER_MULTI = ['any', 'some'];
Config.EFFECT_FILTER_ROLLS = ['attack', 'check', 'save', 'damage', 'hd'];
Config.EFFECT_FILTER_SAVES = ['str', 'dex', 'con', 'int', 'wis', 'cha', 'death'];
Config.EFFECT_FILTER_SCORES = ['ability', 'ac', 'max-hp', 'passive', 'prof', 'speed', 'dc', 'carry'];
Config.NPC_FEATURES = ['none', 'action', 'bonus', 'reaction', 'legendary', 'lair'];
Config.EFFECT_RESOURCE_DICE_POOL = [4, 6, 8, 10, 12, 20];
Config.EFFECT_RESOURCE_RECHARGE_CALC = ['all', 'formula'];
Config.EFFECT_SAVE = ['half', 'none'];
Config.EFFECT_SCALING_METHODS = ['spell', 'cantrip', 'resource', 'level', 'class'];
Config.EFFECT_SUMMON_BONUSES = ['abl', 'prof', 'chr', 'cls', 'hp', 'spell', 'upcast'];
Config.EFFECT_TARGETS = ['self', 'individual', 'area'];
Config.EFFECT_TARGETS_AREA = ['cone', 'cube', 'cylinder', 'line', 'sphere'];
Config.ENCUMBRANCE_SIZE_MOD = {tiny: 0.5, sm: 1, med: 1, lg: 2, huge: 4, grg: 8};
Config.ENCUMBRANCE_THRESHOLDS = {encumbered: 5, heavy: 10};
Config.FEAT_ACTION = ['none', 'action', 'bonus', 'reaction', 'special'];
Config.FEAT_TRIGGERS = ['hit', 'start'];
Config.FEAT_SOURCE_TYPES = ['class', 'race', 'feat', 'other'];
Config.FEAT_USES_KEYS = ['abl', 'chr', 'cls', 'prof'];
Config.HD = [2, 4, 6, 8, 10, 12, 20];
Config.INVENTORY_ITEMS = new Set(['weapon', 'equipment', 'consumable', 'backpack', 'tool', 'loot']);
Config.ITEM_CHARGE_DICE = [2, 3, 4, 6, 8, 10, 12, 20];
Config.ITEM_RARITY = ['c', 'uc', 'r', 'vr', 'l', 'a'];
Config.ITEM_RECHARGE = ['long', 'short', 'dawn', 'dusk', 'never', 'roll'];
Config.ITEM_SUBRARITY = ['min', 'maj'];
Config.MAX_LEVEL = 20;
Config.NPC_SIZE_HD = {tiny: 4, sm: 6, med: 8, lg: 10, huge: 12, grg: 20};
Config.PROF_ARMOUR = ['lgt', 'med', 'hvy', 'shl'];
Config.PROF_WEAPON = [
	'sim', 'mar', 'fire', 'club', 'dag', 'gclub', 'haxe', 'jav', 'lham', 'mace', 'staff', 'sickle',
	'spear', 'lxbow', 'dart', 'sbow', 'sling', 'baxe', 'flail', 'glaive', 'gaxe', 'gsword', 'halb',
	'lance', 'lsword', 'maul', 'star', 'pike', 'rapier', 'scim', 'ssword', 'tri', 'wpick', 'wham',
	'whip', 'blow', 'hand', 'hxbow', 'lbow', 'net', 'dscim'
];

Config.PROF_LANG = [
	'common', 'all', 'aarakocra', 'abyssal', 'aquan', 'auran', 'celestial', 'daelkyr', 'deep',
	'draconic', 'druidic', 'dwarvish', 'elvish', 'giant', 'gith', 'gnoll', 'gnomish', 'goblin',
	'halfling', 'ignan', 'infernal', 'kraul', 'loxodon', 'marquesian', 'minotaur', 'naush', 'orc',
	'primordial', 'quori', 'riedran', 'sylvan', 'terran', 'cant', 'undercommon', 'vedalken',
	'zemnian'
];

Config.PROF_TOOLS = ['dis', 'frg', 'hrb', 'nav', 'psn', 'thv', 'vhl', 'vhw'];
Config.PROF_TOOLS_GAME = ['dice', 'chess', 'card', 'ante'];
Config.PROF_TOOLS_ARTISAN = [
	'alc', 'brw', 'cal', 'crp', 'crt', 'cob', 'cook', 'gls', 'jwl', 'lth', 'msn', 'pnt', 'pot',
	'smt', 'tnk', 'wvr', 'wood'
];

Config.PROF_TOOLS_INSTRUMENT = [
	'bag', 'drm', 'dul', 'flt', 'lut', 'lyr', 'hrn', 'pflt', 'swm', 'viol'
];

Config.ALL_TOOLS =
	Config.PROF_TOOLS
		.concat(Config.PROF_TOOLS_GAME)
		.concat(Config.PROF_TOOLS_ARTISAN)
		.concat(Config.PROF_TOOLS_INSTRUMENT);

Config.PLUS_PROF = {
	0.5: 'half',
	1: 'prof',
	2: 'expert'
};

Config.PROFICIENCY_LEVELS = {
	0: 'none',
	0.5: 'half',
	1: 'prof',
	2: 'expert'
};

Config.RESOURCE_USES = ['fixed', 'formula'];
Config.ROLL = ['reg', 'adv', 'dis'];
Config.SKILLS = [
	'acr', 'ani', 'arc', 'ath', 'dec', 'his', 'ins', 'inv', 'itm', 'med', 'nat', 'per', 'prc',
	'prf', 'rel', 'slt', 'ste', 'sur'
];

Config.SPEEDS = ['walk', 'burrow', 'climb', 'fly', 'swim'];
Config.SPELL_COMPONENT_MAP = {v: 'Verbal', s: 'Somatic', m: 'Material', r: 'Royalty'};
Config.SPELL_CAST_TIMES = ['action', 'ba', 'react', 'min', 'hour', 'special'];
Config.SPELL_DURATIONS = ['instant', 'dispel', 'special', 'round', 'min', 'hour', 'day'];
Config.SPELL_RANGES = ['self', 'touch', 'short', 'long', 'unlimited'];
Config.SPELL_SCHOOLS = ['abj', 'con', 'div', 'enc', 'ill', 'trs', 'evo', 'nec'];
Config.SPELL_SOURCES = ['class', 'custom'];
Config.SPELL_PREP = ['known', 'prep', 'book'];
Config.SPELL_PROGRESSION = ['third', 'half', 'full', 'pact', 'artificer'];
Config.SPELL_RITUALS = ['none', 'prep', 'book'];

Config.SPELLS_KNOWN_TABLE = {
	artificer: {
		cantrips: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4],
		known: []
	},
	bard: {
		cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
		known: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22]
	},
	cleric: {
		cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5],
		known: []
	},
	druid: {
		cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
		known: []
	},
	ranger: {
		cantrips: [],
		known: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11]
	},
	sorcerer: {
		cantrips: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6],
		known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15]
	},
	warlock: {
		cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
		known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15]
	},
	wizard: {
		cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5],
		known: []
	}
};

Config.VEHICLE_COMPONENTS = ['hull', 'control', 'movement', 'weapon'];
Config.VEHICLE_LAND_FEATURES = ['none', 'action', 'weapon', 'reaction'];
Config.VEHICLE_WATER_FEATURES = ['action', 'component', 'siege', 'none'];
Config.VEHICLE_TYPES = ['land', 'water', 'air'];
Config.WEAPON_CATEGORIES = ['simple', 'martial', 'unarmed', 'siege'];
Config.WIND_DIRECTIONS = ['reaching', 'with', 'against'];
