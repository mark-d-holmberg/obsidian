import {OBSIDIAN} from '../global.js';

export const Filters = {
	isAttack: filter => filter.filter === 'roll' && filter.roll === 'attack',
	isCheck: filter => filter.filter === 'roll' && filter.roll === 'check',
	isDamage: filter => filter.filter === 'roll' && filter.roll === 'damage',
	isSave: filter => filter.filter === 'roll' && filter.roll === 'save',
	isAbility: filter => filter.check === 'ability',
	isInit: filter => filter.check === 'init',
	damage: {
		isDamage: filter => filter.dmg === 'damage',
		isAttack: filter => filter.dmg === 'attack'
	},
	isSkillOrTool: (filter, tool) => filter.check === (tool ? 'tool' : 'skill'),
	inCollection: (filter, key) =>
		filter.multi === 'any' || filter.collection.some(item => item.key === key),
	isAbilityScore: filter => filter.filter === 'score' && filter.score === 'ability',
	isAC: filter => filter.filter === 'score' && filter.score === 'ac',
	isHP: filter => filter.filter === 'score' && filter.score === 'max-hp',
	isPassive: filter => filter.filter === 'score' && filter.score === 'passive',
	isSpeed: filter => filter.filter === 'score' && filter.score === 'speed',
	isDC: filter => filter.filter === 'score' && filter.score === 'dc',

	rollingAt: (filter, mode) => OBSIDIAN.notDefinedOrEmpty(filter.mode) || filter.mode === mode,

	filterEffects: (effects, collection, pred) =>
		effects.filter(effect => effect.toggle && effect.toggle.active && effect[collection].length)
			.filter(effect => !effect.filters.length || effect.filters.some(pred))
			.flatMap(effect => effect[collection]),

	mods: effects => pred => Filters.filterEffects(effects, 'mods', pred),
	bonuses: effects => pred => Filters.filterEffects(effects, 'bonuses', pred),

	appliesTo: {
		abilityChecks: (ability, mode) => filter =>
			Filters.isCheck(filter)
			&& Filters.isAbility(filter)
			&& Filters.inCollection(filter, ability)
			&& Filters.rollingAt(filter, mode),

		abilityScores: ability => filter =>
			Filters.isAbilityScore(filter) && Filters.inCollection(filter, ability),

		attackRolls: (attack, mode) => {
			const key = attack.attack[0] + attack.category[0];
			return filter =>
				Filters.isAttack(filter)
				&& Filters.inCollection(filter, key)
				&& Filters.rollingAt(filter, mode);
		},

		deathSaves: mode => filter =>
			Filters.isSave(filter)
			&& Filters.inCollection(filter, 'death')
			&& Filters.rollingAt(filter, mode),

		initiative: (ability, mode) => filter =>
			Filters.isCheck(filter)
			&& Filters.rollingAt(filter, mode)
			&& (Filters.isInit(filter)
				|| (Filters.isAbility(filter) && Filters.inCollection(filter, ability))),

		passiveScores: key => filter =>
			Filters.isPassive(filter) && Filters.inCollection(filter, key),

		saveDCs: save => {
			let pred = filter => filter.multi === 'any';
			if (!OBSIDIAN.notDefinedOrEmpty(save.ability)) {
				pred = filter => Filters.inCollection(filter, save.ability);
			}

			return filter => Filters.isDC(filter) && pred(filter);
		},

		savingThrows: (save, mode) => filter =>
			Filters.isSave(filter)
			&& Filters.inCollection(filter, save)
			&& Filters.rollingAt(filter, mode),

		skillChecks: (tool, key, ability, mode) => filter =>
			Filters.isCheck(filter)
			&& Filters.rollingAt(filter, mode)
			&& ((Filters.isSkillOrTool(filter, tool) && Filters.inCollection(filter, key))
			|| (Filters.isAbility(filter) && Filters.inCollection(filter, ability))),

		spellAttacks: (filter, mode) =>
			Filters.isAttack(filter)
			&& Filters.rollingAt(filter, mode)
			&& filter.multi === 'some'
			&& filter.collection.every(item => item.key[1] === 's'),

		spellDCs: filter => Filters.isDC(filter) && Filters.inCollection(filter, 'spell'),

		speedScores: speed => filter =>
			Filters.isSpeed(filter) && Filters.inCollection(filter, speed)
	}
};
