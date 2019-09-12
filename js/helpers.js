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
			${options.hash.style ? ` style="${options.hash.style}"` : ''}
			${options.hash.show ? ` data-show="${options.hash.show}"` : ''}
			${options.hash.hide ? ` data-hide="${options.hash.hide}"` : ''}
			${options.hash.selectorParent
				? ` data-selector-parent="${options.hash.selectorParent}"`
				: ''}>
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
			valid = valid && getProperty(item, args[i]) === args[i + 1];
		}

		return valid;
	});
});

Handlebars.registerHelper('format-slots', function (data, level) {
	if (data === undefined) {
		return '';
	}

	const slots = data.max == null ? data.slots : data.max;
	const uses = data.value == null ? data.uses : data.value;

	if (slots == null || typeof slots !== 'number' || uses == null || typeof uses !== 'number') {
		return '';
	}

	let out = `<div class="obsidian-feature-uses" data-spell-level="${level}">`;
	for (let i = 0; i < slots; i++) {
		out += `
			<div class="obsidian-feature-use${i < uses ? ' obsidian-feature-used' : ''}"
			     data-n="${i + 1}"></div>
		`;
	}

	out += '</div>';
	return new Handlebars.SafeString(out);
});

Handlebars.registerHelper('format-uses', function (items, feature) {
	const uses = feature.flags.obsidian.uses;
	if (!uses.enabled) {
		return '';
	}

	const features =
		items.filter(item =>
			item.type === 'feat' && item.flags.obsidian && item.flags.obsidian.custom);

	const map = new Map(features.map(feat => [feat.id, feat]));
	let id = feature.id;
	let idx = items.findIndex(feat => feat.id === id);
	let max = uses.max;
	let remaining = uses.remaining;

	if (uses.type === 'shared') {
		const shared = items.findIndex(feat => feat.id === uses.shared);
		if (shared > -1) {
			id = items[shared].id;
			idx = shared;
			max = map.get(id).flags.obsidian.uses.max;
			remaining = map.get(id).flags.obsidian.uses.remaining;
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
			<input type="number" name="items.${idx}.flags.obsidian.uses.remaining"
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

Handlebars.registerHelper('has-spells', function (actor, level) {
	const spell = actor.data.spells[`spell${level}`];
	const spellbook = actor.spellbook[level];
	return (spellbook
		&& spellbook.spells.filter(spell => spell.flags.obsidian.visible).length > 0)
		|| (level > 0 && Number(spell.max));
});

Handlebars.registerHelper('i18n-join', function (...args) {
	args.pop();
	args = args.filter(arg => arg !== undefined && arg.length > 0);

	if (args.length < 2) {
		return '';
	}

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

Handlebars.registerHelper('num', function (n) {
	return Number(n);
});

Handlebars.registerHelper('range', function (start, end) {
	if (end === undefined) {
		end = start;
		start = 0;
	}

	return [...Array(end - start + 1).keys()].map(i => i + start);
});

Handlebars.registerHelper('spellLevelFormat', function (level, options) {
	level = Number(level);
	if (level < 1) {
		return options.hash.cantrip ? game.i18n.localize('OBSIDIAN.Cantrip') : 0;
	}

	let n;
	if (level === 1) {
		n = game.i18n.localize('OBSIDIAN.FirstN');
	} else if (level === 2) {
		n = game.i18n.localize('OBSIDIAN.SecondN');
	} else if (level === 3) {
		n = game.i18n.localize('OBSIDIAN.ThirdN');
	} else {
		n = level + game.i18n.localize('OBSIDIAN.th');
	}

	let out = n;
	if (options.hash.level) {
		out += ` ${game.i18n.localize('OBSIDIAN.Level')}`;
	}

	return out;
});

Handlebars.registerHelper('startsWith', function (haystack, needle) {
	return haystack.startsWith(needle);
});

Handlebars.registerHelper('which-damage', function (attack) {
	return attack.flags.obsidian.mode === 'versatile'
		? attack.flags.obsidian.versatile
		: attack.flags.obsidian.damage;
});
