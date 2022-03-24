import {OBSIDIAN} from '../global.js';
import {Schema} from '../data/schema.js';
import {Effect} from './effect.js';
import {ObsidianActor} from './actor.js';

export const Summons = {
	addBonusDamage: function (summoner, summonData, bonus) {
		const extra = Summons.calculateBonus(summoner, summonData.flags.obsidian.summon, bonus);
		summonData.items.forEach(item => {
			if (!item.flags?.obsidian?.effects?.length) {
				return;
			}

			item.flags.obsidian.effects
				.flatMap(e => e.components)
				.filter(c => c.type === 'damage')
				.forEach(c => c.bonus += extra);
		});
	},

	applySummonOverrides: async function (options, summonData, summonType) {
		const summoner = ObsidianActor.fromUUID(options.summoner);
		if (!summoner) {
			return;
		}

		const component = summoner.data.obsidian.components.get(options.parentComponent);
		if (!component) {
			return;
		}

		if (component.prof) {
			await Summons.replaceProf(summoner, summonData, summonType);
		}

		const summonFlags = summonData.flags.obsidian;
		if (component.ac.enabled) {
			const current = Number(summonFlags.attributes?.ac?.override);
			mergeObject(summonFlags, {
				'attributes.ac.override':
					current + Summons.calculateBonus(summoner, summonFlags.summon, component.ac)
			});
		}

		if (component.hp.enabled) {
			const extra = Summons.calculateBonus(summoner, summonFlags.summon, component.hp);
			const current = summonData.data.attributes.hp;

			mergeObject(summonData.data, {
				'attributes.hp': {
					value: current.value + extra,
					max: current.max + extra
				}
			});
		}

		if (component.tmp.enabled) {
			const extra = Summons.calculateBonus(summoner, summonFlags.summon, component.tmp);
			const current = summonData.data.attributes.hp.temp;
			mergeObject(summonData.data, {'attributes.hp.temp': current + extra});
		}

		if (component.dmg.enabled) {
			Summons.addBonusDamage(summoner, summonData, component.dmg);
		}

		if (!OBSIDIAN.notDefinedOrEmpty(component.attack)) {
			Summons.replaceAttackBonuses(summoner, summonData, component.attack);
		}

		if (!OBSIDIAN.notDefinedOrEmpty(component.save)) {
			Summons.replaceSaveDCs(summoner, summonData, component.save);
		}
	},

	calculateBonus: function (actor, summon, bonus) {
		let multiplier = 1;
		let constant = 0;
		let total = 0;

		if (bonus.operator === 'plus') {
			constant += bonus.bonus ?? 0;
		} else if (bonus.operator === 'mult') {
			multiplier = bonus.bonus ?? 0;
		}

		const actorData = actor.data;
		const data = actorData.data;

		if (bonus.key === 'abl') {
			total = data.abilities[bonus.ability].mod;
		} else if (bonus.key === 'prof') {
			total = data.attributes.prof;
		} else if (bonus.key === 'chr') {
			total = actorData.type === 'npc' ? data.details.cr : data.details.level;
		} else if (bonus.key === 'cls') {
			total = actor.items.get(bonus.class).data.data.levels;
		} else if (bonus.key === 'hp') {
			total = data.attributes.hp.max;
		} else if (bonus.key === 'spell') {
			total = summon.spellLevel || 0;
		} else if (bonus.key === 'upcast') {
			total = summon.upcast || 0;
		}

		return multiplier * total + constant;
	},

	getAbilityBonus: function (summoner, summonData, ability) {
		if (ability === 'spell') {
			const spellcasting =
				Summons.getSpellcasting(summoner, summonData.flags.obsidian.summon);

			return spellcasting?.attack;
		}

		return summoner.data.data.abilities[ability].mod;
	},

	getGenericActor: async function (type) {
		const actor =
			game.actors.contents.find(actor =>
				actor.name === OBSIDIAN.GENERIC_ACTOR && actor.type === type);

		if (actor) {
			return actor;
		}

		return Actor.create({name: OBSIDIAN.GENERIC_ACTOR, type: type, token: {actorLink: false}});
	},

	getSpellcasting: function (actor, summon) {
		const derived = actor.data.obsidian;
		const component = derived.components.get(summon.parentComponent);
		const effect = derived.effects.get(component.parentEffect);
		const item = actor.items.get(effect.parentItem);
		const source = item.data.flags.obsidian.source;

		if (source.type !== 'class') {
			return;
		}

		const cls = actor.items.get(source.class);
		if (!cls?.obsidian?.spellcasting?.enabled) {
			return;
		}

		return cls.obsidian.spellcasting;
	},

	replaceAttackBonuses: function (summoner, summonData, ability) {
		const bonus = Summons.getAbilityBonus(summoner, summonData, ability);
		if (bonus == null) {
			return;
		}

		summonData.items.forEach(item => {
			if (!item.flags?.obsidian?.effects?.length) {
				return;
			}

			item.flags.obsidian.effects
				.flatMap(e => e.components)
				.filter(c => c.type === 'attack')
				.forEach(c => {
					c.ability = '';
					c.bonus = bonus;
					c.proficient = false;
				});
		});
	},

	replaceProf: async function (summoner, summonData, summonType) {
		if (!['character', 'npc'].includes(summonType)) {
			return;
		}

		const targetProf = summoner.data.data.attributes.prof;
		if (summonType === 'npc') {
			// Set the CR to give the appropriate resulting proficiency bonus.
			summonData.data.details.cr = (targetProf - 2) * 4 + 1;
			return;
		}

		// Create a feat that sets the proficiency.
		const feat = {
			name: game.i18n.localize('OBSIDIAN.ReplaceProf'),
			type: 'feat',
			flags: {
				obsidian: {
					version: Schema.VERSION,
					effects: []
				}
			}
		};

		const effect = Effect.create();
		const setter = Effect.createComponent('setter');
		const filter = Effect.createComponent('filter');

		setter.score = targetProf;
		filter.filter = 'score';
		filter.score = 'prof';
		effect.components.push(setter, filter);
		feat.flags.obsidian.effects.push(effect);
		summonData.items.push(CONFIG.Item.documentClass.create(feat, {temporary: true}));
	},

	replaceSaveDCs: function (summoner, summonData, ability) {
		const bonus = Summons.getAbilityBonus(summoner, summonData, ability);
		if (bonus == null) {
			return;
		}

		summonData.items.forEach(item => {
			if (!item.flags?.obsidian?.effects?.length) {
				return;
			}

			item.flags.obsidian.effects
				.flatMap(e => e.components)
				.filter(c => c.type === 'save')
				.forEach(c => {
					c.calc = 'fixed';
					c.fixed = bonus;
				});
		});
	},

	summon: async function (uuid, amount, x, y, options) {
		const actor = await fromUuid(uuid);
		if (!actor) {
			return;
		}

		const tokenData =
			(await actor.getTokenData({x, y, actorLink: false, actorData: {flags: {}}})).toObject();

		if (actor.compendium) {
			// Since this actor doesn't actually exist in the world, and only
			// exists inside a compendium, we reference a generic actor, and
			// override all its data with the desired actor. This way we avoid
			// creating a world actor every time we want to summon something.
			const template = await Summons.getGenericActor(actor.type);
			tokenData.actorId = template.id;
		}

		tokenData.actorData = {
			name: actor.name,
			data: duplicate(actor.data._source.data),
			flags: duplicate(actor.data._source.flags),
			items: duplicate(actor.data._source.items)
		};

		// Make sure the summoner has access to their summon.
		tokenData.actorData.permission = duplicate(actor.data.permission);
		if (!game.user.isGM) {
			tokenData.actorData.permission[game.userId] = CONST.DOCUMENT_PERMISSION_LEVELS.OWNER;
		}

		const flags = tokenData.actorData.flags;
		if (!flags.obsidian) {
			flags.obsidian = {};
		}

		if (!flags.obsidian.version) {
			flags.obsidian.version = Schema.VERSION;
		}

		flags.obsidian.summon = {
			parentComponent: options.parentComponent,
			spellLevel: options.spellLevel == null ? undefined : Number(options.spellLevel),
			upcast: options.upcast == null ? undefined : Number(options.upcast),
			summoner: options.summoner
		};

		await Summons.applySummonOverrides(options, tokenData.actorData, actor.type);

		const tokens = [];
		amount = Math.clamped(amount, 0, 32);

		for (let i = 0; i < amount; i++) {
			tokens.push(duplicate(tokenData));
		}

		return canvas.scene.createEmbeddedDocuments('Token', tokens);
	}
};
