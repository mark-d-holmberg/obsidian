Obsidian.Rules.Prepare.spells = function (actorData) {
	for (let i = 0; i < actorData.items.length; i++) {
		if (actorData.items[i].type !== 'spell') {
			continue;
		}

		const spell = actorData.items[i];
		const flags = spell.flags.obsidian;
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
			cls = actorData.flags.obsidian.classes.find(x => x.id === flags.source.class);
			flags.source.display = cls.label;
		} else if (flags.source.type === 'item') {
			flags.source.display = actorData.items.find(x => x.id === flags.source.item).name;
		}

		flags.components.display =
			Object.entries(flags.components)
				.filter(([, val]) => val)
				.map(([key,]) => Obsidian.Rules.SPELL_COMPONENT_MAP[key])
				.filter(s => s !== undefined)
				.map(s => game.i18n.localize(`OBSIDIAN.${s}Abbr`))
				.join(', ');

		if (flags.hit.enabled) {
			if (Obsidian.notDefinedOrEmpty(flags.hit.n)) {
				flags.hit.n = 1;
			} else {
				flags.hit.n = Number(flags.hit.n);
			}

			flags.hit.count = flags.hit.n;
			if (spell.data.level.value < 1) {
				flags.hit.count +=
					flags.upcast.natk *
					(Math.round((actorData.data.details.level.value + 1) / 6 + .5) - 1);
			}

			flags.notes.push(`${game.i18n.localize('OBSIDIAN.Count')}: ${flags.hit.count}`);
			Obsidian.Rules.Prepare.calculateHit(flags.hit, actorData.data, cls);
		}

		if (flags.uses && flags.uses.enabled && flags.uses.limit === 'limited') {
			Obsidian.Rules.Prepare.calculateUses(spell.id, i, actorData.data, cls, flags.uses);
			flags.notes.push(
				'<div class="obsidian-table-note-flex">'
					+ `${game.i18n.localize('OBSIDIAN.Uses')}: ${flags.uses.display}`
				+ '</div>');
		}

		if (flags.upcast && flags.upcast.enabled) {
			if (Obsidian.notDefinedOrEmpty(flags.upcast.nlvl)) {
				flags.upcast.nlvl = 1;
			} else {
				flags.upcast.nlvl = Number(flags.upcast.nlvl);
			}
		}

		if (spell.data.level.value < 1) {
			flags.cantrip = {
				damage: flags.upcast.damage.map(dmg => {
					const scaled = duplicate(dmg);
					scaled.ndice *=
						(Math.round((actorData.data.details.level.value + 1) / 6 + .5) - 1);
					return scaled;
				})
			};

			Obsidian.Rules.Prepare.calculateDamage(actorData.data, cls, flags.cantrip.damage);
		}

		Obsidian.Rules.Prepare.calculateSave(flags.dc, actorData.data, cls);
		Obsidian.Rules.Prepare.calculateDamage(actorData.data, cls, flags.damage);

		if (flags.components.m && spell.data.materials.value.length > 0) {
			flags.notes.push(
				`${game.i18n.localize('OBSIDIAN.MaterialAbbr')}: `
				+ spell.data.materials.value);
		}

		if (flags.time.type === 'react' && flags.time.react.length > 0) {
			flags.notes.push(
				`${game.i18n.localize('OBSIDIAN.CastTimeAbbr-react')}: `
				+ flags.time.react);
		}

		if (cls) {
			if (spell.data.level.value === 0) {
				flags.known = true;
				flags.visible = true;
			} else if (cls.preparation === 'known') {
				if (flags.known === undefined) {
					flags.known = true;
				}

				flags.visible = flags.known;
			} else if (cls.preparation === 'prep') {
				if (flags.prepared === undefined) {
					flags.prepared = true;
				}

				flags.visible = flags.prepared;
			} else if (cls.preparation === 'book') {
				if (flags.book === undefined) {
					flags.book = true;
				}

				if (flags.prepared === undefined) {
					flags.prepared = false;
				}

				flags.visible = flags.book && flags.prepared;
			}

			if (spell.data.ritual.value) {
				flags.visible =
					(cls.rituals === 'prep' && flags.prepared) || cls.rituals === 'book';

				if (flags.visible) {
					actorData.obsidian.spellbook.rituals.push(spell);
				}
			}
		} else {
			flags.visible = true;
		}

		if (flags.visible && spell.data.concentration.value) {
			actorData.obsidian.spellbook.concentration.push(spell);
		}
	}
};
