import {OBSIDIAN} from './global.js';
import {Config} from './data/config.js';
import {iconD20} from './util/html.js';

// Since the options available in the Config object are so frequently displayed
// in the UI, we make some attempt at matching them up with their corresponding
// translation strings here so that we can pre-translate them and save a little
// overhead in template rendering (at the cost of a bit more memory).
const translations = {
	ABILITIES: ['Ability', 'AbilityAbbr'],
	ALIGNMENTS: 'Alignment',
	ALIGNMENT_PARTS_1: 'AlignmentPt1',
	ALIGNMENT_PARTS_2: 'AlignmentPt2',
	ARMOUR_TYPES: ['ArmourType', 'ArmourTypeFull'],
	ATTACK_TYPES: 'AttackType',
	CLASSES: 'Class',
	DEFENSE_LEVELS: 'DefenseLevel',
	CONDITIONS: 'Condition',
	CONSUMABLE_TYPES: 'ConsumableType',
	CREATURE_TAGS: 'CreatureTag',
	CREATURE_TYPES: 'CreatureType',
	EFFECT_ADD_SPELLS_METHOD: 'AddSpellsMethod',
	EFFECT_ADD_SPELLS_SOURCE: 'AddSpellsSource',
	EFFECT_APPLIED_ON: 'AppliedOn',
	EFFECT_ATTACK_CATS: 'AttackCat',
	EFFECT_BONUS_METHOD: 'BonusMethod',
	EFFECT_BONUS_VALUES: 'BonusValue',
	EFFECT_CONSUME_CALC: 'ConsumeCalc',
	EFFECT_CONSUME_SLOTS: 'ConsumeSlots',
	EFFECT_DAMAGE_TYPES: 'Damage',
	EFFECT_DEFENSES: 'Defense',
	EFFECT_FILTER_ATTACKS: ['Attack', 'AttackFullLC'],
	EFFECT_FILTER_CHECKS: 'Check',
	EFFECT_FILTER_DAMAGE: 'FilterDmg',
	EFFECT_FILTER_MULTI: 'Multi',
	EFFECT_FILTER_SCORES: 'Scores',
	EFFECT_FILTERS: 'Filters',
	EFFECT_RESOURCE_RECHARGE_CALC: 'RechargeCalc',
	EFFECT_SAVE: 'OnSave',
	EFFECT_SCALING_METHODS: 'Scaling',
	FEAT_SOURCE_TYPES: 'FeatSrc',
	FEAT_TRIGGERS: 'Trigger',
	FEAT_USES_KEYS: 'UsesKey',
	ITEM_RARITY: 'Rarity',
	ITEM_RECHARGE: 'Recharge',
	ITEM_SUBRARITY: 'Subrarity',
	PLUS_PROF: 'PlusProf',
	PROF_ARMOUR: 'ArmourProf',
	PROF_LANG: 'Lang',
	PROF_WEAPON: 'WeaponProf',
	PROFICIENCY_LEVELS: 'Proficiency',
	RESOURCE_USES: ['DamageCalc', 'ResourceUses'],
	ROLL: 'Roll',
	SKILLS: 'Skill',
	SPEEDS: ['Speed', 'SpeedAbbr'],
	SPELL_CAST_TIMES: ['CastTime', 'CastTimeAbbr'],
	SPELL_DURATIONS: 'Duration',
	SPELL_PREP: 'SpellPrep',
	SPELL_PROGRESSION: 'SpellProg',
	SPELL_RANGES: 'SpellRange',
	SPELL_RITUALS: 'RitualCast',
	SPELL_SCHOOLS: 'SpellSchool',
	SPELL_SOURCES: 'SpellSrc',
	VEHICLE_COMPONENTS: 'VehicleComponents',
	VEHICLE_TYPES: 'VehicleType',
	WEAPON_CATEGORIES: 'WeaponCat',
	WEAPON_TAGS: 'AtkTag',
	WIND_DIRECTIONS: 'WindDirections'
};

