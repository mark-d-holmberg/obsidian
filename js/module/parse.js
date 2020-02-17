export const Parse = {
	eval: function (expr, actorData) {
		const ast = [];
		let buf = '';
		let inVar = false;
		let inFunc = false;
		let current = ast;

		const push = () => {
			if (typeof buf !== 'string' || buf.length > 0) {
				current.push(buf);
				buf = '';
			}
		};

		const newNode = () => {
			const parent = current;
			current = [];
			current._parent = parent;
			parent.push(current);
		};

		for (const c of expr) {
			if (c === '(') {
				newNode();
				if (buf.length > 0) {
					inFunc = true;
					current.push(buf);
					newNode();
				}

				buf = '';
				continue;
			}

			if (c === ')' || c === ' ') {
				if (inVar) {
					buf = Parse.lookup(buf, actorData);
					inVar = false;
				}

				push();

				if (c === ')' && current._parent != null) {
					current = current._parent;
					if (inFunc) {
						inFunc = false;
						if (current._parent != null) {
							current = current._parent;
						}
					}
				}

				continue;
			}

			if (c === ',') {
				push();
				const parent = current._parent;
				current = [];
				parent.push(current);
				continue;
			}

			if (c === '@' || c === '$') {
				inVar = true;
				buf += c;
				continue;
			}

			buf += c;
		}

		if (inVar) {
			buf = Parse.lookup(buf, actorData);
		}

		push();

		const evaluate = terms => {
			const fst = terms[0];
			if (fst === undefined) {
				return 0;
			}

			if (isNaN(Number(fst)) && !Array.isArray(fst)) {
				const fn = Parse.fns[fst];
				if (fn) {
					return fn(...terms.slice(1).map(arg => evaluate(arg)));
				} else {
					return 0;
				}
			}

			let total = 0;
			let op = null;

			terms.forEach(term => {
				if (['+', '-', '*', '/'].includes(term)) {
					op = term;
					return;
				}

				let val = Number(term);
				if (Array.isArray(term)) {
					val = evaluate(term);
				}

				if (op === null) {
					total = val;
				} else {
					total = Parse.ops[op](total, val);
				}
			});

			return total;
		};

		return `<strong>${evaluate(ast)}</strong>`;
	},

	fns: {
		max: Math.max,
		sgn: n => n.sgn()
	},

	lookup: function (prop, actorData) {
		const data = actorData.data;
		const flags = actorData.flags.obsidian;
		const lookup = prop.startsWith('@') ? data : flags;
		prop = prop.substring(1);

		if (lookup === flags && prop.startsWith('classes.')) {
			const classes = actorData.obsidian.classes;
			const components = prop.split('.');
			let cls = classes.find(c => c.name === components[1]);

			if (!cls) {
				cls = classes.filter(c => c.flags.obsidian && c.flags.obsidian.custom).find(c =>
					c.flags.obsidian.custom.toLocaleLowerCase()
					=== components[1].toLocaleLowerCase());
			}

			if (cls) {
				const prop = components.slice(2).join('.');
				let val = getProperty(cls.data, prop);
				if (val === undefined) {
					val = getProperty(cls.flags.obsidian, prop);
				}

				return val;
			}
		} else {
			return getProperty(lookup, prop);
		}
	},

	ops: {
		'+': (a, b) => a + b,
		'-': (a, b) => a - b,
		'*': (a, b) => a * b,
		'/': (a, b) => a / b
	},

	regex: /\[\[([^\]]+)]]/g,
	parse: function (actorData, text) {
		return text.replace(Parse.regex, (match, expr) => Parse.eval(expr, actorData));
	}
};
