import {OBSIDIAN} from '../global.js';

export const Filters = {
	isAttack: filter => filter.filter === 'roll' && filter.roll === 'attack',
	isCheck: filter => filter.filter === 'roll' && filter.roll === 'check',
	isDamage: filter => filter.filter === 'roll' && filter.roll === 'damage',
	isSave: filter => filter.filter === 'roll' && filter.roll === 'save',
	isHD: filter => filter.filter === 'roll' && filter.roll === 'hd',
	isAbility: filter => filter.check === 'ability',
	isInit: filter => filter.check === 'init',
	damage: {
		isDamage: filter => filter.dmg === 'damage',
		isAttack: filter => filter.dmg === 'attack'
	},
	isSkill: filter => filter.check === 'skill',
	isTool: filter => filter.check === 'tool',
	inCollection: (filter, key) =>
		filter.multi === 'any' || filter.collection.some(item => item.key === key),
	isAbilityScore: filter => filter.filter === 'score' && filter.score === 'ability',
	isAC: filter => filter.filter === 'score' && filter.score === 'ac',
	isHP: filter => filter.filter === 'score' && filter.score === 'max-hp',
	isPassive: filter => filter.filter === 'score' && filter.score === 'passive',
	isSpeed: filter => filter.filter === 'score' && filter.score === 'speed',
	isDC: filter => filter.filter === 'score' && filter.score === 'dc',
	isProf: filter => filter.filter === 'score' && filter.score === 'prof',
	isCarry: filter => filter.filter === 'score' && filter.score === 'carry',

	rollingAt: (filter, mode) => OBSIDIAN.notDefinedOrEmpty(filter.mode) || filter.mode === mode,
	usesAbility: (filter, abl) =>
		OBSIDIAN.notDefinedOrEmpty(filter.usesAbility) || filter.usesAbility.abilities[abl],

	filterEffects: (effects, collection, pred) =>
		effects.filter(effect =>
			effect.toggle && effect.toggle.active && effect.active[collection].length)
			.filter(effect => !effect.filters.length || effect.filters.some(pred))
			.flatMap(effect => effect.active[collection]),

	mods: effects => pred => Filters.filterEffects(effects, 'roll-mod', pred),
	bonuses: effects => pred => Filters.filterEffects(effects, 'bonus', pred),
	setters: effects => pred => Filters.filterEffects(effects, 'setter', pred),
	conditions: effects => Filters.filterEffects(effects, 'condition', () => true),
	multipliers: effects => pred => Filters.filterEffects(effects, 'multiplier', pred),

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
				&& Filters.rollingAt(filter, mode)
				&& Filters.usesAbility(filter, attack.ability);
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

		skillChecks: (key, ability, mode) => filter =>
			Filters.isCheck(filter)
			&& Filters.rollingAt(filter, mode)
			&& ((Filters.isSkill(filter) && Filters.inCollection(filter, key))
			|| (Filters.isAbility(filter) && Filters.inCollection(filter, ability))),

		spellAttacks: (filter, mode) =>
			Filters.isAttack(filter)
			&& Filters.rollingAt(filter, mode)
			&& filter.multi === 'some'
			&& filter.collection.every(item => item.key[1] === 's'),

		spellDCs: filter => Filters.isDC(filter) && Filters.inCollection(filter, 'spell'),

		speedScores: speed => filter =>
			Filters.isSpeed(filter) && Filters.inCollection(filter, speed),

		toolChecks: (key, ability, mode) => filter =>
			Filters.isCheck(filter)
			&& Filters.rollingAt(filter, mode)
			&& ((Filters.isTool(filter) && Filters.inCollection(filter, key))
			|| (Filters.isAbility(filter) && Filters.inCollection(filter, ability)))
	}
};
