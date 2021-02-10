import {ObsidianActor} from '../module/actor.js';
import {determineMode} from './prepare.js';
import {Effect} from '../module/effect.js';

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

export function conditionsAutoFail (actorData, {ability, roll}) {
	const conditions = actorData.obsidian?.conditions || {};
	const isSave = roll === 'save';
	return isSave && ['str', 'dex'].includes(ability) && (
		conditions.paralysed || conditions.petrified || conditions.stunned
		|| conditions.unconscious);
}

export function conditionsRollMod (actorData, {ability, skill, roll}) {
	let modes = ['reg'];
	const conditions = actorData.obsidian?.conditions || {};
	const exhaustion = conditions.exhaustion || 0;
	const isAttack = roll === 'attack';
	const isCheck = roll === 'check' || skill;
	const isSave = roll === 'save';

	if (ObsidianActor.isRuleActive(actorData, 'heavilyEncumbered')
		&& ['str', 'dex', 'con'].includes(ability))
	{
		modes.push('dis');
	}

	if (ObsidianActor.isRuleActive(actorData, 'noisyArmour')
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
