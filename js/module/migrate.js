import {Schema} from './schema.js';
import {ObsidianHeaderDetailsDialog} from '../dialogs/char-header.js';
import {OBSIDIAN} from '../global.js';
import {Effect} from './effect.js';

export const DAMAGE_CONVERT = {
	bludgeoning: 'blg', piercing: 'prc', slashing: 'slh', acid: 'acd', cold: 'cld', fire: 'fir',
	force: 'frc', lightning: 'lig', necrotic: 'ncr', poison: 'psn', psychic: 'psy',
	radiant: 'rad', thunder: 'thn', healing: 'hlg'
};

const CONVERT = {
	activation: {action: 'action', bonus: 'ba', reaction: 'react'},
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

const OPERATORS = {
	'+': (a, b) => a + b,
	'-': (a, b) => a - b
};

export const Migrate = {
	convertActor: function (data) {
		if (!data.flags) {
			data.flags = {};
		}

		let source = 'obsidian';
		if (!data.flags.obsidian) {
			source = 'core';
		}

		data.flags.obsidian =
			mergeObject(Schema.Actor, data.flags.obsidian || {}, {inplace: false});

		if (data.flags.obsidian.version === undefined) {
			data.flags.obsidian.version = 0;
		}

		if (data.flags.obsidian.version < 2) {
			Migrate.convertNotes(data, source);
			Migrate.convertProficiencies(data, source);
			Migrate.convertSpecial(data, source);
		}

		if (source !== 'core' && data.flags.obsidian.version < 5) {
			Migrate.v4.convertSpellcasting(data);
		}

		data.flags.obsidian.version = Schema.VERSION;
		return data;
	},

	convertItem: function (data, actor) {
		if (!data.data) {
			data.data = {};
		}

		if (!data.flags) {
			data.flags = {};
		}

		let source = 'obsidian';
		if (!data.flags.obsidian) {
			data.flags.obsidian = {};
			source = 'core';
		}

		if (data.type === 'spell' && !data.flags.obsidian.components) {
			// This is an awkward case where we actually attach some flags to
			// spells when they come in via 'Manage Spells', so our usual
			// detection for whether an item is from core or is already
			// obsidian-enriched fails.
			source = 'core';
		}

		if (data.type === 'class') {
			Migrate.convertClass(data, source);
		} else if (data.type === 'consumable') {
			data.flags.obsidian =
				mergeObject(Schema.Consumable, data.flags.obsidian || {}, {inplace: false});
		} else if (data.type === 'backpack') {
			data.flags.obsidian =
				mergeObject(Schema.Container, data.flags.obsidian || {}, {inplace: false});
		} else if (data.type === 'equipment') {
			data.flags.obsidian =
				mergeObject(Schema.Equipment, data.flags.obsidian || {}, {inplace: false});
		} else if (data.type === 'feat') {
			data.flags.obsidian =
				mergeObject(Schema.Feature, data.flags.obsidian || {}, {inplace: false});
		} else if (data.type === 'spell') {
			data.flags.obsidian =
				mergeObject(Schema.Spell, data.flags.obsidian || {}, {inplace: false});
		} else if (data.type === 'weapon') {
			data.flags.obsidian =
				mergeObject(Schema.Weapon, data.flags.obsidian || {}, {inplace: false});
		} else if (data.type === 'tool') {
			data.flags.obsidian = {};
		}

		if (!data.flags.obsidian.effects) {
			data.flags.obsidian.effects = [];
		}

		if (data.flags.obsidian.version === undefined) {
			data.flags.obsidian.version = 0;
		}

		if (data.flags.obsidian.version < 2) {
			Migrate.deOrphan(data);
			if (data.type === 'backpack') {
				Migrate.convertContainer(data);
			} else if (data.type === 'consumable') {
				Migrate.convertConsumable(data, source);
			} else if (data.type === 'equipment') {
				Migrate.convertEquipment(data, source);
			} else if (data.type === 'feat') {
				Migrate.convertFeature(data, source, actor);
			} else if (data.type === 'spell') {
				Migrate.convertSpell(data, source, actor);
			} else if (data.type === 'weapon') {
				Migrate.convertWeapon(data, source);
			}

			if (source === 'core') {
				Migrate.core.convertActivation(data);
				Migrate.core.convertAttack(data);
			}
		}

		if (data.type === 'weapon' && data.flags.obsidian.version < 2
			&& (!data.flags.obsidian.effects || !data.flags.obsidian.effects.length))
		{
			data.flags.obsidian.effects = [Effect.create()];
			data.flags.obsidian.effects[0].components = [Effect.newAttack(), Effect.newDamage()];
			data.flags.obsidian.effects[0].components[0].proficient = true;
		}

		if (data.type === 'consumable'
			&& data.flags.obsidian.version < 2
			&& !data.flags.obsidian.unlimited
			&& (!data.flags.obsidian.effects
				|| !data.flags.obsidian.effects.length
				|| !data.flags.obsidian.effects.some(e =>
					e.components.some(c => c.type === 'consume' || c.type === 'resource'))))
		{
			if (!data.flags.obsidian.effects || !data.flags.obsidian.effects.length) {
				data.flags.obsidian.effects.push(Effect.create());
			}

			const component = Effect.newConsume();
			component.target = 'qty';
			data.flags.obsidian.effects[0].components.push(component);
		}

		if (data.type === 'class' && data.flags.obsidian.version < 4 && source !== 'core') {
			Migrate.v3.convertHD(data);
		}

		data.flags.obsidian.version = Schema.VERSION;
		return data;
	},

	convertClass: function (data, source) {
		if (source === 'core') {
			const official =
				OBSIDIAN.Rules.CLASSES.find(cls =>
					data.name === game.i18n.localize(`OBSIDIAN.Class-${cls}`));

			if (official) {
				data.name = official;
			} else {
				const name = data.name;
				data.name = 'custom';
				data.flags.obsidian.custom = name;
			}
		}

		if (!data.data.hitDice) {
			data.data.hitDice = ObsidianHeaderDetailsDialog.determineHD(data.name);
		}

		data.flags.obsidian.spellcasting =
			ObsidianHeaderDetailsDialog.determineSpellcasting(data.name);

		if (data.flags.obsidian.spellcasting.progression) {
			data.data.spellcasting = data.flags.obsidian.spellcasting.progression;
		}

		if (!data.data.spellcasting || data.data.spellcasting === 'none') {
			data.data.spellcasting = OBSIDIAN.Rules.CLASS_SPELL_PROGRESSION[data.name] || 'none';
		}
	},

	convertConsumable: function (data, source) {
		const primaryEffect = Effect.create();
		if (data.flags.obsidian.uses && data.flags.obsidian.uses.enabled) {
			Migrate.v1.convertConsumableUses(data, primaryEffect);
		}

		if (data.flags.obsidian.dc && data.flags.obsidian.dc.enabled) {
			primaryEffect.components.push(Migrate.v1.convertSave(data.flags.obsidian.dc));
		}

		if (data.flags.obsidian.hit && data.flags.obsidian.hit.enabled) {
			const attack = data.flags.obsidian.hit;
			primaryEffect.components.push(
				Migrate.v1.convertAttack(attack, attack.attack, 'weapon'));
		}

		for (const dmg of data.flags.obsidian.damage || []) {
			primaryEffect.components.push(Migrate.v1.convertDamage(dmg));
		}

		if (primaryEffect.components.length) {
			data.flags.obsidian.effects.push(primaryEffect);
		}

		if (source === 'core' && CONVERT.consumable[data.data.consumableType]) {
			data.flags.obsidian.subtype = CONVERT.consumable[data.data.consumableType];
		}
	},

	convertContainer: function (data) {
		if (getProperty(data, 'flags.obsidian.weightless')) {
			data.data.capacity.weightless = true;
		}
	},

	convertEquipment: function (data, source) {
		if (!data.data.armor) {
			return;
		}

		if (data.flags.obsidian.maxDex !== undefined) {
			data.data.armor.dex = String(data.flags.obsidian.maxDex);
		}

		data.flags.obsidian.magical = !!data.flags.obsidian.magic;
		data.data.armor.value += data.flags.obsidian.magic || 0;

		if (isNaN(Number(data.data.strength))) {
			data.data.strength = '';
		}

		if (source !== 'core') {
			return;
		}

		if (data.data.armor.value) {
			data.flags.obsidian.armour = true;
		}

		if (data.data.armor.dex !== 0 && data.data.armor.type !== 'shield') {
			data.flags.obsidian.addDex = true;
		}
	},

	convertFeature: function (data, source, actor) {
		const classMap = new Map();
		if (actor) {
			actor.data.items
				.filter(item =>
					item.type === 'class' && item.flags && item.flags.obsidian
					&& item.flags.obsidian.uuid)
				.forEach(cls => classMap.set(cls.flags.obsidian.uuid, cls));
		}

		const primaryEffect = Effect.create();
		if (data.flags.obsidian.uses && data.flags.obsidian.uses.enabled) {
			primaryEffect.components.push(
				Migrate.v1.convertUses(data.flags.obsidian.uses, classMap));
		}

		if (data.flags.obsidian.dc && data.flags.obsidian.dc.enabled) {
			primaryEffect.components.push(Migrate.v1.convertSave(data.flags.obsidian.dc));
		}

		if (data.flags.obsidian.hit && data.flags.obsidian.hit.enabled) {
			const attack = data.flags.obsidian.hit;
			primaryEffect.components.push(
				Migrate.v1.convertAttack(attack, attack.attack, attack.type));
		}

		for (const dmg of data.flags.obsidian.damage || []) {
			primaryEffect.components.push(Migrate.v1.convertDamage(dmg));
		}

		if (primaryEffect.components.length) {
			data.flags.obsidian.effects.push(primaryEffect);
		}

		if (data.flags.obsidian.source && data.flags.obsidian.source.type === 'class') {
			const cls = classMap.get(data.flags.obsidian.source.class);
			if (cls) {
				data.flags.obsidian.source.class = cls._id;
			}
		}

		if (source === 'core') {
			data.flags.obsidian.source.type = 'other';
		}
	},

	convertProficiencies: function (data, source) {
		if (!data.data) {
			return;
		}

		const traits = data.data.traits;
		const flags = getProperty(data, 'flags.obsidian.traits.profs.custom');
		const translateOrElseOriginal = (key, original) => {
			const translation = game.i18n.localize(key);
			return translation === key ? original : translation;
		};

		['armorProf', 'weaponProf', 'languages', 'toolProf'].forEach(prop => {
			if (!traits[prop]) {
				traits[prop] = {value: []};
			}
		});

		if (source === 'obsidian' && flags) {
			traits.armorProf.value = flags.armour ? duplicate(flags.armour) : [];
			traits.weaponProf.value = flags.weapons ? duplicate(flags.weapons) : [];
			traits.languages.value = flags.langs ? duplicate(flags.langs) : [];
		} else if (source === 'core') {
			traits.armorProf.value =
				traits.armorProf.value.map(prof =>
					translateOrElseOriginal(`OBSIDIAN.ArmourProf-${prof}`, prof));

			traits.weaponProf.value =
				traits.weaponProf.value.map(prof =>
					translateOrElseOriginal(`OBSIDIAN.WeaponProf-${prof}`, prof));

			traits.languages.value =
				traits.languages.value.map(prof =>
					translateOrElseOriginal(`OBSIDIAN.Lang-${prof}`, prof));

			data.flags.obsidian.skills.tools.push(...traits.toolProf.value.map(prof => {
				return {
					ability: 'str', bonus: 0, value: 0, custom: true,
					label: translateOrElseOriginal(`OBSIDIAN.ToolProf-${prof}`, prof)
				}
			}));
		}
	},

	convertNotes: function (data, source) {
		if (source === 'obsidian' && getProperty(data, 'data.traits') !== undefined) {
			data.data.traits.size = CONVERT.size[data.flags.obsidian.details.size];
		} else if (source === 'core' && getProperty(data, 'data.details') !== undefined) {
			for (const alignment of OBSIDIAN.Rules.ALIGNMENTS) {
				const translation = game.i18n.localize(`OBSIDIAN.Alignment-${alignment}`);
				if (translation.toLowerCase() === data.data.details.alignment.toLowerCase()) {
					data.data.details.alignment = alignment;
					break;
				}
			}
		}
	},

	convertSpecial: function (data, source) {
		if (source !== 'core') {
			return;
		}

		const flags = data.flags.obsidian;
		const dndFlags = getProperty(data, 'flags.dnd5e');

		if (dndFlags) {
			if (dndFlags.initiativeAdv) {
				flags.attributes.init.roll = 'adv';
			}
		}
	},

	convertSpell: function (data, source, actor) {
		const classMap = new Map();
		if (actor) {
			actor.data.items
				.filter(item =>
					item.type === 'class' && item.flags && item.flags.obsidian
					&& item.flags.obsidian.uuid)
				.forEach(cls => classMap.set(cls.flags.obsidian.uuid, cls));
		}

		const spellEffect = Effect.create();
		const scalingEffect = Effect.create();
		const resourceEffect = Effect.create();
		scalingEffect.name = game.i18n.localize('OBSIDIAN.Scaling');

		if (data.flags.obsidian.dc && data.flags.obsidian.dc.enabled) {
			spellEffect.components.push(Migrate.v1.convertSave(data.flags.obsidian.dc));
		}

		if (data.flags.obsidian.hit && data.flags.obsidian.hit.enabled) {
			const attack = data.flags.obsidian.hit;
			spellEffect.components.push(Migrate.v1.convertAttack(attack, attack.attack, 'spell'));

			if (attack.count > 1) {
				const component = Effect.newTarget();
				spellEffect.components.push(component);
				component.count = attack.count;
			}
		}

		for (const dmg of data.flags.obsidian.damage || []) {
			spellEffect.components.push(Migrate.v1.convertDamage(dmg));
		}

		if (spellEffect.components.length) {
			data.flags.obsidian.effects.push(spellEffect);
		}

		if (data.flags.obsidian.upcast
			&& (data.flags.obsidian.upcast.enabled || data.data.level < 1))
		{
			const upcast = data.flags.obsidian.upcast;
			if (upcast.natk > 0 && upcast.nlvl > 0) {
				const component = Effect.newTarget();
				scalingEffect.components.push(component);
				component.count = upcast.natk / upcast.nlvl;
			}

			for (const dmg of upcast.damage || []) {
				scalingEffect.components.push(Migrate.v1.convertDamage(dmg));
			}
		}

		if (scalingEffect.components.length) {
			const scaling = Effect.newScaling();
			scalingEffect.components.unshift(scaling);
			scaling.method = data.data.level < 1 ? 'cantrip' : 'spell';
			scaling.ref = spellEffect.uuid;
			data.flags.obsidian.effects.push(scalingEffect);
		}

		if (data.flags.obsidian.uses
			&& data.flags.obsidian.uses.enabled
			&& data.flags.obsidian.uses.limit !== 'unlimited')
		{
			data.flags.obsidian.effects.push(resourceEffect);
			Migrate.v1.convertConsumableUses(data, resourceEffect);
		}

		if (data.flags.obsidian.source && data.flags.obsidian.source.type === 'class') {
			const cls = classMap.get(data.flags.obsidian.source.class);
			if (cls) {
				data.flags.obsidian.source.class = cls._id;
			}
		}

		if (data.flags.obsidian.time && typeof data.flags.obsidian.time.n === 'string') {
			data.flags.obsidian.time.n = Number(data.flags.obsidian.time.n);
			if (isNaN(data.flags.obsidian.time.n)) {
				data.flags.obsidian.time.n = 0;
			}
		}

		if (data.data.components && source === 'core') {
			Object.entries(data.data.components)
				.filter(([_, v]) => v)
				.map(([k, _]) => CONVERT.spellComponents[k])
				.filter(component => component)
				.forEach(component => data.flags.obsidian.components[component] = true);
		}
	},

	convertWeapon: function (data, source) {
		if (data.flags.obsidian.type === 'unarmed') {
			data.flags.obsidian.type = 'melee';
			data.flags.obsidian.category = 'unarmed';
		}

		const primaryEffect = Effect.create();
		const magic = data.flags.obsidian.magic;
		data.flags.obsidian.magical = !!magic;

		if (data.flags.obsidian.type === 'unarmed') {
			data.flags.obsidian.type = 'melee';
			data.flags.obsidian.category = 'unarmed';
		}

		if (data.flags.obsidian.type === 'ranged') {
			data.data.range.value = data.flags.obsidian.range1;
			data.data.range.long = data.flags.obsidian.range2;
		}

		if (data.flags.obsidian.charges && data.flags.obsidian.charges.enabled) {
			primaryEffect.components.push(Migrate.v1.convertCharges(data.flags.obsidian.charges));
		}

		if (data.flags.obsidian.dc && data.flags.obsidian.dc.enabled) {
			primaryEffect.components.push(Migrate.v1.convertSave(data.flags.obsidian.dc));
		}

		if (data.flags.obsidian.hit && data.flags.obsidian.hit.enabled) {
			primaryEffect.components.push(
				Migrate.v1.convertAttack(
					data.flags.obsidian.hit, data.flags.obsidian.type, 'weapon', magic));
		}

		let dmgs = [];
		if (data.flags.obsidian.damage && data.flags.obsidian.damage.length) {
			dmgs = dmgs.concat(data.flags.obsidian.damage.map(dmg => [dmg, false]));
		}

		if (data.flags.obsidian.versatile && data.flags.obsidian.versatile.length) {
			dmgs = dmgs.concat(data.flags.obsidian.versatile.map(dmg => [dmg, true]));
		}

		for (const [dmg, versatile] of dmgs) {
			primaryEffect.components.push(Migrate.v1.convertDamage(dmg, versatile, magic));
		}

		if (primaryEffect.components.length) {
			data.flags.obsidian.effects.push(primaryEffect);
		}

		if (data.flags.obsidian.special && data.flags.obsidian.special.length) {
			for (const special of data.flags.obsidian.special) {
				const effect = Effect.create();
				const component = Effect.newResource();

				effect.name = special.name;
				data.flags.obsidian.effects.push(effect);
				effect.components.push(component);
				component.fixed = special.uses.max;
				component.remaining = special.uses.remaining;
			}
		}

		if (data.flags.obsidian.tags.custom && data.flags.obsidian.tags.custom.length) {
			data.flags.obsidian.tags.custom = data.flags.obsidian.tags.custom.join(', ');
		}

		if (source !== 'core') {
			return;
		}

		if (data.data.weaponType) {
			const type = data.data.weaponType;
			if (type.startsWith('martial')) {
				data.flags.obsidian.category = 'martial';
			}

			if (type === 'natural') {
				data.flags.obsidian.category = 'unarmed';
			}

			if (type.endsWith('R')) {
				data.flags.obsidian.type = 'ranged';
			}
		}

		if (data.data.properties) {
			Object.entries(data.data.properties)
				.filter(([_, v]) => v)
				.map(([k, _]) => CONVERT.tags[k])
				.filter(tag => tag)
				.forEach(tag => data.flags.obsidian.tags[tag] = true);
		}
	},

	deOrphan: function (data) {
		if (Number.isNumeric(getProperty(data, 'flags.obsidian.parent'))) {
			data.flags.obsidian.parent = null;
			data['-=flags.obsidian.parent'] = null;
		}
	}
};

Migrate.core = {
	convertActivation: function (data) {
		if (data.type === 'feat') {
			const activation = CONVERT.activation[getProperty(data.data, 'activation.type')];
			if (activation) {
				data.flags.obsidian.active = 'active';
				data.flags.obsidian.action = activation;
			} else {
				data.flags.obsidian.active = 'passive';
			}
		} else if (data.type === 'spell') {
			const activation = CONVERT.castTime[getProperty(data.data, 'activation.type')];
			if (activation) {
				data.flags.obsidian.time.type = activation;
			}

			const range = CONVERT.range[getProperty(data.data, 'range.units')];
			if (range) {
				data.flags.obsidian.range.type = range;
			}

			const duration = CONVERT.duration[getProperty(data.data, 'duration.units')];
			if (duration) {
				data.flags.obsidian.duration.type = duration;
			}

			data.flags.obsidian.time.n = getProperty(data.data, 'activation.cost');
			data.flags.obsidian.time.react = getProperty(data.data, 'activation.condition');
			data.flags.obsidian.range.n = getProperty(data.data, 'range.value');
			data.flags.obsidian.duration.n = getProperty(data.data, 'duration.value');
		}

		if (getProperty(data.data, 'target.value')
			&& CONVERT.validTargetTypes.has(getProperty(data.data, 'target.type')))
		{
			let effect;
			if (data.type === 'spell') {
				effect = getSpellEffect(data);
			} else {
				effect = getPrimaryEffect(data);
			}

			const target = data.data.target;
			const component = Effect.newTarget();
			effect.components.push(component);

			if (target.type === 'creature' || target.type === 'object') {
				component.count = target.value;
			} else {
				component.target = 'area';
				component.area = target.type;
				component.distance = target.value;
			}
		}

		if ((getProperty(data.data, 'uses.max') || 0) > 0) {
			let effect;
			if (data.type === 'spell') {
				effect = Effect.create();
				data.flags.obsidian.effects.push(effect);
			} else {
				effect = getPrimaryEffect(data);
			}

			const uses = data.data.uses;
			const component = Effect.newResource();
			effect.components.push(component);

			if (!effect.name.length) {
				if (uses.per === 'charges') {
					component.name = game.i18n.localize('OBSIDIAN.Charges');
				} else {
					component.name = game.i18n.localize('OBSIDIAN.Uses');
				}
			}

			component.fixed = uses.max;
			component.remaining = uses.max - (uses.value || 0);

			if (CONVERT.recharge[uses.per]) {
				component.recharge.time = CONVERT.recharge[uses.per];
			}
		}
	},

	convertAttack: function (data) {
		if (OBSIDIAN.notDefinedOrEmpty(data.data.actionType)) {
			return;
		}

		let spell = false;
		let ability = 'str';
		const action = data.data.actionType;

		if (action && action.endsWith('ak')) {
			let effect;
			if (data.type === 'spell') {
				effect = getSpellEffect(data);
			} else {
				effect = getPrimaryEffect(data);
			}

			const component = Effect.newAttack();
			effect.components.push(component);

			if (action[0] === 'r') {
				component.attack = 'ranged';
			}

			if (action[1] === 's') {
				spell = true;
				component.category = 'spell';
				if (OBSIDIAN.notDefinedOrEmpty(data.data.ability)) {
					component.ability = 'spell';
				}
			}

			if (!OBSIDIAN.notDefinedOrEmpty(data.data.ability)) {
				ability = data.data.ability;
				component.ability = data.data.ability;
			}

			component.bonus = data.data.attackBonus || 0;
			component.proficient = !!data.data.proficient;
		}

		const damage = data.data.damage || {};
		if ((damage.parts && damage.parts.length && damage.parts.some(dmg => dmg[0]?.length))
			|| (damage.versatile && damage.versatile.length)
			|| (data.data.formula && data.data.formula.length))
		{
			let effect;
			if (data.type === 'spell') {
				effect = getSpellEffect(data);
			} else {
				effect = getPrimaryEffect(data);
			}

			if (damage.parts && damage.parts.length) {
				effect.components =
					effect.components.concat(
						damage.parts
							.map(dmg => Migrate.core.convertDamage(dmg, ability, spell))
							.filter(dmg => dmg));
			}

			if (damage.versatile && damage.versatile.length) {
				const versatile = Migrate.core.convertDamage(damage.versatile, ability);
				const firstDamage = effect.components.filter(dmg => dmg.type === 'damage')[0];
				versatile.versatile = true;

				if (firstDamage) {
					versatile.damage = firstDamage.damage;
				}

				effect.components.push(versatile);
			}

			if (data.data.formula && data.data.formula.length) {
				effect.components.push(Migrate.core.convertDamage(data.data.formula, ability));
			}
		}

		const save = data.data.save || {};
		if (!OBSIDIAN.notDefinedOrEmpty(save.ability)) {
			let effect;
			if (data.type === 'spell') {
				effect = getSpellEffect(data);
			} else {
				effect = getPrimaryEffect(data);
			}

			const component = Effect.newSave();
			effect.components.push(component);
			component.target = save.ability;

			if (save.scaling === 'flat') {
				component.fixed = save.dc;
			} else {
				component.calc = 'formula';
				component.ability = save.scaling;
				component.bonus = 8;
			}
		}

		if (data.type === 'spell'
			&& getProperty(data.data, 'scaling.mode') !== 'none'
			&& !OBSIDIAN.notDefinedOrEmpty(getProperty(data.data, 'scaling.formula')))
		{
			const spellEffect = getSpellEffect(data);
			const scalingEffect = getScalingEffect(data);
			const scaling = scalingEffect.components.find(c => c.type === 'scaling');
			scaling.ref = spellEffect.uuid;

			if (data.data.level < 1) {
				scaling.method = 'cantrip';
			}

			const component = Effect.newDamage();
			scalingEffect.components.push(component);

			const existingDamage = spellEffect.components.find(c => c.type === 'damage');
			if (existingDamage) {
				component.damage = existingDamage.damage;
			}

			const diceMatches = /\b(\d+d\d+)\b/.exec(data.data.scaling.formula);
			if (diceMatches) {
				const dice = diceMatches[1].split('d');
				component.ndice = Number(dice[0]);
				component.die = Number(dice[1]);
			}
		}
	},

	convertDamage: function (dmg, ability, spell = false) {
		let formula = dmg;
		if (Array.isArray(dmg)) {
			formula = dmg[0];
		}

		if (!formula?.length) {
			return;
		}

		const component = Effect.newDamage();
		if (Array.isArray(dmg) && CONVERT.damage[dmg[1]]) {
			component.damage = CONVERT.damage[dmg[1]];
		}

		const terms = getTerms(formula);
		const dice = terms.find(term => /^\d+d\d+$/.test(term));
		const mod = terms.some(term => term === '@mod');

		if (dice) {
			const d = dice.split('d');
			component.ndice = Number(d[0]);
			component.die = Number(d[1]);
		} else {
			component.calc = 'fixed';
		}

		if (mod) {
			component.ability = ability;
			if (spell) {
				component.ability = 'spell';
			}
		}

		let op = '+';
		let total = 0;

		for (let i = 0; i < terms.length; i++) {
			const term = terms[i];
			if (term === dice || term.startsWith('@')) {
				continue;
			}

			if (term === '+' || term === '-') {
				op = term;
				continue;
			}

			if (/^\d+$/.test(term)) {
				total = OPERATORS[op](total, Number(term));
			}
		}

		component.bonus = total;
		return component;
	}
};

Migrate.v1 = {
	convertAttack: function (attack, type, category, magic = 0) {
		const component = Effect.newAttack();
		component.attack = type;
		component.category = category;
		component.ability = attack.stat;
		component.bonus = attack.bonus + magic;
		component.proficient = attack.proficient;
		return component;
	},

	convertConsumableUses: function (data, effect) {
		const uses = data.flags.obsidian.uses;
		if (uses.limit === 'unlimited') {
			data.flags.obsidian.unlimited = true;
		} else {
			const component = Effect.newResource();
			component.calc = 'formula';
			component.key = uses.ability;
			component.bonus = uses.bonus;
			component.recharge.time = 'never';
			component.name = game.i18n.localize('OBSIDIAN.Uses');
			effect.components.push(component);
		}
	},

	convertCharges: function (charges) {
		const component = Effect.newResource();
		component.fixed = charges.max;
		component.recharge.time = charges.recharge;
		component.recharge.calc = charges.rechargeType;
		component.recharge.ndice = charges.ndice;
		component.recharge.die = charges.die;
		component.recharge.bonus = charges.bonus;
		component.remaining = charges.remaining || 0;
		component.name = game.i18n.localize('OBSIDIAN.Charges');
		return component;
	},

	convertDamage: function (dmg, versatile = false, magic = 0) {
		const component = Effect.newDamage();
		component.ndice = dmg.ndice;
		component.ncrit = dmg.ncrit;
		component.die = dmg.die;
		component.ability = dmg.stat;
		component.bonus = dmg.bonus + magic;
		component.damage = dmg.type;
		component.versatile = versatile;

		return component;
	},

	convertSave: function (save) {
		const component = Effect.newSave();
		component.target = save.target;
		component.effect = save.effect;

		if (OBSIDIAN.notDefinedOrEmpty(save.fixed)) {
			component.calc = 'formula';
			component.ability = save.ability;
			component.prof = save.prof;
			component.bonus = save.bonus;
		} else {
			component.fixed = Number(save.fixed);
		}

		return component;
	},

	convertUses: function (uses, classMap) {
		let component;
		if (uses.type === 'formula') {
			component = Effect.newResource();
			component.recharge.time = uses.recharge;
			component.name = game.i18n.localize('OBSIDIAN.Uses');

			if (OBSIDIAN.notDefinedOrEmpty(uses.fixed)) {
				component.calc = 'formula';
				component.bonus = uses.bonus;
				component.operator = uses.operator;
				component.min = uses.min;
				component.key = uses.key;
				component.ability = uses.ability;

				const cls = classMap.get(uses.class);
				if (cls) {
					component.class = cls._id;
				} else {
					component.key = 'chr';
				}
			} else {
				component.fixed = Number(uses.fixed);
			}
		} else {
			// Unfortunately, item IDs have all been wiped by this point during
			// the core migration so we cannot re-link the resources.
			component = Effect.newConsume();
		}

		return component;
	}
};

Migrate.v3 = {
	convertHD: function (data) {
		if (data.flags.obsidian.hd) {
			data.data.hitDice = `d${data.flags.obsidian.hd}`;
		}
	}
};

Migrate.v4 = {
	convertSpellcasting: function (data) {
		const spells = data.data.spells;
		const overrides = data.flags.obsidian.spells.slots;

		for (let i = 1; i < 10; i++) {
			const spell = spells[`spell${i}`];
			if (spell.value != null && spell.max != null) {
				spell.value = spell.max - spell.value;
			}

			if (!OBSIDIAN.notDefinedOrEmpty(overrides[i])) {
				spell.override = Number(overrides[i]);
			}
		}
	}
};

async function beginMigration (html) {
	html.find('.obsidian-migrate-buttons').css('display', 'none');
	html.find('.obsidian-migrate-progress').css('display', 'block');
	const bar = html.find('.obsidian-migrate-bar');
	const totalMigrations =
		game.items.entities.length
		+ game.actors.entities.reduce((acc, actor) => acc + actor.items.length, 0)
		+ game.scenes.entities.reduce((acc, scene) => acc + scene.data.tokens.length, 0);

	let item;
	let actor;
	let scene;
	let progress = 0;

	const updateProgress = () => {
		const pct = Math.round((progress / totalMigrations) * 100);
		bar.css('width', `${pct}%`);
	};

	const migrationFailed = () => {
		html.find('p').remove();
		html.find('.obsidian-migrate-box')
			.append(`<p>${game.i18n.localize('OBSIDIAN.MigrateFailed')}</p>`);
	};

	try {
		const updates = [];
		for (item of game.items.entities) {
			const update = Migrate.convertItem(duplicate(item.data));
			if (Object.keys(update).length > 0) {
				updates.push(update);
			}

			progress++;
			updateProgress();
		}

		await Item.update(updates);
	} catch (e) {
		console.error(item, e);
		migrationFailed();
		return;
	}

	try {
		const actorUpdates = [];
		for (actor of game.actors.entities.filter(actor => actor.data.type === 'character')) {
			const itemUpdates = [];
			for (const item of actor.data.items) {
				const update = Migrate.convertItem(duplicate(item), actor);
				if (Object.keys(update).length > 0) {
					update._id = item._id;
					itemUpdates.push(update);
				}

				progress++;
				updateProgress();
			}

			if (itemUpdates.length) {
				await actor.updateEmbeddedEntity('OwnedItem', itemUpdates);
			}

			const actorUpdate = Migrate.convertActor(duplicate(actor.data));
			if (Object.keys(actorUpdate).length > 0) {
				actorUpdates.push(actorUpdate);
			}
		}

		await Actor.update(actorUpdates);
	} catch (e) {
		console.error(actor, e);
		migrationFailed();
		return;
	}

	try {
		const updates = [];
		for (scene of game.scenes.entities) {
			const tokens = [];
			let requiresUpdate = false;

			for (const token of scene.data.tokens) {
				const items = [];
				tokens.push(token);

				if (token.actorLink) {
					continue;
				}

				const actor = game.actors.get(token.actorId);
				if (!actor) {
					continue;
				}

				if (token.actorData.items && token.actorData.items.length) {
					for (const item of token.actorData.items) {
						items.push(Migrate.convertItem(item));
					}

					token.actorData.items = items;
					requiresUpdate = true;
				}
			}

			if (requiresUpdate) {
				updates.push({_id: scene.data._id, tokens: tokens});
			}

			progress++;
			updateProgress();
		}

		await Scene.update(updates);
	} catch (e) {
		console.error(scene, e);
		migrationFailed();
		return;
	}

	await game.settings.set('obsidian', 'version', Schema.VERSION);
	location.reload();
}

function launchMigrationDialog () {
	const html = $(`
		<section class="obsidian-bg">
			<div class="obsidian-migrate-container">
				<div class="obsidian-migrate-box">
					<h3>${game.i18n.localize('OBSIDIAN.MigrateTitle')}</h3>
					<p>${game.i18n.localize('OBSIDIAN.MigrateMessage')}</p>
					<p>${game.i18n.localize('OBSIDIAN.MigrateMessage2')}</p>
					<div class="obsidian-migrate-buttons">
						<button type="button" class="obsidian-btn-positive">
							<i class="fas fa-check-circle"></i>
							${game.i18n.localize('OBSIDIAN.MigrateStart')}
						</button>
						<button type="button" class="obsidian-btn-negative">
							<i class="fas fa-times-circle"></i>
							${game.i18n.localize('OBSIDIAN.MigrateCancel')}
						</button>
					</div>
				</div>
				<div class="obsidian-migrate-progress">
					<div class="obsidian-migrate-bar" style="width: 0;"></div>
				</div>
			</div>
		</section>
	`);

	if (!game.user.isGM) {
		html.find('p').remove();
		html.find('.obsidian-migrate-buttons').remove();
		html.find('.obsidian-migrate-box')
			.append($(`<p>${game.i18n.localize('OBSIDIAN.MigrateNotPermitted')}</p>`));
	}

	html.find('.obsidian-btn-positive').click(() => beginMigration(html));
	html.find('.obsidian-btn-negative').click(() => html.remove());
	$('body').append(html);
}

export function checkVersion () {
	game.settings.register('obsidian', 'version', {
		scope: 'world',
		type: Number,
		default: 0
	});

	if (!game.items.entities.length
		&& !game.actors.entities.length
		&& !game.scenes.entities.length)
	{
		// This is a new world, no need to migrate anything.
		game.settings.set('obsidian', 'version', Schema.VERSION);
		return;
	}

	const currentVersion = game.settings.get('obsidian', 'version');
	if (currentVersion < Schema.VERSION) {
		launchMigrationDialog();
	}
}

function getPrimaryEffect (data) {
	if (!data.flags.obsidian.effects || !data.flags.obsidian.effects.length) {
		data.flags.obsidian.effects = [Effect.create()];
	}

	return data.flags.obsidian.effects[0];
}

function getSpellEffect (data) {
	if (!data.flags.obsidian.effects || !data.flags.obsidian.effects.length) {
		data.flags.obsidian.effects = [Effect.create()];
	}

	let effect =
		data.flags.obsidian.effects.find(e =>
			!e.components.some(c => c.type === 'scaling' || c.type === 'resource'));

	if (!effect) {
		effect = Effect.create();
		data.flags.obsidian.effects.push(effect);
	}

	return effect;
}

function getScalingEffect (data) {
	if (!data.flags.obsidian.effects || !data.flags.obsidian.effects.length) {
		data.flags.obsidian.effects = [Effect.create()];
		data.flags.obsidian.effects[0].name = game.i18n.localize('OBSIDIAN.Scaling');
		data.flags.obsidian.effects[0].components.push(Effect.newScaling());
	}

	let effect =
		data.flags.obsidian.effects.find(e => e.components.some(c => c.type === 'scaling'));

	if (!effect) {
		effect = Effect.create();
		effect.name = game.i18n.localize('OBSIDIAN.Scaling');
		effect.components.push(Effect.newScaling());
		data.flags.obsidian.effects.push(effect);
	}

	return effect;
}

function getTerms (formula) {
	const ops = Object.keys(OPERATORS).concat(['(', ')']);
	const split = new RegExp(ops.map(term => `\\${term}`).join('|'), 'g');
	const terms = formula.replace(split, term => `;${term};`).split(';');
	return terms.map(term => term.trim()).filter(term => term !== '').filter((term, i, arr) => {
		return !((term === '+') && (arr[i - 1] === '+'));
	});
}
