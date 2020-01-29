export const FILTERS = {
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
	isDC: filter => filter.filter === 'score' && filter.score === 'dc'
};
