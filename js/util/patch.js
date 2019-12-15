import {patchDraggable_onDragMouseUp} from '../dialogs/view.js';
import {OBSIDIAN} from '../rules/rules.js';
import {patchChatMessage} from '../module/message.js';

export function runPatches () {
	window.createEditor = (function () {
		const cached = window.createEditor;
		return function () {
			const name = $(arguments[0].target).closest('form').data('obsidian-name');
			if (name) {
				arguments[0].content_css = 'css/mce.css,modules/obsidian/css/obsidian-mce.css';
			}

			const capture = cached.apply(this, arguments);
			if (name) {
				Hooks.callAll(`MCEInit-${name}`, capture);
			}

			return capture;
		};
	})();

	Entity.prototype.update = async function (data, options = {}) {
		const collection = this.collection;
		const name = this.entity;
		const update = updatePreserveArrays(this, data);

		if (update === false) {
			return this;
		}

		update._id = this._id;
		return SocketInterface.trigger(`update${name}`, {data: update}, options, {
			preHook: `preUpdate${name}`,
			context: collection,
			success: collection._updateEntity,
			postHook: `update${name}`
		});
	};

	PlaceableObject.prototype.update = async function (sceneId, data, options = {}) {
		const name = this.constructor.name;
		const update = updatePreserveArrays(this, flattenObject(data));

		if (update === false) {
			return this;
		}

		update.id = this.id;
		const eventData = {parentId: sceneId, data: expandObject(update)};

		await SocketInterface.trigger(`update${name}`, eventData, options, {
			preHook: `preUpdate${name}`,
			context: this,
			success: response => this.constructor.layer._updatePlaceableObject(response),
			postHook: `update${name}`
		});
	};

	Draggable.prototype._onDragMouseDown = (function () {
		const cached = Draggable.prototype._onDragMouseDown;
		return function (evt) {
			if (evt && evt.target && evt.target.tagName === 'INPUT' && evt.target.parentNode
				&& evt.target.parentNode.className === 'obsidian-titlebar-uses')
			{
				return;
			}

			cached.apply(this, arguments);
		};
	})();

	patchChatMessage();
	patchDraggable_onDragMouseUp();
}

function updatePreserveArrays (entity, newData) {
	const changed = {};
	for (const [k, v] of Object.entries(newData)) {
		const c = getProperty(entity.data, k);
		if (c !== v) {
			changed[k] = v;
		}
	}

	if (Object.keys(changed).length < 1) {
		return false;
	}

	const expanded = OBSIDIAN.updateArrays(entity.data, changed);
	return Object.keys(expanded).length > 0 ? expanded : changed;
}

OBSIDIAN.detectArrays = function (original, updates) {
	const arrays = new Set();
	for (const update in updates) {
		const path = [];
		let target = original;
		for (const prop of update.split('.')) {
			if (prop in target) {
				path.push(prop);
				const val = target[prop];
				if (Array.isArray(val)) {
					arrays.add(`${path.join('.')}.`);
					break;
				} else {
					target = val;
				}
			} else {
				break;
			}
		}
	}

	return [...arrays.values()];
};

OBSIDIAN.updateArrays = function (original, changed) {
	const arrays = OBSIDIAN.detectArrays(original, changed);
	const expanded = {};

	arrays.forEach(prop => {
		const p = prop.substr(0, prop.length - 1);
		expanded[p] = duplicate(getProperty(original, p));
	});

	if (arrays.length > 0) {
		for (const [k, v] of Object.entries(changed)) {
			let found = false;
			for (const pref of arrays) {
				if (k.startsWith(pref)) {
					found = true;
					const p = pref.substr(0, pref.length - 1);
					setProperty(expanded[p], k.substr(pref.length), v);
				}
			}

			if (!found) {
				expanded[k] = v;
			}
		}
	}

	return expanded;
};
