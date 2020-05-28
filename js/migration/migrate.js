import {Schema} from '../module/schema.js';
import {ObsidianHeaderDetailsDialog} from '../dialogs/char-header.js';
import {OBSIDIAN} from '../global.js';
import {Effect} from '../module/effect.js';
import {Rules} from '../rules/rules.js';
import {CONVERT} from './convert.js';
import {core} from './core.js';
import {v1} from './v1.js';
import {v3} from './v3.js';
import {v4} from './v4.js';
import {v5} from './v5.js';
import {v6} from './v6.js';

export const Migrate = {
	convertActor: function (data) {
		lazyConvert();

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

		if (source === 'core') {
			Migrate.core.convertSpeed(data);
			Migrate.core.convertDefenses(data);
		}

		if (data.flags.obsidian.version < 2) {
			Migrate.convertNotes(data, source);
			Migrate.convertProficiencies(data, source);
			Migrate.convertSpecial(data, source);
		}

		if (data.flags.obsidian.version < 5 && source !== 'core') {
			Migrate.v4.convertSpellcasting(data);
		}

		if (data.flags.obsidian.version < 6 && source !== 'core') {
			Migrate.v5.convertProficiencies(data);
		}

		if (data.items?.length) {
			data.items = data.items.map(item => {
				const updated = Migrate.convertItem(item, data);
				if (data.type === 'npc' && (item.type === 'weapon' || item.flags.obsidian.armour)) {
					item.data.equipped = true;
				}

				return updated;
			});
		}

		if (source === 'core' && data.type === 'npc' && data.items && data.data) {
			Migrate.convertAC(data);
		}

		data.flags.obsidian.version = Schema.VERSION;
		return data;
	},

	convertItem: function (data, actorData) {
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
				Migrate.convertFeature(data, source, actorData);
			} else if (data.type === 'spell') {
				Migrate.convertSpell(data, source, actorData);
			} else if (data.type === 'weapon') {
				Migrate.convertWeapon(data, source);
			}

			if (source === 'core') {
				Migrate.core.convertActivation(data);
				Migrate.core.convertAttack(data);
			}
		}

		if (data.type === 'feat' && source === 'core') {
			Migrate.core.convertClassFeature(data);
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

		if (data.type === 'feat' && data.flags.obsidian.version < 6 && source !== 'core') {
			Migrate.v5.convertActivation(data);
		}

		if (data.flags.obsidian.version < 7 && source !== 'core') {
			Migrate.v6.convertBonuses(data);
		}

		data.flags.obsidian.version = Schema.VERSION;
		return data;
	},

	convertAC: function (data) {
		if (!data.items.some(item => item.flags.obsidian.armour)) {
			data.flags.obsidian.attributes.ac.override = data.data.attributes.ac.value?.toString();
		}
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
			data.flags.obsidian.subtype = 'armour';
		}

		if (data.data.armor.dex !== 0 && data.data.armor.type !== 'shield') {
			data.flags.obsidian.addDex = true;
		}
	},

	convertFeature: function (data, source, actorData) {
		const classMap = new Map();
		if (actorData) {
			actorData.items
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
		if (traits.languages) {
			const custom = traits.languages.value?.indexOf('custom');
			if (custom != null && custom > -1) {
				traits.languages.value.splice(custom, 1);
			}

			if (!OBSIDIAN.notDefinedOrEmpty(traits.languages.custom)) {
				data.flags.obsidian.traits.profs.custom.langs =
					traits.languages.custom.split(/[,;] ?/g);
			}
		} else {
			traits.languages = {value: []};
		}

		if (source === 'core' && traits.toolProf) {
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
		} else if (source === 'core'
			&& data.type === 'character'
			&& getProperty(data, 'data.details') !== undefined)
		{
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

	convertSpell: function (data, source, actorData) {
		const classMap = new Map();
		if (actorData) {
			actorData.items
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

Migrate.core = core;
Migrate.v1 = v1;
Migrate.v3 = v3;
Migrate.v4 = v4;
Migrate.v5 = v5;
Migrate.v6 = v6;

function lazyConvert () {
	const convert = (key, convert) => {
		if (CONVERT[key]) {
			return;
		}

		CONVERT[key] = {};
		convert.forEach(([p, t, r]) =>
			CONVERT[key][p] =
				new Map(Rules[r].map(key =>
					[game.i18n.localize(`OBSIDIAN.${t}-${key}`).toLowerCase(), key])));
	};

	convert('profs', [
		['weaponProf', 'WeaponProf', 'PROF_WEAPON'],
		['armorProf', 'ArmourProf', 'PROF_ARMOUR'],
		['languages', 'Lang', 'PROF_LANG']
	]);

	convert('defs', [
		['conditions', 'Condition', 'CONVERT_CONDITIONS'],
		['damage', 'Damage', 'CONVERT_DAMAGE_TYPES']
	]);

	convertSpeeds();
}

function convertSpeeds () {
	if (CONVERT.speeds) {
		return;
	}

	CONVERT.speeds =
		new Map(Rules.SPEEDS.map(key =>
			[game.i18n.localize(`OBSIDIAN.SpeedAbbr-${key}`).toLowerCase(), key]));

	CONVERT.speeds.hover = new RegExp(`\(${game.i18n.localize('OBSIDIAN.Hover')}\)`);
}

function translateOrElseOriginal (key, original) {
	const translation = game.i18n.localize(key);
	return translation === key ? original : translation;
}
