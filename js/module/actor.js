import Actor5e from '../../../../systems/dnd5e/module/actor/entity.js';
import {OBSIDIAN} from '../global.js';
import {Prepare} from '../rules/prepare.js';
import {prepareInventory} from '../rules/inventory.js';
import {prepareSpells} from '../rules/spells.js';
import {prepareSpellcasting} from '../rules/spellcasting.js';
import {Rolls} from '../rules/rolls.js';
import {DND5E} from '../../../../systems/dnd5e/module/config.js';
import {Schema} from './schema.js';
import {prepareEffects} from './item.js';
import {prepareToggleableEffects} from '../rules/effects.js';
import {applyBonuses} from '../rules/bonuses.js';
import {prepareFilters} from '../rules/toggleable.js';
import {prepareNPC} from '../rules/npc.js';
import {prepareDefenses} from '../rules/defenses.js';
import {Rules} from '../rules/rules.js';
import {Migrate} from '../migration/migrate.js';

export class ObsidianActor extends Actor5e {
	prepareData () {
		super.prepareData();
		if (!this.data.flags?.obsidian
			|| (this.data.flags.obsidian.version || 0) < Schema.VERSION)
		{
			// This actor needs migrating.
			Migrate.convertActor(this.data);
		}

		const data = this.data.data;
		const flags = this.data.flags.obsidian;
		this.data.obsidian = {classes: []};

		if (this.data.type === 'character') {
			this.data.obsidian.classes =
				this.data.items.filter(item => item.type === 'class' && item.flags.obsidian);

			data.attributes.hp.maxAdjusted = data.attributes.hp.max + flags.attributes.hpMaxMod;
			for (const cls of this.data.obsidian.classes) {
				if (!cls.flags.obsidian) {
					continue;
				}

				cls.flags.obsidian.label =
					cls.name === 'custom'
						? cls.flags.obsidian.custom
						: game.i18n.localize(`OBSIDIAN.Class-${cls.name}`);
				cls.data.levels = Number(cls.data.levels);
			}

			if (flags.details.milestone) {
				this.data.obsidian.xpDerivedLevel = data.details.level;
			} else {
				let i = 0;
				for (; i < DND5E.CHARACTER_EXP_LEVELS.length; i++) {
					if (data.details.xp.value < DND5E.CHARACTER_EXP_LEVELS[i]) {
						break;
					}
				}

				const lowerBound = DND5E.CHARACTER_EXP_LEVELS[i - 1];
				this.data.obsidian.xpDerivedLevel = i;
				data.details.xp.max = DND5E.CHARACTER_EXP_LEVELS[i];
				data.details.xp.pct =
					Math.floor(
						((data.details.xp.value - lowerBound) / (data.details.xp.max - lowerBound))
						* 100);
			}

			this.data.obsidian.classFormat = ObsidianActor._classFormat(this.data.obsidian.classes);
		} else {
			prepareNPC(this.data);
		}

		this.data.obsidian.magicalItems =
			this.data.items.filter(item =>
				(item.type === 'weapon' || item.type === 'equipment')
				&& getProperty(item, 'flags.obsidian.magical'));

		this.data.obsidian.attacks = [];
		this.data.obsidian.effects = new Map();
		this.data.obsidian.components = new Map();
		this.data.obsidian.triggers = {};
		Rules.FEAT_TRIGGERS.forEach(t => this.data.obsidian.triggers[t] = []);

		let originalSkills;
		let originalSaves;

		if (this.isPolymorphed) {
			const transformOptions = this.getFlag('dnd5e', 'transformOptions');
			const original = game.actors?.get(this.getFlag('dnd5e', 'originalActor'));

			if (original) {
				if (transformOptions.mergeSaves) {
					originalSaves = original.data.data.abilities;
				}

				if (transformOptions.mergeSkills) {
					originalSkills = original.data.obsidian.skills;
				}
			}
		}

		prepareFilters(this.data);
		prepareInventory(this.data);
		Prepare.abilities(this.data);

		data.attributes.ac.min =
			flags.attributes.ac.base
			+ data.abilities[flags.attributes.ac.ability1].mod
			+ (flags.attributes.ac.ability2 ? data.abilities[flags.attributes.ac.ability2].mod : 0);

		if (!OBSIDIAN.notDefinedOrEmpty(flags.attributes.ac.override)) {
			data.attributes.ac.min = Number(flags.attributes.ac.override);
		}

		Prepare.init(data, flags);
		Prepare.conditions(this);
		Prepare.skills(this.data, data, flags, originalSkills);
		Prepare.saves(this.data, data, flags, originalSaves);
		prepareSpellcasting(this.data, flags);
		Prepare.features(this);
		Prepare.consumables(this.data);
		Prepare.weapons(this);
		Prepare.armour(this.data);
		prepareSpells(this.data);

		if (this.data.type === 'character') {
			Prepare.hd(this.data);
			Prepare.tools(this.data, data, flags);
		}

		for (const item of this.data.items) {
			this._partitionTriggers(this.data.obsidian.triggers, item);
			prepareEffects(
				this, item, this.data.obsidian.attacks, this.data.obsidian.effects,
				this.data.obsidian.components);
		}

		prepareToggleableEffects(this.data);
		applyBonuses(this.data);
		prepareDefenses(this.data, flags);

		if (this.isToken) {
			// If we are preparing data right after an update, this.token
			// points to the old token that has since been replaced on the
			// canvas. We need to make sure we get the new token.
			canvas.tokens.get(this.token.data._id)?.drawEffects();
		} else if (canvas) {
			this.getActiveTokens(true).forEach(token => token.drawEffects());
		}

		return this.data;
	}

