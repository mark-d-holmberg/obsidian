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

Handlebars.registerHelper('format-uses', function (feat) {
	return Handlebars.SafeString('');
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
