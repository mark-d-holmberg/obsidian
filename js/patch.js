createEditor = (function () {
	const cached = createEditor;
	return function () {
		const name = $(arguments[0].target).closest('form').data('obsidian-name');
		if (name) {
			arguments[0].content_css = 'css/mce.css,modules/obsidian/css/obsidian-mce.css';
		}

		const capture = cached.apply(this, arguments);
		if (name) {
			Hooks.callAll(`MCEInit-${name}`, capture);
		}

		return capture;
	};
})();

function obs_detectArrays (original, updates) {
	const arrays = new Set();
	for (const update in updates) {
		const path = [];
		let target = original;
		for (const prop of update.split('.')) {
			if (prop in target) {
				path.push(prop);
				const val = target[prop];
				if (Array.isArray(val)) {
					arrays.add(`${path.join('.')}.`);
					break;
				} else {
					target = val;
				}
			} else {
				break;
			}
		}
	}

	return [...arrays.values()];
}

function obs_updateArrays (original, changed) {
	const arrays = obs_detectArrays(original, changed);
	const expanded = {};

	arrays.forEach(prop => {
		const p = prop.substr(0, prop.length - 1);
		expanded[p] = duplicate(getProperty(original, p));
	});

	if (arrays.length > 0) {
		for (const [k, v] of Object.entries(changed)) {
			let found = false;
			for (const pref of arrays) {
				if (k.startsWith(pref)) {
					found = true;
					const p = pref.substr(0, pref.length - 1);
					setProperty(expanded[p], k.substr(pref.length), v);
				}
			}

			if (!found) {
				expanded[k] = v;
			}
		}
	}

	return expanded;
}

Entity.prototype.update = async function (data, options = {}) {
	const collection = this.collection;
	const name = this.entity;
	const changed = {};

	for (const [k, v] of Object.entries(data)) {
		const c = getProperty(this.data, k);
		if (c !== v) {
			changed[k] = v;
		}
	}

	if (Object.keys(changed).length < 1) {
		return this;
	}

	const expanded = obs_updateArrays(this.data, changed);
	const update = Object.keys(expanded).length > 0 ? expanded : changed;

	update._id = this._id;
	return SocketInterface.trigger(`update${name}`, {data: update}, options, {
		preHook: `preUpdate${name}`,
		context: collection,
		success: collection._updateEntity,
		postHook: `update${name}`
	});
};
