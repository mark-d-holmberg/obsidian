// A set implementation that treats objects with the same property values as
// equal.
export default class ObjectSet extends Set {
	_map = new Map();

	get size () {
		return this._map.size;
	}

	add (value) {
		if (typeof value !== 'object') {
			throw new Error("Cannot add non-object to ObjectSet.");
		}

		const key = this._hash(value);
		this._map.set(key, value);
	}

	clear () {
		this._map.clear();
	}

	delete (value) {
		if (typeof value !== 'object') {
			return false;
		}

		const key = this._hash(value);
		return this._map.delete(key);
	}

	has (value) {
		if (typeof value !== 'object') {
			return false;
		}

		const key = this._hash(value);
		return this._map.has(key);
	}

	[Symbol.iterator]() {
		return this._map.values();
	}

	values () {
		return this._map.values();
	}

	keys () {
		return this.values();
	}

	*entries () {
		for (const value of this.values()) {
			yield [value, value];
		}
	}

	forEach (callbackfn, thisArg) {
		for (const value of this.values()) {
			callbackfn.call(thisArg ?? this, value, value, this);
		}
	}

	_hash (obj) {
		if (obj === null) {
			return null;
		}

		let finalHash = '';
		const keys = Object.keys(obj).sort();

		for (const key of keys) {
			let hash;
			const value = obj[key];

			switch (typeof value) {
				case 'undefined': hash = 'U'; break;
				case 'string': hash = `S~${value}`; break;
				case 'number': hash = value.toString(); break;
				case 'object':
					if (value === null) {
						hash = 'N';
					} else {
						hash = this._hash(value);
					}
					break;
			}

			finalHash += `${key}=${hash}`;
		}

		return finalHash;
	}
}
