Obsidian.Parse = {
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
					buf = Obsidian.Parse.lookup(buf, actorData);
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
			buf = Obsidian.Parse.lookup(buf, actorData);
		}

		push();

		const evaluate = terms => {
			const fst = terms[0];
			if (fst === undefined) {
				return 0;
			}

			if (isNaN(Number(fst)) && !Array.isArray(fst)) {
				return Obsidian.Parse.fns[fst](...terms.slice(1).map(arg => evaluate(arg)));
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
					total = Obsidian.Parse.ops[op](total, val);
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
			const classes = flags.classes;
			const components = prop.split('.');
			let cls = classes.find(c => c.name === components[1]);

			if (!cls) {
				cls = classes.find(c =>
					c.custom.toLocaleLowerCase() === components[1].toLocaleLowerCase());
			}

			if (cls) {
				return getProperty(cls, components.slice(2).join('.'));
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
		return text.replace(
			Obsidian.Parse.regex,
			(match, expr) => Obsidian.Parse.eval(expr, actorData));
	}
};