	_partitionTriggers (triggers, item) {
		if (item.type === 'feat'
			&& item.data.activation.type === 'special'
			&& !OBSIDIAN.notDefinedOrEmpty(item.flags.obsidian.trigger))
		{
			triggers[item.flags.obsidian.trigger].push(item);
		}
	}

	/**
	 * @private
	 */
	_onDeleteEmbeddedEntity (embeddedName, deleted, options, userId) {
		super._onDeleteEmbeddedEntity(embeddedName, deleted, options, userId);
		if (!getProperty(deleted, 'flags.obsidian.effects.length')) {
			return;
		}

		const orphaned =
			deleted.flags.obsidian.effects
				.flatMap(e => e.components)
				.filter(c => c.type === 'spells')
				.flatMap(c => c.spells);

		if (orphaned.length) {
			this.deleteEmbeddedEntity(embeddedName, orphaned);
		}
	}

	async importSpells (item) {
		if (!getProperty(item, 'flags.obsidian.effects.length')) {
			return;
		}

		const effects = duplicate(item.flags.obsidian.effects);
		const pending =
			effects.flatMap(e => e.components)
				.filter(c =>
					c.type === 'spells'
					&& c.source === 'individual'
					&& c.spells.length
					&& typeof c.spells[0] === 'object')
				.map(async c => {
					const ownedSpells =
						await this.createEmbeddedEntity('OwnedItem', c.spells);
					c.spells = [].concat(ownedSpells).map(spell => spell._id);
				});

		if (pending.length) {
			await Promise.all(pending);
			this.updateEmbeddedEntity(
				'OwnedItem', {_id: item._id, 'flags.obsidian.effects': effects});
		}
	}

