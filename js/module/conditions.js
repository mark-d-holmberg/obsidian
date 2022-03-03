import {ObsidianActor} from './actor.js';
import {determineMode} from '../data/prepare.js';
import {Effect} from './effect.js';

const CONDITIONS = [
	'dead', 'acidified', 'bleeding', 'blinded',
	'charmed', 'deafened', 'dodging', 'frightened',
	'grappled', 'incapacitated', 'invisible', 'paralysed',
	'petrified', 'poisoned', 'prone', 'restrained',
	'stunned', 'unconscious', 'burning', 'concentrating',
	'marked', 'surprised'
];

export function patchConditions () {
	CONFIG.statusEffects = CONDITIONS.map(id => {
		return {
			id: id,
			label: `OBSIDIAN.Condition.${id}`,
			icon: `modules/obsidian/img/conditions/${id}.svg`
		};
	});

	for (let i = 1; i < 7; i++) {
		CONFIG.statusEffects.push({
			id: `exhaust${i}`,
			label: 'OBSIDIAN.Condition.exhaustion',
			icon: `modules/obsidian/img/conditions/exhaust${i}.svg`
		});
	}
}

export function conditionsAutoFail (actorData, {ability, roll}) {
	const conditions = actorData.obsidian?.conditions || {};
	const isSave = roll === 'save';
	return isSave && ['str', 'dex'].includes(ability) && (
		conditions.paralysed || conditions.petrified || conditions.stunned
		|| conditions.unconscious);
}

export function conditionsRollMod (actor, {ability, skill, roll, applies}) {
	const defenses = actor.obsidian?.defenses.parts.conditions || {adv: [], dis: []};
	const conditions = actor.obsidian?.conditions || {};
	const exhaustion = conditions.exhaustion || 0;
	const isCheck = roll === 'check' || skill;
	const isAttack = roll === 'attack';
	const isSave = roll === 'save';
	let modes = ['reg'];

	if (ObsidianActor.isRuleActive(actor.data, 'heavilyEncumbered')
		&& ['str', 'dex', 'con'].includes(ability))
	{
		modes.push('dis');
	}

	if (ObsidianActor.isRuleActive(actor.data, 'noisyArmour')
		&& ability === 'dex' && skill === 'ste')
	{
		modes.push('dis');
	}

	if (isAttack && (conditions.blinded || conditions.poisoned || conditions.prone)) {
		modes.push('dis');
	}

	if (isCheck && (conditions.poisoned || exhaustion > 0)) {
		modes.push('dis');
	}

	if (isSave && conditions.restrained && ability === 'dex') {
		modes.push('dis');
	}

	if (isAttack && conditions.invisible) {
		modes.push('adv');
	}

	if (exhaustion > 2 && (isSave || isAttack)) {
		modes.push('dis');
	}

	if (isSave) {
		['adv', 'dis'].forEach(mode => {
			if (defenses[mode].some(condition => applies.includes(condition))) {
				modes.push(mode);
			}
		});
	}

	return Effect.makeModeRollMod(determineMode(...modes));
}

export function targetConditionsRollMod (actorData, attackerWithin5ft) {
	let modes = ['reg'];
	const conditions = actorData.obsidian?.conditions || {};

	if (conditions.blinded || conditions.paralysed || conditions.petrified
		|| conditions.restrained || conditions.stunned || conditions.unconscious)
	{
		modes.push('adv');
	}

	if (conditions.invisible) {
		modes.push('dis');
	}

	if (conditions.prone) {
		if (attackerWithin5ft) {
			modes.push('adv');
		} else {
			modes.push('dis');
		}
	}

	return Effect.makeModeRollMod(determineMode(...modes));
}
