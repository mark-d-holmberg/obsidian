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

			totals[cls.hd] += parseInt(cls.levels);
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
					newHD[hd].value = parseInt(storedHD.value) + diff;
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
