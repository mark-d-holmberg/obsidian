String.prototype.capitalise = function () {
	if (!this.length) {
		return this;
	}

	return this[0].toLocaleUpperCase() + this.substring(1);
};

Handlebars.registerHelper('badge', function (badge) {
	const advantage = badge === 'adv';
	const colour = `obsidian-css-icon-${advantage ? 'positive' : 'negative'}`;
	const label = advantage ? 'A' : 'D';

	return new Handlebars.SafeString(`
		<div class="obsidian-css-icon obsidian-css-icon-hexagon ${colour}">
			<div class="obsidian-css-icon-shape"></div>
			<div class="obsidian-css-icon-label">${label}</div>
		</div>
	`);
});

Handlebars.registerHelper('capitalise', function (str) {
	return str ? str.capitalise() : '';
});

Handlebars.registerHelper('defined', function (arg) {
	return arg !== undefined;
});

Handlebars.registerHelper('disabled', function (arg) {
	return arg ? '' : 'disabled';
});

Handlebars.registerHelper('exists', function (arg) {
	return arg != null;
});

Handlebars.registerHelper('expr', function (op, ...args) {
	args.pop();

	if (op === '!') {
		return !args[0];
	}

	if (op === '&&') {
		return args[0] && args[1];
	}

	if (op === '||') {
		return args[0] || args[1];
	}

	if (op === '>') {
		return args[0] > args[1];
	}

	if (op === '<') {
		return args[0] < args[1];
	}

	if (op === '>=') {
		return args[0] >= args[1];
	}

	if (op === '<=') {
		return args[0] <= args[1];
	}

	if (op === '===') {
		return args[0] === args[1];
	}

	let reducer = null;
	if (op === '+') {
		reducer = (acc, x) => acc + x;
	} else if (op === '*') {
		reducer = (acc, x) => acc * x;
	} else if (op === '/') {
		reducer = (acc, x) => acc / x;
	}

	if (reducer !== null) {
		return args.reduce(reducer);
	}
});

Handlebars.registerHelper('fancy-checkbox', function (...args) {
	const options = args.pop();
	const prop = args.join('.');

	return new Handlebars.SafeString(`
		<div class="fancy-checkbox" data-bound="${prop}"
		     ${options.hash.style ? `style="${options.hash.style}"` : ''}>
			<div class="checkbox-container">
				<div class="checkbox-inner-box"></div>
				<div class="checkmark-container">
					<div class="checkmark">
						<div class="checkmark-short"></div>
						<div class="checkmark-long"></div>
					</div>
				</div>
			</div>
			<div class="checkbox-content">${game.i18n.localize(options.hash.content)}</div>
		</div>
		<input type="checkbox" name="${prop}" class="obsidian-hidden"
		       ${options.hash.checked ? 'checked' : ''}>
	`);
});

Handlebars.registerHelper('filter', function (...args) {
	/**
	 * This helper expects an array as its first argument, followed by any
	 * number of key-value pairs. It will filter out all items of the array
	 * that do not have a value for the given key that equals the supplied
	 * value.
	 */

	args.pop();
	const list = args.shift();

	return list.filter(item => {
		let valid = true;
		for (let i = 0; i < args.length - 1; i += 2) {
			valid = valid && item[args[i]] === args[i + 1];
		}

		return valid;
	});
});

Handlebars.registerHelper('format-uses', function (features, feature) {
	const uses = feature.uses;
	if (!uses.enabled) {
		return '';
	}

	const map = new Map(features.map(feat => [feat.id, feat]));
	let id = feature.id;
	let idx = features.findIndex(feat => feat.id === id);
	let max = uses.max;
	let remaining = uses.remaining;

	if (uses.type === 'shared') {
		const shared = features.findIndex(feat => feat.id === uses.shared);
		if (shared > -1) {
			id = features[shared].id;
			idx = shared;
			max = map.get(id).uses.max;
			remaining = map.get(id).uses.remaining;
		}
	}

	if (max === undefined || max < 0) {
		return '';
	}

	let used = max - remaining;
	if (used < 0) {
		used = 0;
	}

	let out = `<div class="obsidian-feature-uses" data-feat-id="${id}">`;
	if (max < 11) {
		for (let i = 0; i < max; i++) {
			out += `
				<div class="obsidian-feature-use${i < used ? ' obsidian-feature-used' : ''}"
				     data-n="${i + 1}"></div>
			`;
		}
	} else {
		out += `
			<input type="number" name="flags.obsidian.features.custom.${idx}.uses.remaining"
			       class="obsidian-input-sheet" value="${remaining}" data-dtype="Number">
			<span class="obsidian-binary-operator">&sol;</span>
			<span class="obsidian-feature-max">${max}</span>
		`;
	}

	out += '</div>';
	return new Handlebars.SafeString(out);
});

Handlebars.registerHelper('get-property', function (data, key) {
	return getProperty(data, key);
});

Handlebars.registerHelper('i18n-join', function (...args) {
	args.pop();
	return game.i18n.localize(args.reduce((acc, x) => acc + x));
});

Handlebars.registerHelper('is-attack-toggleable', function (attack) {
	const type = attack.flags.obsidian.type;
	const tags = attack.flags.obsidian.tags;
	return (type === 'melee' && tags.thrown) || tags.versatile;
});

Handlebars.registerHelper('is-custom-tag', function (key, val) {
	return val.custom ? 'custom' : key;
});

Handlebars.registerHelper('lc', function (arg) {
	return arg.toLocaleLowerCase();
});

Handlebars.registerHelper('nonZero', function (obj, key) {
	for (const p in obj) {
		if (obj[p][key] > 0) {
			return true;
		}
	}

	return false;
});

Handlebars.registerHelper('notEmpty', function (obj) {
	return obj != null && Object.keys(obj).length > 0;
});

Handlebars.registerHelper('range', function (start, end) {
	if (end === undefined) {
		end = start;
		start = 0;
	}

	return [...Array(end - start + 1).keys()].map(i => i + start);
});

Handlebars.registerHelper('startsWith', function (haystack, needle) {
	return haystack.startsWith(needle);
});

Handlebars.registerHelper('which-damage', function (attack) {
	return attack.flags.obsidian.mode === 'versatile'
		? attack.flags.obsidian.versatile
		: attack.flags.obsidian.damage;
});
