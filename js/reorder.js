Obsidian.Reorder = {
	addToContainer: function (actor, item, container, update) {
		Obsidian.Reorder.removeFromOldContainer(actor, item, 'root', update);
		container.flags.obsidian.order.push(item.id);
		item.flags.obsidian.parent = container.id;
		update[`items.${container.idx}.flags.obsidian.order`] =
			duplicate(container.flags.obsidian.order);
		update[`items.${item.idx}.flags.obsidian.parent`] = container.id;
	},

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
		const src = items.find(item => item.id === srcID);
		const destID = Number(target.dataset.itemId);
		const dest = items.find(item => item.id === destID);

		if (!src || !dest) {
			return false;
		}

		const update = {};
		if (dest.type === 'backpack') {
			Obsidian.Reorder.addToContainer(actor, src, dest, update);
			return false;
		}

		const half = Obsidian.Reorder.whichHalf(event, target);
		Obsidian.Reorder.insert(actor, src, dest, half === 'bottom' ? 'after' : 'before', update);
		update[`flags.obsidian.order.equipment`] = duplicate(actor.flags.obsidian.order.equipment);
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

	insert: function (actor, item, sibling, where, update) {
		const bucket = item.type === 'backpack' ? 'containers' : 'root';
		Obsidian.Reorder.removeFromOldContainer(actor, item, bucket, update);

		let parent = sibling.flags.obsidian.parent;
		let order;

		if (parent == null) {
			order = actor.flags.obsidian.order[bucket];
		} else {
			parent = actor.getItemParent(sibling);
			order = parent.flags.obsidian.order;
		}

		let idx = order.indexOf(sibling.id);
		item.flags.obsidian.parent = parent == null ? null : parent.id;
		update[`items.${item.idx}.flags.obsidian.parent`] = item.flags.obsidian.parent;

		if (idx < 0) {
			order.push(item.id);
		} else {
			if (where === 'before') {
				idx--;
			}

			if (idx < 0) {
				order.unshift(item.id);
			} else {
				order.splice(idx, 0, item.id);
			}
		}

		if (parent != null) {
			update[`items.${parent.idx}.flags.obsidian.order`] = duplicate(order);
		}
	},

	removeFromOldContainer: function (actor, item, bucket, update) {
		let parent = item.flags.obsidian.parent;
		let order;

		if (parent == null) {
			order = actor.flags.obsidian.order.equipment[bucket];
		} else {
			parent = actor.getItemParent(item);
			order = parent.flags.obsidian.order;
		}

		const idx = order.indexOf(item.id);
		order.splice(idx, 1);

		if (parent != null) {
			update[`items.${parent.idx}.flags.obsidian.order`] = duplicate(order);
		}
	},

	whichHalf: function (event, target) {
		if (!(target instanceof DOMRect)) {
			target = target.getBoundingClientRect();
		}

		return event.y > target.y + target.height / 2 ? 'bottom' : 'top';
	}
};
