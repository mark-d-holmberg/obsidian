export function extendPrimitives () {
	String.prototype.format = stringFormat;

	Math.sgn = function (n) {
		return n < 0 ? `${n}` : `+${n}`;
	};

	Number.prototype.sgn = function () {
		return this < 0 ? `${this}` : `+${this}`;
	};

	Number.prototype.sgnex = function () {
		return this < 0 ? ` - ${this * -1}` : ` + ${this}`;
	};

	Array.range = function (start, end) {
		return [...Array(end - start + 1).keys()].map(i => i + start);
	};

	Array.prototype.last = function () {
		return this[this.length - 1];
	};

	Map.prototype.computeIfAbsent = function (key, compute) {
		let val = this.get(key);
		if (val === undefined) {
			val = compute(key);
			this.set(key, val);
		}

		return val;
	};
}

function stringFormat (...args) {
	let str = this.toString();
	if (args.length) {
		const type = typeof args[0];
		if (!['string', 'number'].includes(type)) {
			args = args[0];
		}

		for (const key in args) {
			str = str.replace(new RegExp(`\\{${key}\\}`, 'gi'), args[key]);
		}
	}

	return str;
}
