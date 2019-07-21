Handlebars.registerHelper('classFormat', function (classes) {
	if (classes.length < 1) {
		return 'Class';
	}

	return classes.sort((a, b) => b.levels - a.levels).map(cls => {
		let result = '';
		if (cls.subclass) {
			result += `${cls.subclass} `;
		}

		if (cls.name === 'Custom') {
			result += `${cls.custom} `;
		} else {
			result += `${cls.name} `;
		}

		return result + cls.levels;
	}).join(' / ');
});

Handlebars.registerHelper('defined', function (arg) {
	return arg !== undefined;
});

Handlebars.registerHelper('exists', function (arg) {
	return arg != null;
});

Handlebars.registerHelper('expr', function (op, ...args) {
	args.pop();

	if (op === '!') {
		return !args[0];
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

Handlebars.registerHelper('notEmpty', function (obj) {
	return obj != null && Object.keys(obj).length > 0;
});
