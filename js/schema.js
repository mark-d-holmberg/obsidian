Obsidian.SCHEMA = {
	obsidian: {
		classes: [],
		details: {
			gender: null,
			subrace: null
		}
	}
};

Obsidian.enrichFlags = function (flags) {
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
};
