import {ObsidianItems} from './rules/items.js';
import {Schema} from './module/schema.js';
import {Rules} from './rules/rules.js';
import {fixBackpacks} from './util/fixes.js';

export const OBSIDIAN = {};
OBSIDIAN.Items = ObsidianItems;
OBSIDIAN.Schema = Schema;
OBSIDIAN.Rules = Rules;

OBSIDIAN.notDefinedOrEmpty = function (obj) {
	return obj == null || obj === '';
};

OBSIDIAN.uuid = function () {
	return ([1e7]+-1e3+-4e3+-8e3+-1e11)
		.replace(/[018]/g, c =>
			(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
};

OBSIDIAN.Fixes = {
	fixBackpacks: fixBackpacks
};

String.prototype.capitalise = function () {
	if (!this.length) {
		return this;
	}

	return this[0].toLocaleUpperCase() + this.substring(1);
};

String.prototype.format = function (...args) {
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

window.OBSIDIAN = OBSIDIAN;