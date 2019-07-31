Obsidian.SCHEMA = {
	obsidian: {
		attributes: {
			ac: {
				ability1: 'dex',
				base: 10
			},
			conditions: {},
			death: {
				adv: false,
				bonus: 0,
				threshold: 10
			},
			hd: {},
			hpMaxMod: 0,
			init: {
				ability: 'dex'
			},
			senses: {},
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
			custom: [],
			tools: [],
			passives: ['prc', 'inv']
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

		if (flags.skills.joat) {
			data.attributes.init.mod += Math.floor(data.attributes.prof.value / 2);
		}

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
		for (let [id, skill] of
				Object.entries(data.skills).concat(Object.entries(flags.skills.custom)))
		{
			const custom = !isNaN(Number(id));
			if (!custom && flags.skills[id] === undefined) {
				flags.skills[id] = duplicate(skill);
			} else if (!custom) {
				flags.skills[id] = mergeObject(flags.skills[id], skill);
			}

			skill = flags.skills[id];
			actorData.allSkills[custom ? `custom.${id}` : id] = skill;

			skill.mod =
				data.abilities[skill.ability].mod
				+ Math.floor(skill.value * data.attributes.prof.value)
				+ flags.skills.bonus
				+ (skill.bonus || 0);

			if (flags.skills.joat && skill.value === 0) {
				skill.mod += Math.floor(data.attributes.prof.value / 2);
			}

			if (skill.override !== undefined && skill.override !== '') {
				skill.mod = Number(skill.override);
			}

			skill.passive = 10 + skill.mod + (skill.passiveBonus || 0);
			if (skill.adv) {
				skill.passive += 5;
			}
		}

		for (const tool of flags.skills.tools) {
			if (tool.override !== undefined && tool.override !== '') {
				tool.mod = Number(tool.override);
				continue;
			}

			tool.mod =
				data.abilities[tool.ability].mod
				+ tool.bonus
				+ flags.skills.bonus
				+ Math.floor(tool.value * data.attributes.prof.value);

			if (flags.skills.joat && tool.value === 0) {
				tool.mod += Math.floor(data.attributes.prof.value / 2);
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