	linkClasses (item) {
		if (!item.flags || !item.flags.obsidian) {
			return;
		}

		item.flags.obsidian.effects
			.flatMap(e => e.components)
			.filter(c => !OBSIDIAN.notDefinedOrEmpty(c.text))
			.forEach(c => {
				const needle = c.text.toLowerCase();
				const cls =
					this.data.obsidian.classes.find(cls =>
						cls.flags.obsidian.label.toLowerCase() === needle);

				c.class = cls ? cls._id : '';
			});

		if (!item.flags.obsidian.source || item.flags.obsidian.source.type !== 'class') {
			return;
		}

		if (!OBSIDIAN.notDefinedOrEmpty(item.flags.obsidian.source.text)) {
			const needle = item.flags.obsidian.source.text.toLowerCase();
			const cls =
				this.data.obsidian.classes.find(cls =>
					cls.flags.obsidian.label.toLowerCase() === needle);

			if (cls === undefined) {
				item.flags.obsidian.source.type = 'other';
				item.flags.obsidian.source.other = item.flags.obsidian.source.custom;
			} else {
				item.flags.obsidian.source.class = cls._id;
			}
		} else {
			const needle = item.flags.obsidian.source.class;
			const cls = this.data.obsidian.classes.find(cls => cls._id === needle);

			if (cls === undefined) {
				const byName = this.data.obsidian.classes.find(cls => cls.name === needle);
				if (byName === undefined) {
					item.flags.obsidian.source.type = 'other';
					item.flags.obsidian.source.other =
						game.i18n.localize(`OBSIDIAN.Class-${needle}`);
				} else {
					item.flags.obsidian.source.class = byName._id;
				}
			}
		}
	}

	/**
	 * @private
	 */
	static _classFormat (classes) {
		if (classes.length < 1) {
			return game.i18n.localize('OBSIDIAN.Class');
		}

		return classes.sort((a, b) => b.data.levels - a.data.levels).map(cls => {
			if (!cls.flags.obsidian) {
				return '';
			}

			return (cls.data.subclass && cls.data.subclass.length
					? `${cls.data.subclass} ` : '')
				+ `${cls.flags.obsidian.label} ${cls.data.levels}`;
		}).join(' / ');
	}

	getItemParent (item) {
		return this.data.items.find(other => other._id === item?.flags.obsidian.parent);
	}

	async shortRest () {
		if (this.data.data.spells.pact) {
			await this.update({'data.spells.pact.value': this.data.data.spells.pact.max});
		}

		const itemUpdates = this._resourceUpdates(['short']);
		if (itemUpdates.length > 0) {
			return OBSIDIAN.updateManyOwnedItems(this, itemUpdates);
		}

		return Promise.resolve();
	}

	async longRest () {
		await this.shortRest();
		const data = this.data.data;
		const flags = this.data.flags.obsidian;
		const update = {};

		update['data.attributes.hp.value'] = data.attributes.hp.maxAdjusted;

		const hds = duplicate(flags.attributes.hd);
		Object.values(hds)
			.filter(hd => !OBSIDIAN.notDefinedOrEmpty(hd.override))
			.forEach(hd => hd.max = Number(hd.override));

		const totalHD = Object.values(hds).reduce((acc, hd) => acc + hd.max, 0);
		const hdToRecover = Math.max(1, Math.floor(totalHD / 2));
		let recoveredHD = 0;

		// Recover largest HD first.
		for (const [die, hd] of
			Object.entries(hds)
				.filter(([, hd]) => hd.max > 0 && hd.value < hd.max)
				.sort((a, b) => b[0] - a[0]))
		{
			const diff = hd.max - hd.value;
			const recovered = Math.clamped(diff, 1, hdToRecover - recoveredHD);
			recoveredHD += recovered;
			update[`flags.obsidian.attributes.hd.${die}.value`] = hd.value + recovered;

			if (recoveredHD >= hdToRecover) {
				break;
			}
		}

		for (const level of Object.keys(data.spells)) {
			if (level.startsWith('spell')) {
				update[`data.spells.${level}.value`] = data.spells[level].max;
				update[`data.spells.${level}.tmp`] = 0;
			}
		}

		if (data.spells.pact) {
			update[`data.spells.pact.tmp`] = 0;
		}

		await this.update(update);
		const itemUpdates = this._resourceUpdates(['long', 'dawn', 'dusk']);

		if (itemUpdates.length > 0) {
			return OBSIDIAN.updateManyOwnedItems(this, itemUpdates);
		}

		return Promise.resolve();
	}

