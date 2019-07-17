Obsidian.SCHEMA = {
	obsidian: {
		attributes: {
			hd: {}
		},
		classes: [],
		details: {
			gender: null,
			subrace: null,
			milestone: false,
			inspiration: false
		}
	}
};

class ObsidianActor extends Actor5e {
	prepareData (actorData) {
		actorData = super.prepareData(actorData);
		ObsidianActor._enrichFlags(actorData.flags);
		ObsidianActor._updateHD(actorData.flags.obsidian);
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

	/**
	 * @private
	 */
	static _updateHD (flags) {
		const totals = {};
		for (const cls of flags.classes) {
			if (totals[cls.hd] === undefined) {
				totals[cls.hd] = 0;
			}

			totals[cls.hd] += parseInt(cls.levels);
		}

		for (const [hd, val] of Object.entries(totals)) {
			const storedHD = flags.attributes.hd[hd];
			if (storedHD === undefined) {
				flags.attributes.hd[hd] = {
					value: val,
					max: val
				}
			} else if (storedHD.max !== val) {
				const diff = val - storedHD.max;
				storedHD.max = val;
				storedHD.value = parseInt(storedHD.value) + diff;
			}
		}

		for (const [hd, val] of Object.entries(flags.attributes.hd)) {
			if (totals[hd] === undefined && val.override == null) {
				delete flags.attributes.hd[hd];
			}
		}
	}
}

CONFIG.Actor.entityClass = ObsidianActor;
