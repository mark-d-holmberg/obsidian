export const DAMAGE_CONVERT = {
	bludgeoning: 'blg', piercing: 'prc', slashing: 'slh', acid: 'acd', cold: 'cld', fire: 'fir',
	force: 'frc', lightning: 'lig', necrotic: 'ncr', poison: 'psn', psychic: 'psy',
	radiant: 'rad', thunder: 'thn', healing: 'hlg'
};

export const CONVERT = {
	activation: {action: 'action', ba: 'bonus', react: 'reaction', trigger: 'special'},
	castTime: {
		action: 'action', bonus: 'ba', reaction: 'react', minute: 'min', hour: 'hour',
		special: 'special'
	},
	consumable: {
		potion: 'potion', poison: 'potion', scroll: 'scroll', wand: 'wand', rod: 'rod',
		trinket: 'trinket'
	},
	damage: DAMAGE_CONVERT,
	duration: {
		inst: 'instant', perm: 'dispel', spec: 'special', round: 'round', minute: 'min',
		hour: 'hour', day: 'day'
	},
	range: {self: 'self', touch: 'touch', ft: 'short', mi: 'long', any: 'unlimited'},
	recharge: {sr: 'short', lr: 'long', day: 'dawn'},
	size: {tiny: 'tiny', small: 'sm', medium: 'med', large: 'lg', huge: 'huge', gargantuan: 'grg'},
	spellComponents: {vocal: 'v', somatic: 's', material: 'm'},
	tags: {
		ver: 'versatile', hvy: 'heavy', fin: 'finesse', lgt: 'light', lod: 'loading', rch: 'reach',
		thr: 'thrown', two: 'twohanded'
	},
	validTargetTypes: new Set(['creature', 'object', 'sphere', 'cylinder', 'cone', 'cube', 'line'])
};