import {OBSIDIAN} from './rules.js';
import {Prepare} from './prepare.js';

export function prepareSpells (actorData) {
	for (let i = 0; i < actorData.items.length; i++) {
		if (actorData.items[i].type !== 'spell') {
			continue;
		}

		const spell = actorData.items[i];
		const flags = spell.flags.obsidian;

		if (!flags) {
			continue;
		}

		let cls;
		flags.notes = [];

		if (flags.time.n === undefined || flags.time.n === '') {
			flags.time.n = 1;
		} else {
			flags.time.n = Number(flags.time.n);
		}

		if (flags.source === undefined) {
			flags.source = {display: game.i18n.localize('OBSIDIAN.Class-custom')};
		} else if (flags.source.type === 'custom') {
			flags.source.display = flags.source.custom;
		} else if (flags.source.type === 'class') {
			cls = actorData.obsidian.classes.find(cls =>
				cls.flags.obsidian.uuid === flags.source.class);
			if (cls) {
				flags.source.display = cls.flags.obsidian.label;
			}
		} else if (flags.source.type === 'item') {
			flags.source.display = actorData.items.find(x => x.id === flags.source.item).name;
		}

		flags.components.display =
			Object.entries(flags.components)
				.filter(([, val]) => val)
				.map(([key,]) => OBSIDIAN.Rules.SPELL_COMPONENT_MAP[key])
				.filter(s => s !== undefined)
				.map(s => game.i18n.localize(`OBSIDIAN.${s}Abbr`))
				.join(', ');

		if (flags.hit.enabled) {
			if (OBSIDIAN.notDefinedOrEmpty(flags.hit.n)) {
				flags.hit.n = 1;
			} else {
				flags.hit.n = Number(flags.hit.n);
			}

			flags.hit.count = flags.hit.n;
			if (spell.data.level < 1) {
				flags.hit.count +=
					(flags.upcast.natk || 0) *
					(Math.round((actorData.data.details.level.value + 1) / 6 + .5) - 1);
			}

			flags.notes.push(`${game.i18n.localize('OBSIDIAN.Count')}: ${flags.hit.count}`);
			Prepare.calculateHit(flags.hit, actorData.data, cls);
		}

		if (flags.uses && flags.uses.enabled && flags.uses.limit === 'limited') {
			Prepare.calculateUses(spell.id, i, actorData.data, cls, flags.uses);
			flags.notes.push(
				'<div class="obsidian-table-note-flex">'
					+ `${game.i18n.localize('OBSIDIAN.Uses')}: ${flags.uses.display}`
				+ '</div>');
		}

		if (flags.upcast && flags.upcast.enabled) {
			if (OBSIDIAN.notDefinedOrEmpty(flags.upcast.nlvl)) {
				flags.upcast.nlvl = 1;
			} else {
				flags.upcast.nlvl = Number(flags.upcast.nlvl);
			}
		}

		if (spell.data.level < 1) {
			flags.cantrip = {
				damage: flags.upcast.damage.map(dmg => {
					const scaled = duplicate(dmg);
					scaled.ndice *=
						(Math.round((actorData.data.details.level.value + 1) / 6 + .5) - 1);
					return scaled;
				})
			};

			Prepare.calculateDamage(actorData.data, cls, flags.cantrip.damage);
		}

		Prepare.calculateSave(flags.dc, actorData.data, cls);
		Prepare.calculateDamage(actorData.data, cls, flags.damage);

		if (flags.components.m && spell.data.materials.length > 0) {
			flags.notes.push(
				`${game.i18n.localize('OBSIDIAN.MaterialAbbr')}: `
				+ spell.data.materials);
		}

		if (flags.time.type === 'react' && flags.time.react.length > 0) {
			flags.notes.push(
				`${game.i18n.localize('OBSIDIAN.CastTimeAbbr-react')}: `
				+ flags.time.react);
		}

		if (cls) {
			const spellcasting = cls.flags.obsidian.spellcasting;
			if (spell.data.level === 0) {
				flags.known = true;
				flags.visible = true;
			} else if (spellcasting.preparation === 'known') {
				if (flags.known === undefined) {
					flags.known = true;
				}

				flags.visible = flags.known;
			} else if (spellcasting.preparation === 'prep') {
				if (flags.prepared === undefined) {
					flags.prepared = true;
				}

				flags.visible = flags.prepared;
			} else if (spellcasting.preparation === 'book') {
				if (flags.book === undefined) {
					flags.book = true;
				}

				if (flags.prepared === undefined) {
					flags.prepared = false;
				}

				flags.visible = flags.book && flags.prepared;
			}

			if (spell.data.ritual) {
				flags.visible =
					(spellcasting.rituals === 'prep' && flags.prepared)
					|| spellcasting.rituals === 'book';

				if (flags.visible) {
					actorData.obsidian.spellbook.rituals.push(spell);
				}
			}
		} else {
			flags.visible = true;
		}

		if (flags.visible && spell.data.concentration) {
			actorData.obsidian.spellbook.concentration.push(spell);
		}
	}
}
