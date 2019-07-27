Obsidian.SCHEMA = {
	obsidian: {
		attributes: {
			ac: {
				ability1: 'dex',
				base: 10
			},
			conditions: {},
			hd: {},
			hpMaxMod: 0,
			init: {
				ability: 'dex'
			},
			speed: {}
		},
		classes: [],
		details: {
			gender: null,
			subrace: null,
			milestone: false
		},
		saves: {
			bonus: 0
		},
		skills: {
			bonus: 0,
			joat: false,
			custom: []
		}
	}
};

class ObsidianActor extends Actor5e {
	prepareData (actorData) {
		actorData = super.prepareData(actorData);
		ObsidianActor._enrichFlags(actorData.flags);

		const data = actorData.data;
		const flags = actorData.flags.obsidian;

		data.attributes.hp.maxAdjusted = data.attributes.hp.max + flags.attributes.hpMaxMod;

		data.attributes.init.mod =
			data.abilities[flags.attributes.init.ability].mod
			+ data.attributes.init.value;

		if (flags.attributes.init.override !== undefined && flags.attributes.init.override !== '') {
			data.attributes.init.mod = Number(flags.attributes.init.override);
		}

		data.attributes.ac.min =
			flags.attributes.ac.base
			+ data.abilities[flags.attributes.ac.ability1].mod
			+ (flags.attributes.ac.ability2 ? data.abilities[flags.attributes.ac.ability2].mod : 0)
			+ flags.attributes.ac.mod;

		if (flags.attributes.ac.override !== undefined && flags.attributes.ac.override !== '') {
			data.attributes.ac.min = flags.attributes.ac.override;
		}

		actorData.allSkills = {};
		for (const [id, skill] of
				Object.entries(data.skills).concat(Object.entries(flags.skills.custom)))
		{
			const custom = !isNaN(Number(id));
			actorData.allSkills[custom ? `custom.${id}` : id] = skill;

			if (custom) {
				skill.mod =
					data.abilities[skill.ability].mod
					+ Math.floor(skill.value * data.attributes.prof.value);
			}

			if (flags.skills.joat && skill.value === 0) {
				skill.mod += Math.floor(data.attributes.prof.value / 2);
			}

			skill.mod += flags.skills.bonus;

			if (custom || flags.skills.hasOwnProperty(id)) {
				const assoc = custom ? skill : flags.skills[id];
				skill.mod += assoc.bonus;

				if (assoc.override !== undefined && assoc.override !== '') {
					skill.mod = Number(assoc.override);
				}
			}
		}

		for (const [id, save] of Object.entries(data.abilities)) {
			save.save += flags.saves.bonus;
			if (flags.saves.hasOwnProperty(id)) {
				save.save += flags.saves[id].bonus;
				const override = flags.saves[id].override;
				if (override !== undefined && override !== '') {
					save.save = Number(override);
				}
			}
		}

		return actorData;
	}

	/**
	 * @private
	 */
	static _enrichFlags (flags) {
		const walk = (master, target) => {
			for (const [key, val] of Object.entries(master)) {
				if (target[key] === undefined) {
					target[key] = val;
				} else if ($.isPlainObject(val)) {
					walk(val, target[key]);
				}
			}
		};

		walk(duplicate(Obsidian.SCHEMA), flags);
	}

	updateHD (classes) {
		const existing = this.data.flags.obsidian.attributes.hd;
		const totals = {};
		const newHD = {};

		for (const cls of classes) {
			if (totals[cls.hd] === undefined) {
				totals[cls.hd] = 0;
			}

			totals[cls.hd] += cls.levels;
		}

		for (const [hd, val] of Object.entries(totals)) {
			const storedHD = existing[hd];
			if (storedHD === undefined) {
				newHD[hd] = {
					value: val,
					max: val
				};
			} else {
				newHD[hd] = duplicate(storedHD);
				if (storedHD.max !== val) {
					const diff = val - storedHD.max;
					newHD[hd].max = val;
					newHD[hd].value = storedHD.value + diff;
				}
			}
		}

		for (const [hd, val] of Object.entries(existing)) {
			if (totals[hd] === undefined && val.override == null) {
				delete newHD[hd];
			}
		}

		return newHD;
	}
}

CONFIG.Actor.entityClass = ObsidianActor;
