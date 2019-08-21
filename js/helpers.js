String.prototype.capitalise = function () {
	if (!this.length) {
		return this;
	}

	return this[0].toLocaleUpperCase() + this.substring(1);
};

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

Handlebars.registerHelper('format-uses', function (uses, options) {
	if (!uses.enabled || uses.max === undefined || uses.max < 1) {
		return '';
	}

	const id = options.hash.id;
	let used = uses.max - uses.remaining;

	if (used < 0) {
		used = 0;
	}

	let out = `<div class="obsidian-feature-uses" data-feat-id="${id}">`;

	if (uses.max < 11) {
		for (let i = 0; i < uses.max; i++) {
			out += `
				<div class="obsidian-feature-use${i < used ? ' obsidian-feature-used' : ''}"
				     data-n="${i + 1}"></div>
			`;
		}
	} else {
		out += `
			<input type="number" name="flags.obsidian.features.custom.${id}.uses.remaining"
			       class="obsidian-input-sheet" value="${uses.remaining}" data-dtype="Number">
			<span class="obsidian-binary-operator">&sol;</span>
			<span class="obsidian-feature-max">${uses.max}</span>
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
	return (attack.type === 'melee' && attack.tags.thrown) || attack.tags.versatile;
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
	return attack.mode === 'versatile' ? attack.versatile : attack.damage;
});
