import {OBSIDIAN} from '../global.js';
import {Prepare} from '../rules/prepare.js';
import {Effect} from '../module/effect.js';
import {getEffectLabel} from '../module/item.js';

export function registerHandlebarHelpers () {
	Handlebars.registerHelper('attack-sort', function (list) {
		const mapped = list.map((item, i) => {
			return {
				idx: i,
				key: item.parentEffect.name.length ? item.parentEffect.name : item.parentItem.name
			};
		});

		mapped.sort((a, b) => a.key === b.key ? 0 : a.key > b.key ? 1 : -1);
		return mapped.map(item => list[item.idx]);
	});

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

	Handlebars.registerHelper('checkbox-grid', function (selections, selected, ...prefix) {
		selected = new Set(selected.map(item => item.key));
		prefix.pop();

		return new Handlebars.SafeString(Object.entries(selections).map(([key, val]) => {
			const options = {hash: {content: val, checked: selected.has(key)}};
			return fancyCheckbox(...prefix, key, options);
		}).join(''));
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

	Handlebars.registerHelper('effect-label', function (effect) {
		return getEffectLabel(effect);
	});

	Handlebars.registerHelper('fancy-checkbox', function (...args) {
		return new Handlebars.SafeString(fancyCheckbox(...args));
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

	Handlebars.registerHelper('format-legendary', function (legact) {
		if (!legact?.max) {
			return '';
		}

		let out = '<div class="obsidian-feature-uses obsidian-legendary-actions">';
		for (let i = 0; i < legact.max; i++) {
			out += `
				<div class="obsidian-feature-use ${i < legact.value ? 'obsidian-feature-used' : ''}"
				     data-n="${i + 1}"></div>
			`;
		}

		out += '</div>';
		return new Handlebars.SafeString(out);
	});

	Handlebars.registerHelper('format-recharge', function (actor, feature, options) {
		const parts = [];
		if (options.hash.bull) {
			parts.push('');
		}

		if (feature.data.activation.type === 'legendary'
			&& feature.data.activation.cost
			&& feature.data.activation.cost > 1)
		{
			parts.push(
				feature.data.activation.cost
				+ ` ${game.i18n.localize('OBSIDIAN.Actions').toLocaleLowerCase()}`);
		}

		if (getProperty(feature, 'obsidian.bestResource.recharge.time')) {
			parts.push(formatRecharge(feature.obsidian.bestResource.recharge));
			return new Handlebars.SafeString(parts.join(' &bull; '));
		}

		if (feature.obsidian.consumers.length) {
			const consumer = feature.obsidian.consumers[0];
			if (consumer.target === 'spell' || consumer.target === 'qty') {
				return;
			}

			actor = game.actors.get(actor._id);
			const [, , resource] = Effect.getLinkedResource(actor.data, consumer);

			if (resource && getProperty(resource, 'recharge.time')) {
				parts.push(formatRecharge(resource.recharge));
				return new Handlebars.SafeString(parts.join(' &bull; '));
			}
		}

		return parts.join(' &bull; ');
	});

	Handlebars.registerHelper('format-slots', function (data, level) {
		if (data === undefined) {
			return '';
		}

		const used = data.max - data.value;
		const tmp = data.tmp || 0;

		if (!data.max) {
			return '';
		}

		let out = `<div class="obsidian-feature-uses" data-spell-level="${level}">`;
		for (let i = 0; i < data.max + tmp; i++) {
			out += `
				<div class="obsidian-feature-use
				     ${i < used ? 'obsidian-feature-used' : ''}
				     ${data.max + tmp - i > data.max ? 'obsidian-feature-positive' : ''}"
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

	Handlebars.registerHelper('format-uses', function (actor, feature) {
		if (feature.obsidian.bestResource) {
			const effect =
				feature.flags.obsidian.effects.find(effect =>
					effect.uuid === feature.obsidian.bestResource.parentEffect);

			if (!effect) {
				return;
			}

			return new Handlebars.SafeString(
				Prepare.usesFormat(feature, effect, feature.obsidian.bestResource));
		}

		if (feature.obsidian.consumers.length) {
			const consumer = feature.obsidian.consumers[0];
			if (consumer.target === 'spell' || consumer.target === 'qty') {
				return;
			}

			// This data is actually duplicated so we lose our maps and need to
			// instead get the actual actor instance.
			actor = game.actors.get(actor._id);
			const [item, effect, resource] = Effect.getLinkedResource(actor.data, consumer);

			if (item && effect && resource) {
				return new Handlebars.SafeString(Prepare.usesFormat(item, effect, resource));
			}
		}
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
			spellbookEntry = spellbook.find(entry => entry.prop === `spell${level}`);
		}

		return (spellbookEntry
			&& spellbookEntry.spells.some(spell =>
				spell.flags.obsidian && spell.flags.obsidian.visible))
			|| (level > 0 && (Number(spell.max) || actor.data.spells.pact?.level === level));
	});

	Handlebars.registerHelper('i18n-class', function (cls) {
		const key = `OBSIDIAN.Class-${cls}`;
		const translation = game.i18n.localize(key);

		if (translation === key) {
			return cls;
		}

		return translation;
	});

	Handlebars.registerHelper('i18n-join', function (...args) {
		args.pop();
		args = args.filter(arg => arg !== undefined && arg.length > 0);

		if (args.length < 2) {
			return '';
		}

		return game.i18n.localize(args.reduce((acc, x) => acc + x));
	});

	Handlebars.registerHelper('includes', function (haystack, needle) {
		return haystack.includes(needle);
	});

	Handlebars.registerHelper('is-attack-toggleable', function (attack) {
		const type = attack.parentItem.flags.obsidian.type;
		const tags = attack.parentItem.flags.obsidian.tags;
		return (type === 'melee' && tags.thrown) || tags.versatile;
	});

	Handlebars.registerHelper('is-fullwidth-font', function () {
		return game.i18n.lang === 'ja';
	});

	Handlebars.registerHelper('is-gm', function () {
		return game.user.isGM;
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

		return Array.range(start, end);
	});

	Handlebars.registerHelper('sort', function (list, by) {
		// Don't use duplicate to avoid trashing things like maps or sets,
		// or running afoul of circular references.
		const mapped = list.map((item, i) => {
			return {idx: i, key: item[by]};
		});

		mapped.sort((a, b) => a.key === b.key ? 0 : a.key > b.key ? 1 : -1);
		return mapped.map(item => list[item.idx]);
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

		return spellbook.find(entry => entry.prop === `spell${level}`) || {spells: []};
	});

	Handlebars.registerHelper('starts-with', function (haystack, needle) {
		return haystack.startsWith(needle);
	});

	Handlebars.registerHelper('uc', function (arg) {
		return arg.toLocaleUpperCase();
	});

	Handlebars.registerHelper('which-damage', function (item, attack) {
		if (item.type === 'spell' && item.data.level < 1) {
			return item.obsidian.damage;
		}

		return attack.mode === 'versatile'
			? attack.parentEffect.versatile
			: attack.parentEffect.damage;
	});
}

function formatRecharge (recharge) {
	if (recharge.time === 'roll' && recharge.roll) {
		return `${game.i18n.localize('OBSIDIAN.Recharge')} ${recharge.roll}&mdash;6`;
	} else {
		return game.i18n.localize(`OBSIDIAN.Recharge-${recharge.time}`);
	}
}

function fancyCheckbox (...args) {
	const options = args.pop();
	const prop = args.join('.');

	return `
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
	`;
}
