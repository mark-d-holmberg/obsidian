const ObsidianRules = {};
ObsidianRules.CLASSES = [
	'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue',
	'Sorcerer', 'Warlock', 'Wizard', 'Custom'
];
ObsidianRules.HD = [2, 4, 6, 8, 10, 12, 20];
ObsidianRules.MAX_LEVEL = 20;

ObsidianRules.Conditions = [
	'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible',
	'paralysed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
];

ObsidianRules.ClassHitDice = {
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

ObsidianRules.ProficiencyLevels = {
	0: 'Not Proficient',
	0.5: 'Half Proficient',
	1: 'Proficient',
	2: 'Expertise'
};

ObsidianRules.Speeds = {
	walk: 'Walking',
	burrow: 'Burrowing',
	climb: 'Climbing',
	fly: 'Flying',
	swim: 'Swimming'
};
