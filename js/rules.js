Obsidian.Rules = {};
Obsidian.Rules.CLASSES = [
	'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue',
	'Sorcerer', 'Warlock', 'Wizard', 'Custom'
];
Obsidian.Rules.HD = [2, 4, 6, 8, 10, 12, 20];
Obsidian.Rules.MAX_LEVEL = 20;

Obsidian.Rules.CONDITIONS = [
	'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible',
	'paralysed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
];

Obsidian.Rules.CLASS_HIT_DICE = {
	'Barbarian': 12,
	'Bard': 8,
	'Cleric': 8,
	'Druid': 8,
	'Fighter': 10,
	'Monk': 8,
	'Paladin': 10,
	'Ranger': 10,
	'Rogue': 8,
	'Sorcerer': 6,
	'Warlock': 8,
	'Wizard': 6
};

Obsidian.Rules.PROFICIENCY_LEVELS = {
	0: 'Not Proficient',
	0.5: 'Half Proficient',
	1: 'Proficient',
	2: 'Expertise'
};

Obsidian.Rules.SENSES = {
	dark: 'Darkvision',
	blind: 'Blindsight',
	tremor: 'Tremorsense',
	true: 'Truesight'
};

Obsidian.Rules.SPEEDS = {
	walk: 'Walking',
	burrow: 'Burrowing',
	climb: 'Climbing',
	fly: 'Flying',
	swim: 'Swimming'
};