// These ones we cannot be lazy and reuse the translation key as the Labels
// key, we need to provide an explicit alias.
const additionalTranslations = {
	CONDITION_LEVELS: {i18n: 'DefenseLevel', alias: 'ConditionLevel'},
	DAMAGE_TYPES: {i18n: 'Damage', alias: 'DamageOnly'},
	EFFECT_ABILITIES: [
		{i18n: 'Ability', alias: 'AbilitySpell'},
		{i18n: 'AbilityAbbr', alias: 'AbilitySpellAbbr'}
	],
	EFFECT_BONUS_LEVEL: {i18n: 'UsesKey', alias: 'BonusLevel'},
	EFFECT_FILTER_ROLLS: {i18n: 'Roll', alias: 'FilterRoll'},
	EFFECT_SUMMON_BONUSES: {i18n: 'BonusValue', alias: 'SummonBonus'},
	EFFECT_TARGETS: {i18n: 'Target', alias: 'SingleTarget'},
	EFFECT_TARGETS_AREA: {i18n: 'Target', alias: 'AreaTarget'}
};

export function translateLabels () {
	const localize = key => game.i18n.localize(`OBSIDIAN.${key}`);
	const allEntries = Object.entries(translations).concat(Object.entries(additionalTranslations));

	for (let [rulesKey, translationKeys] of allEntries) {
		translationKeys = Array.isArray(translationKeys) ? translationKeys : [translationKeys];
		translationKeys = translationKeys.map(item => {
			if (typeof item === 'string') {
				return {i18n: item, alias: item};
			}

			return item;
		});

		const dataList = Config[rulesKey];

		// We want our data to be in the form of {dataKey: translationKey, ...}
		// so that we can pass it to the selectOptions handlebar helper later.
		// In most cases the key we use internally is the same as the key we
		// use for translation (see Config.PROFICIENCY_LEVELS for an example of
		// an exception to this). So we simply convert those arrays to objects
		// where the key and value are identical. For any that are already
		// objects, we do not need to change them at all, as they are already
		// in the desired format.
		const data = dataList instanceof Array ? dataList.reduce((acc, item) => {
			acc[item] = item;
			return acc;
		}, {}) : dataList;

		// Finally, we perform the actual translation, allowing us to, for
		// example, look up OBSIDIAN.Labels.Ability and receive an object
		// of the form (if we are in English):
		// {str: 'Strength', dex: 'Dexterity', ...}
		// This object can then be passed directly to selectOptions.
		for (const {i18n, alias} of translationKeys) {
			OBSIDIAN.Labels[alias] = {};
			for (const [k, v] of Object.entries(data)) {
				const translation = `${i18n}.${v}`;
				if (game.i18n.has(`OBSIDIAN.${translation}`)) {
					OBSIDIAN.Labels[alias][k] = localize(translation);
				}
			}
		}
	}

	// And finally some special ones.
	OBSIDIAN.Labels.DamageOnlySpell =
		{...OBSIDIAN.Labels.DamageOnly, spell: localize('Damage.spell')};

	OBSIDIAN.Labels.ConditionExh =
		{...OBSIDIAN.Labels.Condition, exhaustion: localize('Condition.exhaustion')};

	OBSIDIAN.Labels.DamageWpn = {wpn: localize('Damage.wpn'), ...OBSIDIAN.Labels.Damage};
	OBSIDIAN.Labels.SkillCustom = {...OBSIDIAN.Labels.Skill, custom: localize('Custom')};
	OBSIDIAN.Labels.DamageSpell = {...OBSIDIAN.Labels.Damage, spell: localize('Damage.spell')};

	addRules(localize);
}

function addRules (localize) {
	OBSIDIAN.Labels.Rules = {};
	const rules = OBSIDIAN.Labels.Rules;
	const physical = ['str', 'dex', 'con'];
	const ability = abl => localize(`AbilityAbbr.${abl}`);
	const abilities = (...abls) => abls.map(abl => ability(abl)).join('&sol;');
	const disadvantageOn = (roll, ...abls) =>
		`${iconD20({advantage: false})} ${localize(roll)} `
		+ `(${abilities(...abls)})`;

	rules.encumbered = `<strong>-10</strong> ${localize('SpeedLC')}`;
	rules.heavyArmour = `<strong>-10</strong> ${localize('SpeedLC')}`;
	rules.overCapacity = `${localize('SpeedLC')} <strong>0</strong>`;
	rules.noisyArmour = `${iconD20({advantage: false})} ${localize('Skill.ste')}`;
	rules.heavilyEncumbered =
		`<strong>-20</strong> ${localize('SpeedLC')}; `
		+ `${disadvantageOn('AbilityChecks', ...physical)}; `
		+ `${disadvantageOn('AttackRolls', ...physical)}; `
		+ `${disadvantageOn('SavingThrowsLC', ...physical)}`;
}
