Obsidian.Reorder = {
	dragStart: function (event) {
		const target = event.currentTarget;
		if (target.dataset && target.dataset.reorderable === 'true') {
			event.dataTransfer.setData(`item-id/${target.dataset.itemId}`, null);
			if (target.tagName === 'SUMMARY') {
				event.dataTransfer.setData('source/container', null);
			} else {
				event.dataTransfer.setData('source/item', null);
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

		if (!src) {
			return false;
		}

		src = src.split('/')[1];
		let [row, container, contents] = Obsidian.Reorder.detectElementBeneath(event);

		if (!contents) {
			return false;
		}

		contents = $(contents);
		contents.find('.obsidian-inv-container').removeClass('obsidian-container-drop');
		const indicator = contents.children('.obsidian-drag-indicator');

		if ((src === 'item' && row) || (src === 'container' && container)) {
			const rect = row ? row.getBoundingClientRect() : container.getBoundingClientRect();
			let top = rect.y;

			if (Obsidian.Reorder.whichHalf(event, rect) === 'bottom') {
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

	drop: function (actor, event, fallthrough) {
		event.preventDefault();
		const items = actor.items;
		const id = event.dataTransfer.types.find(type => type.startsWith('item-id'));

		if (!id) {
			return fallthrough(event);
		}

		const [row, container] = Obsidian.Reorder.detectElementBeneath(event);
		if (!row && !container) {
			return false;
		}

		const target = row ? row : container;
		const srcID = Number(id.split('/')[1]);
		const destID = Number(target.dataset.itemId);

		if (srcID === destID) {
			return false;
		}

		const src = items.find(item => item.id === srcID);
		const dest = items.find(item => item.id === destID);

		if (!src || !dest) {
			return false;
		}

		const update = {};
		const half = Obsidian.Reorder.whichHalf(event, target);
		Obsidian.Reorder.insert(actor, src, dest, half === 'bottom' ? 'after' : 'before', update);
		actor.update(update);
		return false;
	},

	detectElementBeneath: function (event) {
		let row;
		let container;
		let contents;

		for (const el of event.path) {
			if (el.className) {
				if (el.className.includes('obsidian-tr')) {
					row = el;
				} else if (el.className.includes('obsidian-inv-container')) {
					container = el;
				} else if (el.className.includes('obsidian-tab-contents')) {
					contents = el;
					break;
				}
			}
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

		const oldPos = fromOrder.indexOf(src.id);
		let newPos = toOrder.indexOf(dest.id);

		if (where === 'after' && toOrder !== fromOrder) {
			newPos++;
		}

		if (src.type !== 'backpack' && dest.type === 'backpack') {
			newPos = toOrder.length;
		}

		if (newPos < 0) {
			newPos = 0;
		}

		fromOrder.splice(oldPos, 1);
		toOrder.splice(newPos, 0, src.id);

		update[`flags.obsidian.order.equipment`] = duplicate(data.flags.obsidian.order.equipment);
		update[`items.${src.idx}.flags.obsidian.parent`] =
			src.type !== 'backpack' && dest.type === 'backpack'
				? dest.id
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
