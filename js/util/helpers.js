import {OBSIDIAN} from '../rules/rules.js';
import {Prepare} from '../rules/prepare.js';

export function registerHandlebarHelpers () {
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

	Handlebars.registerHelper('count', function (ar) {
		return ar.length;
	});

	Handlebars.registerHelper('debug', console.debug);

	Handlebars.registerHelper('defined', function (arg) {
		return arg !== undefined;
	});

	Handlebars.registerHelper('defined-and-not-empty', function (arg) {
		return !OBSIDIAN.notDefinedOrEmpty(arg);
	});

	Handlebars.registerHelper('disabled', function (arg) {
		return arg ? '' : 'disabled';
	});

	Handlebars.registerHelper('exists', function (arg) {
		return arg != null;
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
		       ${options.hash.checked ? 'checked' : ''}
		       ${options.hash.selector ? `data-selector="${options.hash.selector}"` : ''}>
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

		if (!list) {
			return;
		}

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

		if (slots == null || typeof slots !== 'number' || uses == null || typeof uses !== 'number')
		{
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

	Handlebars.registerHelper('format-spell-duration', function (spell) {
		if (!spell.flags.obsidian) {
			return '—';
		}

		const duration = spell.flags.obsidian.duration;
		if (!['round', 'min', 'hour'].includes(duration.type)) {
			return game.i18n.localize(`OBSIDIAN.Duration-${duration.type}`);
		}

		let prefix = 'OBSIDIAN.DurationPlural-';
		if (Number(duration.n) === 1) {
			prefix = 'OBSIDIAN.Duration-';
		}

		return `${duration.n} `
			+ game.i18n.localize(`${prefix}${duration.type}`).toLocaleLowerCase();
	});

	Handlebars.registerHelper('format-uses', function (items, feature) {
		const uses = feature.flags.obsidian.uses;
		if (!uses.enabled) {
			return '';
		}

		const features = items.filter(item => item.type === 'feat' && item.flags.obsidian);
		const map = new Map(features.map(feat => [feat.id, feat]));
		let id = feature.id;
		let idx = feature.idx;
		let max = uses.max;
		let remaining = uses.remaining;

		if (uses.type === 'shared') {
			const shared = items.find(feat => feat.id === uses.shared);
			if (shared) {
				id = shared.id;
				idx = shared.idx;
				max = map.get(id).flags.obsidian.uses.max;
				remaining = map.get(id).flags.obsidian.uses.remaining;
			}
		}

		return new Handlebars.SafeString(Prepare.usesFormat(id, idx, max, remaining));
	});

	Handlebars.registerHelper('get-property', function (data, key) {
		return getProperty(data, key);
	});

	Handlebars.registerHelper('has-spell-with-name', function (haystack, needle) {
		if (haystack === undefined || needle === undefined) {
			return false;
		}

		return haystack.findIndex(spell => spell.name === needle.name) > -1;
	});

	Handlebars.registerHelper('has-spells', function (actor, spellbook, level) {
		if (!actor) {
			return;
		}

		const spell = actor.data.spells[`spell${level}`];
		let spellbookEntry;

		if (spellbook && spellbook.length) {
			spellbookEntry = spellbook.find(entry => entry.level === level);
		}

		return (spellbookEntry
			&& spellbookEntry.spells.some(spell =>
				spell.flags.obsidian && spell.flags.obsidian.visible))
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

	Handlebars.registerHelper('is-fullwidth-font', function () {
		return game.i18n.lang === 'ja';
	});

	Handlebars.registerHelper('lc', function (arg) {
		return arg.toLocaleLowerCase();
	});

	Handlebars.registerHelper('non-zero', function (obj, key) {
		for (const p in obj) {
			if (obj[p][key] > 0) {
				return true;
			}
		}

		return false;
	});

	Handlebars.registerHelper('not-empty', function (obj) {
		return obj != null && Object.keys(obj).length > 0;
	});

	Handlebars.registerHelper('num', function (n) {
		return Number(n);
	});

	Handlebars.registerHelper('num-size', function (n) {
		if (n !== undefined && `${n}`.length > 2) {
			return 'sm';
		}

		return 'md';
	});

	Handlebars.registerHelper('number-format', function (n) {
		return Intl.NumberFormat().format(n);
	});

	Handlebars.registerHelper('range', function (start, end) {
		if (end === undefined) {
			end = start;
			start = 0;
		}

		return [...Array(end - start + 1).keys()].map(i => i + start);
	});

	Handlebars.registerHelper('spell-level-format', function (level, options) {
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

	Handlebars.registerHelper('spellbook-lookup', function (spellbook, level) {
		if (!spellbook || !spellbook.length || isNaN(Number(level))) {
			return {spells: []};
		}

		return spellbook.find(entry => entry.level === level) || {spells: []};
	});

	Handlebars.registerHelper('starts-with', function (haystack, needle) {
		return haystack.startsWith(needle);
	});

	Handlebars.registerHelper('which-damage', function (attack) {
		return attack.flags.obsidian.mode === 'versatile'
			? attack.flags.obsidian.versatile
			: attack.flags.obsidian.damage;
	});
}
