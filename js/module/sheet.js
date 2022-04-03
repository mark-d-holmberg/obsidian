import {Reorder} from './reorder.js';
import {OBSIDIAN} from '../global.js';
import {ObsidianViewDialog} from '../dialogs/view.js';
import {ObsidianActor} from './actor.js';
import {ObsidianItems} from './items.js';
import ActorSheet5e from '../../../../systems/dnd5e/module/actor/sheets/base.js';

export const Sheet = {
	activateAbilityScores: function (sheet, html) {
		html.find('.obsidian-char-ability-score')
			.focus(evt => {
				const target = $(evt.currentTarget);
				const positive = target.hasClass('obsidian-positive');
				const negative = target.hasClass('obsidian-negative');
				evt.currentTarget._orig = target.val();
				evt.currentTarget._positive = positive;
				evt.currentTarget._negative = negative;
				target.removeClass('obsidian-positive obsidian-negative');
				target.val(target.next().val());
			})
			.focusout(evt => {
				if (evt.currentTarget._positive) {
					evt.currentTarget.classList.add('obsidian-positive');
				} else if (evt.currentTarget._negative) {
					evt.currentTarget.classList.remove('obsidian-negative');
				}

				evt.currentTarget.value = evt.currentTarget._orig;
			})
			.off('change')
			.change(evt => {
				const target = $(evt.currentTarget);
				target.next().val(target.val());
				sheet._onSubmit(evt);
			});
	},

	activateDragging: function (sheet, html) {
		html.on('dragend', () => {
			sheet.details.forEach((open, el) => el.open = open);
			sheet.element.find('.obsidian-drag-indicator').css('display', 'none');
			sheet.element.find('.obsidian-inv-container').removeClass('obsidian-container-drop');
		});

		html.find('[draggable]').each((i, el) =>
			el.addEventListener('dragstart', evt => Sheet.onDragItemStart(sheet, evt), false));
	},

	activateFiltering: function (sheet, html) {
		html.find('.obsidian-search-spell-name').keyup(() => Sheet.filterSpells(sheet));
		html.find('.obsidian-search-inv-name').keyup(() => Sheet.filterEquipment(sheet));
		html.find('.obsidian-clear-inv-name')
			.click(Sheet.clearSearch.bind(sheet, () => Sheet.filterEquipment(sheet)));

		html.find('.obsidian-clear-spell-name')
			.click(Sheet.clearSearch.bind(sheet, () => Sheet.filterSpells(sheet)));

		Sheet.filterSpells(sheet);
		Sheet.filterEquipment(sheet);
	},

	activateListeners: function (sheet, html) {
		html.find('.obsidian-delete').click(evt => Sheet.onDeleteFeature(sheet, evt));
		html.find('.obsidian-attack-toggle').click(evt => Sheet.onAttackToggle(sheet, evt));
		html.find('.obsidian-add-spell').click(evt => Sheet.onAddSpell(sheet, evt));
		html.find('.obsidian-add-custom-item').click(evt => Sheet.onAddItem(sheet, evt));
		html.find('.obsidian-equip-action').click(evt => Sheet.onEquip(sheet, evt));
		html.find('.obsidian-attune').click(evt => Sheet.onAttune(sheet, evt));
		html.find('.obsidian-equipped-box').click(evt => Sheet.updateContainerEquipped(sheet, evt));
		html.find('.obsidian-inv-container').click(evt => Sheet.saveContainerState(sheet, evt));
		html.find('[data-component-id] .obsidian-feature-use')
			.click(evt => Sheet.onUseClicked(sheet, evt));
		html.find('.obsidian-view').click(evt => Sheet.viewItem(sheet, $(evt.currentTarget)));
		html.find('[contenteditable]').focusout(evt => Sheet.onContenteditableUnfocus(sheet, evt));
		html.find('.obsidian-short-rest').click(sheet.actor.shortRest.bind(sheet.actor));
		html.find('.obsidian-long-rest').click(sheet.actor.longRest.bind(sheet.actor));
		html.find('.obsidian-global-advantage').click(() => Sheet.setGlobalRoll(sheet, 'adv'));
		html.find('.obsidian-global-disadvantage').click(() => Sheet.setGlobalRoll(sheet, 'dis'));
		html.find('.obsidian-feature-header').mouseup(evt => Sheet.collapseFeature(sheet, evt));

		html.find('.obsidian-conditions .obsidian-item-drop-pill')
			.click(evt => Sheet.setCondition(sheet, evt));
		html.find('.obsidian-exhaustion .obsidian-radio')
			.click(evt => Sheet.setExhaustion(sheet, evt));
		html.find('.obsidian-exhaustion .obsidian-item-drop-pill-header')
			.click(evt => Sheet.setExhaustion(sheet, evt));
		html.find('.obsidian-death-successes .obsidian-radio, '
			+ '.obsidian-death-successes .fancy-checkbox')
			.click(evt => Sheet.setAttributeLevel(sheet, 'data.attributes.death.success', evt));
		html.find('.obsidian-death-failures .obsidian-radio, '
			+ '.obsidian-death-failures .obsidian-feature-use')
			.click(evt => Sheet.setAttributeLevel(sheet, 'data.attributes.death.failure', evt));

		html.find('.obsidian-effect-toggle').click(evt => Sheet.onEffectToggled(sheet, evt));

		html.find('[data-spell-level] .obsidian-feature-use')
			.click(evt => Sheet.onSlotClicked(sheet, evt));

		html.find('[data-roll]')
			.click(evt => ObsidianItems.roll(sheet.actor, evt.currentTarget.dataset));
	},

	clearSearch: function (filter, evt) {
		const target = $(evt.currentTarget);
		const search = target.siblings('.obsidian-input-search');
		search.val('');
		filter();
	},

	collapseFeature: function (sheet, evt) {
		if (evt.button !== 2) {
			return;
		}

		const id = evt.currentTarget.parentElement.dataset.itemId;
		const item = sheet.actor.items.get(id);

		if (!item) {
			return;
		}

		const collapsed = !!item.data.flags.obsidian.collapsed;
		sheet.actor.updateEmbeddedDocuments('Item', [{
			_id: id,
			'flags.obsidian.collapsed': !collapsed
		}]);
	},

	contextMenu: function (sheet, html, npc = false) {
		const del = {
			name: 'OBSIDIAN.Delete',
			icon: '<i class="fas fa-trash"></i>',
			callback: el => Sheet.deleteItem(sheet, el),
			condition: li => {
				const actor = sheet.actor || sheet.parent.actor;
				if (actor) {
					const item = actor.items.get(li.data('item-id'));
					return item.type !== 'spell' || !item.data.flags.obsidian.parentComponent;
				}
			}
		};

		const edit = {
			name: 'OBSIDIAN.Edit',
			icon: '<i class="fas fa-edit"></i>',
			callback: el => Sheet.editItem(sheet, el)
		};

		const view = {
			name: 'OBSIDIAN.View',
			icon: '<i class="fas fa-eye"></i>',
			callback: el => Sheet.viewItem(sheet, el),
			condition: li => {
				const actor = sheet.actor || sheet.parent.actor;
				if (actor) {
					const item = actor.items.get(li.data('item-id'));
					return item.type !== 'tool' && item.type !== 'loot';
				}
			}
		};

		const split = {
			name: 'OBSIDIAN.Split',
			icon: '<i class="fas fa-exchange-alt"></i>',
			callback: li => Sheet.splitItem(sheet, li),
			condition: li => {
				const actor = sheet.actor || sheet.parent.actor;
				if (actor) {
					const item = actor.items.get(li.data('item-id'));
					return item.data.data.quantity > 1;
				}
			}
		};

		let equipment;
		let containers;
		let spells;

		if (sheet.options.editable) {
			equipment = [edit, view, split, del];
			containers = [edit, view, del];
			spells = [edit, view];

			if (npc) {
				spells.push(del);
			}
		} else {
			equipment = [view];
			containers = [view];
			spells = [view];
		}

		new ContextMenu(html, '.obsidian-inv-container', containers);
		new ContextMenu(html, '.obsidian-spell-tr.item, .obsidian-atk-tr.item', spells);
		new ContextMenu(
			html, '.obsidian-tr.item:not(.obsidian-spell-tr):not(.obsidian-atk-tr)', equipment);
	},

	deleteItem: async function (sheet, el) {
		const id = el.data('item-id');
		const item = sheet.actor.items.get(id);
		await sheet.actor.deleteEmbeddedDocuments('Item', [id]);
		sheet.actor.updateEquipment(item);
	},

	editItem: function (sheet, el) {
		sheet.actor.items.find(item => item.id === el.data('item-id')).sheet.render(true);
	},

	filterEquipment: function (sheet) {
		const invTab = sheet.element.find('[data-group="main-tabs"][data-tab="equipment"]');
		const name = invTab.find('.obsidian-input-search').val();
		const filter =
			invTab.find('ul[data-group="equipment"] li.active').data('tab').substring(10);

		invTab.find('.obsidian-tr.item').each((_, el) => {
			const jqel = $(el);
			jqel.removeClass('obsidian-hidden');

			const nameMatch = name.length < 1 || el.dataset.name.toLowerCase().includes(name);
			const categoryMatch =
				filter === 'all'
				|| el.dataset[`filter${filter.capitalize()}`] === 'true'
				|| (filter === 'other'
					&& !Object.keys(el.dataset).some(key => key.startsWith('filter')));

			if (!categoryMatch || !nameMatch) {
				jqel.addClass('obsidian-hidden');
			}
		});
	},

	filterSpells: function (sheet) {
		const spellTab = sheet.element.find('[data-group="main-tabs"][data-tab="spells"]');
		if (!spellTab.length) {
			return;
		}

		const name = spellTab.find('.obsidian-input-search').val();
		const filter = spellTab.find('ul[data-group="spells"] li.active').data('tab').substring(6);

		spellTab.find(
			'.obsidian-spell-table .obsidian-scrollable > h3, '
			+ '.obsidian-spell-table .obsidian-scrollable > .obsidian-table')
			.addClass('obsidian-hidden');

		spellTab.find('.obsidian-spell-table .obsidian-tr.item').each((_, el) => {
			const jqel = $(el);
			jqel.removeClass('obsidian-hidden');

			const nameMatch = name.length < 1 || el.dataset.name.toLowerCase().includes(name);
			const categoryMatch =
				filter === 'all'
				|| filter === el.dataset.level
				|| (filter === 'concentration' && el.dataset.concentration === 'true')
				|| (filter === 'ritual' && el.dataset.ritual === 'true');

			if (!categoryMatch || !nameMatch) {
				jqel.addClass('obsidian-hidden');
			}
		});

		spellTab.find('.obsidian-spell-table .obsidian-tr.item:not(.obsidian-hidden)')
			.closest('.obsidian-table').each((i, el) => {
			const jqel = $(el);
			jqel.removeClass('obsidian-hidden');
			jqel.prev().removeClass('obsidian-hidden');
		});

		if (filter === 'all') {
			spellTab.find('.obsidian-spell-table > h3').removeClass('obsidian-hidden');
		}
	},

	getRules: function (data) {
		data.rules =
			Object.entries(data.actor.obsidian.rules)
				.filter(([, active]) => active)
				.map(([rule,]) => {
					return {key: rule, active: ObsidianActor.isRuleActive(data.actor, rule)};
				});
	},

	getSenses: function (data) {
		data.senses = game.dnd5e.config.senses;
		data.hasSenses =
			Object.keys(data.senses)
				.map(sense => data.data.attributes.senses[sense])
				.filter(n => n != null)
				.reduce((n, acc) => acc + n, 0) > 0;
	},

	onAddItem: async function (sheet, evt) {
		evt.preventDefault();
		evt.stopPropagation();

		const name = game.i18n.localize('OBSIDIAN.Item');
		const dlg = await renderTemplate('modules/obsidian/html/dialogs/new-item.html', {
			upper: name,
			lower: name.toLocaleLowerCase(),
			types: ['weapon', 'equipment', 'consumable', 'loot', 'tool', 'backpack']
		});

		new Dialog({
			title: game.i18n.localize('OBSIDIAN.NewCustomItem'),
			content: dlg,
			buttons: {
				create: {
					icon: '<i class="fas fa-check"></i>',
					label: game.i18n.localize('OBSIDIAN.CreateItem'),
					callback: dlg =>
						sheet.actor.createEmbeddedDocuments(
							'Item', [new FormDataExtended(dlg.find('form')[0]).toObject()],
							{renderSheet: true})
				}
			},
			default: 'create'
		}, {classes: ['form', 'dialog', 'obsidian-window'], jQuery: true}).render(true);
	},

	onAddSpell: function (sheet, evt) {
		evt.preventDefault();
		evt.stopPropagation();

		sheet.actor.createEmbeddedDocuments('Item', [{
			type: 'spell',
			name: game.i18n.localize('OBSIDIAN.NewSpell')
		}]).then(spells => spells.shift().sheet.render(true));
	},

	onAttackToggle: function (sheet, evt) {
		evt.preventDefault();
		const uuid = evt.currentTarget.dataset.componentId;
		const attack = sheet.actor.data.obsidian.components.get(uuid);
		const effect = sheet.actor.data.obsidian.effects.get(attack.parentEffect);
		const item = sheet.actor.items.get(effect.parentItem);
		const tags = item.data.flags.obsidian.tags;
		const current = attack.mode;
		let mode = 'melee';

		if (tags.thrown && tags.versatile) {
			if (current === 'melee') {
				mode = 'ranged';
			} else if (current === 'ranged') {
				mode = 'versatile';
			}
		} else if (current === 'melee') {
			if (tags.thrown) {
				mode = 'ranged';
			} else if (tags.versatile) {
				mode = 'versatile';
			}
		}

		const update = {
			_id: item.id,
			[`flags.obsidian.effects.${effect.idx}.components.${attack.idx}.mode`]: mode
		};

		sheet.actor.updateEmbeddedDocuments(
			'Item', [OBSIDIAN.updateArrays(item.data._source, update)]);
	},

	onAttune: function (sheet, evt) {
		evt.preventDefault();
		const id = evt.currentTarget.closest('.obsidian-tr.item').dataset.itemId;
		const item = sheet.actor.items.get(id);

		if (!item) {
			return;
		}

		const attuned = !!item.data.data.attuned;
		sheet.actor.updateEmbeddedDocuments('Item', [{_id: item.id, 'data.attuned': !attuned}]);
	},

	onContenteditableUnfocus: function (sheet, evt) {
		setTimeout(() => {
			if (!$(':focus').length) {
				sheet._onSubmit(evt);
			}
		}, 25);
	},

	onDeleteFeature: function (sheet, evt) {
		const target = evt.currentTarget;
		if (!target.classList.contains('obsidian-alert')) {
			target.classList.add('obsidian-alert');
			return;
		}

		sheet.actor.deleteEmbeddedDocuments('Item', [target.closest('.item').dataset.itemId]);
	},

	onDragItemStart: function (sheet, event) {
		const target = event.currentTarget;
		if (target.tagName === 'SUMMARY') {
			$(target).closest('.obsidian-tbody').children('details').each((i, el) => {
				sheet.details.set(el, el.open);
				el.open = false;
			});
		}

		const dragData = {
			actorId: sheet.actor.id,
			uuid: sheet.actor.uuid
		};

		const item = sheet.actor.items.get(target.dataset.itemId);
		if (item) {
			dragData.type = 'Item';
			dragData.data = item.toObject();
			dragData.effectId = target.dataset.effectId;
		}

		if (['skl', 'tool', 'save', 'abl'].includes(target.dataset.roll)) {
			dragData.type = 'obsidian-roll';
			dragData.data = {};

			for (const prop in target.dataset) {
				dragData.data[prop] = target.dataset[prop];
			}
		}

		if (target.classList.contains('obsidian-char-inv-header-currency')) {
			dragData.type = 'obsidian-currency';
		}

		event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
		return Reorder.dragStart(event);
	},

	onDrop: function (sheet, event) {
		let data;
		try {
			data = JSON.parse(event.dataTransfer.getData('text/plain'));
			if (data.type === 'Actor') {
				return ActorSheet5e.prototype._onDropActor.call(sheet, event, data);
			} else if (data.type === 'obsidian-currency') {
				const from = ObsidianActor.fromUUID(data.uuid);
				return Sheet.transferCurrency(from, sheet.actor, event, data);
			}
		} catch (ignored) {}

		return Reorder.drop(sheet.actor, event);
	},

	onEffectToggled: function (sheet, evt) {
		const row = evt.currentTarget.closest('.obsidian-tr');
		const uuid = row.dataset.uuid;
		const rule = row.dataset.rule;

		if (uuid) {
			const effect = sheet.actor.data.obsidian.effects.get(uuid);
			const item = sheet.actor.items.get(effect.parentItem);
			const effects = duplicate(item.data._source.flags.obsidian.effects);
			const newEffect = effects.find(e => e.uuid === uuid);
			newEffect.toggle.active = !newEffect.toggle.active;
			item.update({'flags.obsidian.effects': effects});
		} else if (rule) {
			const rules = sheet.actor.data.flags.obsidian.rules;
			const current = rules ? (rules[rule] ?? true) : true;
			sheet.actor.update({[`flags.obsidian.rules.${rule}`]: !current});
		}
	},

	onEquip: function (sheet, evt) {
		const id = $(evt.currentTarget).closest('.obsidian-tr').data('item-id');
		const item = sheet.actor.items.get(id);

		if (!item || !item.data.flags.obsidian) {
			return;
		}

		if (item.data.obsidian.equippable) {
			sheet.actor.updateEmbeddedDocuments(
				'Item', [{_id: id, 'data.equipped': !item.data.data.equipped}]);
		} else {
			evt.currentTarget.dataset.roll = 'item';
			evt.currentTarget.dataset.id = id;
			ObsidianItems.roll(sheet.actor, evt.currentTarget.dataset);
		}
	},

	onSlotClicked: function (sheet, evt) {
		const target = evt.currentTarget;
		const spellLevel = target.parentElement.dataset.spellLevel;
		const n = Number(target.dataset.n);
		const spellKey = spellLevel === 'pact' ? 'pact' : `spell${spellLevel}`;
		const spells = sheet.actor.data.data.spells[spellKey];
		const used = spells.max - spells.value;

		if (n > used && (spells.tmp || 0) > 0) {
			return sheet.actor.update({[`data.spells.${spellKey}.tmp`]: spells.tmp - 1});
		}

		const newValue = spells.value + (n > used ? -1 : 1);
		sheet.actor.update({[`data.spells.${spellKey}.value`]: newValue});
	},

	onUseClicked: function (sheet, evt) {
		const target = evt.currentTarget;
		const uuid = target.parentElement.dataset.componentId;
		const n = Number(target.dataset.n);
		const resource = sheet.actor.obsidian.components.get(uuid);

		if (!resource) {
			return;
		}

		const effect = sheet.actor.obsidian.effects.get(resource.parentEffect);
		if (!effect) {
			return;
		}

		const item = sheet.actor.items.get(effect.parentItem);
		if (!item) {
			return;
		}

		const max = Math.max(resource.max, resource.remaining);
		let used = max - resource.remaining;

		if (used < 0) {
			used = 0;
		}

		if (n > used) {
			used++;
		} else {
			used--;
		}

		const update = {
			_id: item.id,
			[`flags.obsidian.effects.${effect.idx}.components.${resource.idx}.remaining`]:
			max - used
		};

		return sheet.actor.updateEmbeddedDocuments(
			'Item', [OBSIDIAN.updateArrays(item.data._source, update)]);
	},

	saveContainerState: function (sheet, evt) {
		const target = evt.currentTarget;
		const id = target.dataset.itemId;

		// The click event fires before the open state is toggled so we invert
		// it here to represent what the state will be right after this event.
		sheet.actor.updateEmbeddedDocuments(
			'Item',
			[{_id: id, 'flags.obsidian.open': !target.parentNode.open}],
			{render: false});
	},

	setAttributeLevel: function (sheet, prop, evt) {
		const current = getProperty(sheet.actor.data, prop);
		const value = Number(evt.currentTarget.dataset.value);
		let update = current;

		if (value > current) {
			update++;
		} else {
			update--;
		}

		sheet.actor.update({[`${prop}`]: update});
	},

	setCondition: function (sheet, evt) {
		const id = $(evt.currentTarget).data('value');
		const current = sheet.actor.data.obsidian.conditions[id];
		const existing =
			sheet.actor.effects.find(effect => effect.getFlag('core', 'statusId') === id);

		if (existing) {
			existing.delete();
		} else if (!current) {
			// Avoid 'invisibly' turning on the condition when it was actually
			// enabled through an automated effect rather than being manually
			// switched on.
			sheet.actor.createEmbeddedDocuments('ActiveEffect', [{
				label: game.i18n.localize(`OBSIDIAN.Condition.${id}`),
				icon: `modules/obsidian/img/conditions/${id}.svg`,
				'flags.core.statusId': id
			}]);
		}
	},

	setExhaustion: async function (sheet, evt) {
		let current = 0;
		const existing = sheet.actor.effects.filter(effect => {
			const id = effect.getFlag('core', 'statusId');
			if (id?.startsWith('exhaust')) {
				const value = Number(id.substr(7));
				if (value > current) {
					current = value;
				}

				return true;
			}

			return false;
		}).map(effect => effect.id);

		const value = Number(evt.currentTarget.dataset.value);
		let update = current;

		if (value > current) {
			update++;
		} else {
			update--;
		}

		if (existing.length) {
			await sheet.actor.deleteEmbeddedDocuments('ActiveEffect', existing);
		}

		if (update > 0) {
			sheet.actor.createEmbeddedDocuments('ActiveEffect', [{
				label: game.i18n.localize('OBSIDIAN.Condition.exhaustion'),
				icon: `modules/obsidian/img/conditions/exhaust${update}.svg`,
				'flags.core.statusId': `exhaust${update}`
			}]);
		}
	},

	setGlobalRoll: function (sheet, roll) {
		const current = sheet.actor.data.flags.obsidian.sheet.roll;
		let result = 'reg';
		if (roll !== current) {
			result = roll;
		}

		sheet.actor.update({'flags.obsidian.sheet.roll': result});
	},

	splitItem: async function (sheet, li) {
		const item = sheet.actor.items.get(li.data('item-id'));
		if (!item) {
			return;
		}

		const doSplit = async qty => {
			const newItem = ObsidianActor.duplicateItem(item);
			newItem.data.data.quantity = qty;
			await sheet.actor.createEmbeddedDocuments('Item', [newItem.toJSON()]);
			sheet.actor.updateEmbeddedDocuments('Item', [{
				_id: item.id,
				'data.quantity': item.data.data.quantity - qty
			}]);
		};

		if (item.data.data.quantity < 3) {
			doSplit(1);
		} else {
			const dlg = await renderTemplate('modules/obsidian/html/dialogs/transfer.html', {
				max: item.data.data.quantity - 1,
				name: item.name
			});

			new Dialog({
				title: game.i18n.localize('OBSIDIAN.Split'),
				content: dlg,
				default: 'split',
				buttons: {
					split: {
						icon: '<i class="fas fa-exchange-alt"></i>',
						label: game.i18n.localize('OBSIDIAN.Split'),
						callback: dlg => doSplit(Number(dlg.find('input').val()))
					}
				}
			}, {classes: ['form', 'dialog', 'obsidian-window'], width: 300}).render(true);
		}
	},

	transferCurrency: async function (from, to, event, data) {
		if (!from || !to) {
			return;
		}

		let src;
		let dest;
		const [, container] = Reorder.detectElementBeneath(event);

		if (container) {
			dest = to.items.get(container.dataset.itemId);
		}

		if (data.containerId) {
			src = from.items.get(data.containerId);
		}

		if (from.uuid === to.uuid && src?.id === dest?.id) {
			return;
		}

		const existing = src?.getFlag('obsidian', 'currency') ?? from.data.data.currency;
		const doTransfer = dlg => {
			const transfer = {};
			const remaining = {...existing};

			dlg.find('input').each((i, el) => {
				const denom = el.name;
				const value = Number(el.value);

				if (isNaN(value) || value < 1) {
					return;
				}

				transfer[denom] = Math.min(value, existing[denom]);
				remaining[denom] -= transfer[denom];
			});

			if (src) {
				src.setFlag('obsidian', 'currency', remaining);
			} else {
				from.update({'data.currency': remaining});
			}

			if (to.isOwner) {
				to.receiveCurrency(transfer, dest?.id);
			} else {
				game.socket.emit('module.obsidian', {
					action: 'CURRENCY',
					uuid: to.uuid,
					containerId: dest?.id,
					currency: transfer
				});
			}
		};

		const currency = Object.fromEntries(Object.entries(existing).map(([k, v]) => {
			if (v == null) {
				v = 0;
			}
			return [k, v];
		}));

		const dlg = await renderTemplate('modules/obsidian/html/dialogs/transfer-currency.html', {
			currency
		});

		new Dialog({
			title: game.i18n.localize('OBSIDIAN.TransferCurrencyTo').format(to.name),
			content: dlg,
			default: 'transfer',
			buttons: {
				transfer: {
					icon: '<i class="fas fa-share"></i>',
					label: game.i18n.localize('OBSIDIAN.Transfer'),
					callback: doTransfer
				}
			}
		}, {jQuery: true, classes: ['form', 'dialog', 'obsidian-window'], width: 300}).render(true);
	},

	updateContainerEquipped: function (sheet, evt) {
		evt.stopPropagation();
		const id = evt.currentTarget.closest('summary').dataset.itemId;
		const item = sheet.actor.items.get(id);
		if (!item) {
			return false;
		}

		const equipped = item.data.data.equipped;
		item.update({'data.equipped': equipped === false});
		return false;
	},

	viewItem: function (sheet, el) {
		const id = el.data('item-id');
		const existing =
			Object.values(sheet.actor.apps).find(app =>
				app.constructor === ObsidianViewDialog && app.item.id === id);

		if (existing) {
			existing.render(true);
		} else {
			new ObsidianViewDialog(id, sheet).render(true);
		}
	}
};