	async updateEquipment (deleted) {
		if (deleted) {
			const update = {};
			const parent = this.data.items.find(item => item._id === deleted.flags.obsidian.parent);

			if (deleted.type === 'backpack') {
				deleted.flags.obsidian.contents.forEach(item => {
					update[`items.${item.idx}.flags.obsidian.parent`] = null;
					this.data.flags.obsidian.order.equipment.root.push(item._id);
				});

				update['flags.obsidian.order.equipment.root'] =
					duplicate(this.data.flags.obsidian.order.equipment.root);
			}

			if (parent == null) {
				const bucket = deleted.type === 'backpack' ? 'containers' : 'root';
				const idx = this.data.flags.obsidian.order.equipment[bucket].indexOf(deleted._id);
				this.data.flags.obsidian.order.equipment[bucket].splice(idx, 1);
				update[`flags.obsidian.order.equipment.${bucket}`] =
					duplicate(this.data.flags.obsidian.order.equipment[bucket]);
			} else {
				const idx = parent.flags.obsidian.order.indexOf(deleted._id);
				parent.flags.obsidian.order.splice(idx, 1);
				update[`items.${parent.idx}.flags.obsidian.order`] =
					duplicate(parent.flags.obsidian.order);
			}

			await this.update(OBSIDIAN.updateArrays(this.data, update));
		}
	}

	/**
	 * @private
	 */
	_recharge (item, effect, component, updates) {
		const updateKey =
			`flags.obsidian.effects.${effect.idx}.components.${component.idx}.remaining`;

		if (component.recharge.calc === 'all') {
			updates[updateKey] = component.max;
		} else {
			const recharge = Rolls.recharge(item, effect, component);
			const remaining =
				Math.clamped(
					component.remaining + recharge.flags.obsidian.results[0][0].total,
					0, component.max);

			Rolls.toChat(this, recharge);
			updates[updateKey] = remaining;
		}
	}

	/**
	 * @private
	 */
	_resourceUpdates (validTimes) {
		const itemUpdates = [];
		for (const item of this.data.items) {
			if (!getProperty(item, 'flags.obsidian.effects.length')) {
				continue;
			}

			const updates = {_id: item._id};
			for (const effect of item.flags.obsidian.effects) {
				for (const component of effect.components) {
					if (component.type !== 'resource'
						|| !validTimes.includes(component.recharge.time)
						|| component.remaining === component.max)
					{
						continue;
					}

					this._recharge(item, effect, component, updates);
				}
			}

			if (Object.keys(updates).length > 1) {
				itemUpdates.push(OBSIDIAN.updateArrays(item, updates));
			}
		}

		return itemUpdates;
	}

	static fromSceneTokenPair (sceneID, tokenID) {
		const scene = game.scenes.get(sceneID);
		if (!scene) {
			return;
		}

		const tokenData = scene.getEmbeddedEntity('Token', tokenID);
		if (!tokenData) {
			return;
		}

		const token = new Token(tokenData);
		return token.actor;
	}

	static duplicateItem (original) {
		const dupe = duplicate(original);

		// Give all the effects and components new UUIDs, but maintain a
		// reference to what their original UUID was.
		const uuidMap = new Map();
		dupe.flags.obsidian.effects.forEach(effect => {
			const newUUID = OBSIDIAN.uuid();
			uuidMap.set(effect.uuid, newUUID);
			effect.uuid = newUUID;

			effect.components.forEach(component => {
				const newUUID = OBSIDIAN.uuid();
				uuidMap.set(component.uuid, newUUID);
				component.uuid = newUUID;
			});
		});

		// Make sure all internal references point to the new UUIDs.
		dupe.flags.obsidian.effects.flatMap(effect => effect.components).forEach(component => {
			if (!OBSIDIAN.notDefinedOrEmpty(component.ref)) {
				const newUUID = uuidMap.get(component.ref);
				if (newUUID) {
					component.ref = newUUID;
				}
			}
		});

		return dupe;
	}
}
