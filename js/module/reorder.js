import {OBSIDIAN} from '../rules/rules.js';

export const Reorder = {
	dragStart: function (event) {
		const target = event.target;
		if (target.dataset && target.dataset.reorderable === 'true') {
			event.dataTransfer.setData(`item-id`, target.dataset.itemId);
			if (target.tagName === 'SUMMARY') {
				event.dataTransfer.setData('source/container', null);
			}
		} else {
			event.stopPropagation();
			event.preventDefault();
			return false;
		}
	},

	dragOver: function (event) {
		event.preventDefault();
		let src = event.dataTransfer.types.find(type => type.startsWith('source/'));
		if (src) {
			src = src.split('/')[1];
		}

		let [row, container, contents] = Reorder.detectElementBeneath(event);
		if (!contents) {
			return false;
		}

		contents = $(contents);
		contents.find('.obsidian-inv-container').removeClass('obsidian-container-drop');
		const indicator = contents.children('.obsidian-drag-indicator');

		if ((!src && row) || (src === 'container' && container)) {
			const rect = row ? row.getBoundingClientRect() : container.getBoundingClientRect();
			let top = rect.y;

			if (Reorder.whichHalf(event, rect) === 'bottom') {
				top += rect.height;
			}

			indicator.css({
				top: top - 8,
				left: rect.x - 8,
				display: 'flex',
				width: `${rect.width + 16}px`
			});
		} else {
			indicator.css('display', 'none');
			$(container).addClass('obsidian-container-drop');
		}

		return false;
	},

	drop: async function (actor, event) {
		event.preventDefault();
		const items = actor.data.items;
		const idData = event.dataTransfer.types.find(type => type === 'item-id');

		let srcID;
		let data;

		try {
			data = JSON.parse(event.dataTransfer.getData('text/plain'));
		} catch (ignored) {}

		if (idData) {
			srcID = event.dataTransfer.getData('item-id');
		} else if (data && data.id) {
			srcID = data.id;
		}

		let src;
		if (!srcID && !data) {
			return false;
		}

		if (data && !idData) {
			if (data.data && data.actorId !== undefined && data.actorId !== actor.id) {
				// Transfer from another actor.
				// TODO: Delete from old actor.
				src = (await actor.createEmbeddedEntity('OwnedItem', data.data)).data;
			} else if (data.pack) {
				const item = await actor.importItemFromCollection(data.pack, data.id);
				if (item) {
					src = item;
				} else {
					return false;
				}
			} else {
				src =
					await actor.createEmbeddedEntity(
						'OwnedItem', duplicate(game.items.get(data.id).data));
			}
		}

		const [row, container] = Reorder.detectElementBeneath(event);
		if (!row && !container) {
			return false;
		}

		const target = row ? row : container;
		const half = Reorder.whichHalf(event, target);
		const where = half === 'bottom' ? 'after' : 'before';
		const destID = target.dataset.itemId;
		const dest = items.find(item => item._id === destID);
		const update = {};

		if (!dest) {
			return false;
		}

		if (idData) {
			if (srcID === destID) {
				return false;
			} else {
				src = items.find(item => item._id === srcID);
				if (!src) {
					return false;
				}
			}
		}

		Reorder.insert(actor, src, dest, where, update);
		actor.update(OBSIDIAN.updateArrays(actor.data, update));
		return false;
	},

	detectElementBeneath: function (event) {
		let row;
		let container;
		let contents;
		let current = event.target;

		while (current.nodeType !== Node.DOCUMENT_NODE) {
			if (current.nodeType !== Node.ELEMENT_NODE) {
				current = current.parentNode;
				continue;
			}

			if (current.className.includes('obsidian-tr')) {
				row = current;
			} else if (current.className.includes('obsidian-inv-container')) {
				container = current;
			} else if (current.className.includes('obsidian-tab-contents')) {
				contents = current;
				break;
			}

			current = current.parentNode;
		}

		return [row, container, contents];
	},

	insert: function (actor, src, dest, where, update) {
		const data = actor.data;
		const root = data.flags.obsidian.order.equipment.root;
		const containers = data.flags.obsidian.order.equipment.containers;
		const srcParent = actor.getItemParent(src);
		const destParent = actor.getItemParent(dest);
		let fromOrder = srcParent == null ? root : srcParent.flags.obsidian.order;
		let toOrder = destParent == null ? root : destParent.flags.obsidian.order;

		if (src.type === 'backpack') {
			fromOrder = containers;
			toOrder = containers;
		} else if (dest.type === 'backpack') {
			toOrder = dest.flags.obsidian.order;
		}

		const oldPos = fromOrder.indexOf(src._id);
		let newPos = toOrder.indexOf(dest._id);

		if (fromOrder === toOrder) {
			if (oldPos < newPos && where === 'before') {
				newPos--;
			} else if (oldPos > newPos && where === 'after') {
				newPos++;
			}
		} else if (where === 'after') {
			newPos++;
		}

		if (src.type !== 'backpack' && dest.type === 'backpack') {
			newPos = toOrder.length;
		}

		if (newPos < 0) {
			newPos = 0;
		}

		if (fromOrder !== toOrder || oldPos !== newPos) {
			fromOrder.splice(oldPos, 1);
			toOrder.splice(newPos, 0, src._id);
		}

		update['flags.obsidian.order.equipment'] = duplicate(data.flags.obsidian.order.equipment);
		update[`items.${src.idx}.flags.obsidian.parent`] =
			src.type !== 'backpack' && dest.type === 'backpack'
				? dest._id
				: dest.flags.obsidian.parent === undefined ? null : dest.flags.obsidian.parent;

		if (srcParent != null) {
			update[`items.${srcParent.idx}.flags.obsidian.order`] = duplicate(fromOrder);
		}

		if (src.type !== 'backpack' && dest.type === 'backpack') {
			update[`items.${dest.idx}.flags.obsidian.order`] = duplicate(toOrder);
		} else if (destParent != null) {
			update[`items.${destParent.idx}.flags.obsidian.order`] = duplicate(toOrder);
		}
	},

	whichHalf: function (event, target) {
		if (!(target instanceof DOMRect)) {
			target = target.getBoundingClientRect();
		}

		return event.y > target.y + target.height / 2 ? 'bottom' : 'top';
	}
};
