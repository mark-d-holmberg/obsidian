import {OBSIDIAN} from '../global.js';
import {ObsidianActor} from './actor.js';

export const Reorder = {
	dragStart: function (event) {
		const target = event.target;
		if (target.dataset && target.dataset.reorderable === 'true') {
			event.dataTransfer.setData('item-id', target.dataset.itemId);
			if (target.tagName === 'SUMMARY') {
				event.dataTransfer.setData('source/container', null);
			}
		} else {
			event.dataTransfer.setData('macro-only', '');
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
		if (event.dataTransfer.types.some(type => type === 'macro-only')) {
			return false;
		}

		let data;
		let srcID;
		const idData = event.dataTransfer.types.find(type => type === 'item-id');

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

		if (data && data.data && data.actorId !== undefined && data.actorId !== actor.id) {
			// Transfer from another actor.
			Reorder.transfer(actor, data);
			return false;
		}

		if (data && !idData) {
			if (data.pack) {
				const pack = game.packs.get(data.pack);
				if (pack.metadata.entity !== 'Item') {
					return false;
				}

				const packItem = await pack.getDocument(data.id);
				delete packItem.data._id;
				const items =
					await actor.createEmbeddedDocuments(
						'Item', [ObsidianActor.duplicateItem(packItem).toJSON()]);

				const item = items.shift();
				if (item) {
					src = item;
				} else {
					return false;
				}
			} else {
				const created =
					await actor.createEmbeddedDocuments(
						'Item', [ObsidianActor.duplicateItem(game.items.get(data.id)).toJSON()]);

				src = created.shift();
			}
		}

		const [row, container, contents] = Reorder.detectElementBeneath(event);
		if (!row && !container && !contents) {
			return false;
		}

		const target = row ? row : container;
		const half = Reorder.whichHalf(event, target);
		const where = half === 'bottom' ? 'after' : 'before';
		const destID = target?.dataset.itemId;
		const dest = actor.items.get(destID);
		const update = {};

		if (idData) {
			if (srcID === destID) {
				return false;
			} else {
				src = actor.items.get(srcID);
				if (!src) {
					return false;
				}
			}
		}

		if (!['weapon', 'equipment', 'consumable', 'backpack', 'tool', 'loot'].includes(src.type)) {
			return false;
		}

		Reorder.insert(actor, src, dest, where, update);
		actor.update(OBSIDIAN.updateArrays(actor.data._source, update), {diff: false});
		return false;
	},

	detectElementBeneath: function (event) {
		let row;
		let container;
		let contents;
		let current = event.target;

		while (current && current.nodeType !== Node.DOCUMENT_NODE) {
			if (current.nodeType !== Node.ELEMENT_NODE) {
				current = current.parentNode;
				continue;
			}

			if (current.classList.contains('obsidian-tr')) {
				row = current;
			} else if (current.classList.contains('obsidian-inv-container')) {
				container = current;
			} else if (current.classList.contains('obsidian-tab-contents')) {
				contents = current;
				break;
			}

			current = current.parentNode;
		}

		return [row, container, contents];
	},

	insert: function (actor, src, dest, where, update) {
		const data = actor.data;
		const root = data.obsidian.inventory.root;
		const containers = data.obsidian.inventory.containers;
		const destParent = actor.getItemParent(dest);
		let siblings = destParent == null ? root : destParent.obsidian.contents;

		if (src.type === 'backpack') {
			siblings = containers;
		} else if (dest?.type === 'backpack') {
			siblings = dest.obsidian.contents;
		}

		const existing = siblings.find(i => i.id === src.id) || src;
		const updates = SortingHelpers.performIntegerSort(existing, {
			target: siblings.find(i => i.id === dest?.id),
			siblings: siblings,
			sortBefore: where === 'before'
		});

		updates.forEach(u => update[`items.${u.target.data.idx}.sort`] = u.update.sort);

		const parentKey = `items.${src.idx}.flags.obsidian.parent`;
		update[parentKey] = destParent?.id || null;

		if (src.type !== 'backpack' && dest?.type === 'backpack') {
			// Moving an item into a backpack.
			update[parentKey] = dest.id;
		}
	},

	transfer: async function (actor, transfer) {
		const doTransfer = qty => {
			let remaining = transfer.data.data.quantity - qty;
			if (remaining < 0) {
				remaining = 0;
			}

			const otherActor = game.actors.get(transfer.actorId);
			if (!otherActor) {
				return;
			}

			if (remaining === 0 && transfer.data.type !== 'consumable') {
				otherActor.deleteEmbeddedDocuments('Item', [transfer.id]);
			} else {
				otherActor.updateEmbeddedDocuments('Item', [{
					_id: transfer.id,
					'data.quantity': remaining
				}]);
			}

			transfer.data.data.quantity = qty;
			if (getProperty(transfer.data, 'flags.obsidian.parent')) {
				delete transfer.data.flags.obsidian.parent;
			}

			const item = ObsidianActor.duplicateItem(transfer.data);
			if (actor.isOwner) {
				actor.createEmbeddedDocuments('Item', [item.toJSON()]);
			} else {
				game.socket.emit('module.obsidian', {
					action: 'CREATE',
					entity: 'Item',
					actorID: actor.id,
					data: item.data
				});
			}
		};

		if (transfer.data.data.quantity < 2) {
			doTransfer(1);
		} else {
			const dlg = await renderTemplate('modules/obsidian/html/dialogs/transfer.html', {
				max: transfer.data.data.quantity,
				name: transfer.data.name
			});

			new Dialog({
				title: game.i18n.localize('OBSIDIAN.Transfer'),
				content: dlg,
				default: 'transfer',
				buttons: {
					transfer: {
						icon: '<i class="fas fa-share"></i>',
						label: game.i18n.localize('OBSIDIAN.Transfer'),
						callback: dlg => doTransfer(Number(dlg.find('input').val()))
					}
				}
			}, {classes: ['form', 'dialog', 'obsidian-window'], width: 300}).render(true);
		}
	},

	whichHalf: function (event, target) {
		if (!target) {
			return '';
		}

		if (!(target instanceof DOMRect)) {
			target = target.getBoundingClientRect();
		}

		return event.y > target.y + target.height / 2 ? 'bottom' : 'top';
	}
};
