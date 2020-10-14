const CONDITIONS = [
	'dead', 'bleeding', 'blinded', 'charmed', 'deafened',
	'dodging', 'frightened', 'grappled', 'incapacitated',
	'invisible', 'paralysed', 'petrified', 'poisoned',
	'prone', 'restrained', 'stunned', 'unconscious',
	'burning', 'concentrating', 'marked', 'surprised'
];

export function patchConditions () {
	CONFIG.statusEffects = CONDITIONS.map(id => {
		return {
			id: id,
			label: `OBSIDIAN.Condition-${id}`,
			icon: `modules/obsidian/img/conditions/${id}.svg`
		};
	});

	for (let i = 1; i < 7; i++) {
		CONFIG.statusEffects.push({
			id: `exhaust${i}`,
			label: 'OBSIDIAN.Condition-exhaustion',
			icon: `modules/obsidian/img/conditions/exhaust${i}.svg`
		});
	}
}
