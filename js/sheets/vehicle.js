import ActorSheet5eVehicle from '../../../../systems/dnd5e/module/actor/sheets/vehicle.js';
import {Sheet} from '../module/sheet.js';
import {Reorder} from '../module/reorder.js';
import {ObsidianCharacter} from './obsidian.js';
import {ObsidianNPC} from './npc.js';
import {OBSIDIAN} from '../global.js';

export class ObsidianVehicle extends ActorSheet5eVehicle {
	constructor (...args) {
		super(...args);
		this.settings = {};

		if (this.actor.id) {
			game.settings.register('obsidian', this.actor.id, {
				default: '',
				scope: 'client',
				onChange: settings => this.settings = JSON.parse(settings)
			});

			this.settings = game.settings.get('obsidian', this.actor.id);
			if (this.settings === '') {
				this.settings = {equipmentCollapsed: true};
			} else {
				this.settings = JSON.parse(this.settings);
			}
		}

		this.details = new Map();
		this._dragging = false;
		this._resizing = false;
		this._initial = {x: null, y: null};
		this._moveListener = this._onMouseMove.bind(this);
		this._releaseListener = this._onMouseUp.bind(this);
		this._throttled = false;
		this._itemMenu = false;

		document.addEventListener('click', evt => {
			if (evt.button === 0
				&& !evt.target.closest('.obsidian-layout-item-controls')
				&& !evt.target.closest('.obsidian-layout-item-qty'))
			{
				$('.obsidian-layout-item-controls').css('display', 'none');
				$('.obsidian-layout-item-qty').css('display', 'none');
				this._itemMenu = false;
			}
		});
	}

	get template () {
		const limited = !this.actor.isOwner && this.actor.limited;
		return `modules/obsidian/html/vehicle${limited ? '-limited' : ''}.html`;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		mergeObject(options, {
			width: 768,
			classes: options.classes.concat(['obsidian-window']),
			scrollY: ['.obsidian-scrollable'],
			tabs: [{
				navSelector: 'ul.obsidian-tab-bar[data-group="main-tabs"]',
				contentSelector: 'form.obsidian',
				initial: 'stats'
			}, {
				navSelector: 'ul.obsidian-tab-bar[data-group="equipment"]',
				contentSelector: '.obsidian-inv-table',
				initial: 'equipment-all'
			}]
		});

		return options;
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		console.debug(this.actor);

		this.form.ondragover = Reorder.dragOver;
		this.form.ondrop = evt => this._onDrop(evt);

		if (!this.actor.isOwner && this.actor.limited) {
			return;
		}

		this._setCollapsed();
		this._setBackground();
		html.find('.obsidian-tab.item, .obsidian-sub-tab.item').removeAttr('draggable');
		$('.obsidian-msg-tooltip').css('display', 'none');
		html.find('.obsidian-layout-item')
			.hover(this._onHoverLayoutItem.bind(this), this._onLeaveLayoutItem.bind(this));
		Sheet.activateFiltering(this, html);
		Sheet.contextMenu(this, html);

		if (!this.options.editable) {
			return;
		}

		Sheet.activateDragging(this, html);

		const activateEditor =
			html.find('[data-edit="data.details.biography.value"]+.editor-edit')[0].onclick;

		html.find('.obsidian-edit-npc-notes').click(activateEditor.bind(this));
		html.find('.obsidian-equipment-tab-toggle').click(this._toggleEquipment.bind(this));
		html.find('.obsidian-vehicle-quality').focus(function () {
			this.value = Number(this.value).toString();
		}).blur(function () {
			this.value = Math.sgn(this.value);
		});

		this._activateLayout(html);
		Sheet.activateListeners(this, html);
		Sheet.activateAbilityScores(this, html);
		ObsidianCharacter.prototype._activateDialogs.apply(this, arguments);
	}

	async getData () {
		const data = super.getData();
		const type = data.actor.flags.obsidian.details.type;
		data.base = this.actor.toObject();
		data.items = this.actor.items.map(item => item.toObject(false));
		data.items.sort((a, b) => a.sort - b.sort);
		data.ObsidianConfig = OBSIDIAN.Config;
		data.ObsidianLabels = OBSIDIAN.Labels;
		data.airVehicle = type === 'air';
		data.landVehicle = type === 'land';
		data.waterVehicle = !type || type === 'water';
		data.featCategories = {};
		data.availableCrew = data.actor.data.cargo.crew.map(crew => crew.name);
		data.availableCrew.sort();
		data.vehicleCapacity = this._formatVehicleCapacity();
		data.pacePerDay = this._formatPacePerDay();

		const motionlessPenalty = data.data.abilities.dex.mod;
		if (motionlessPenalty > 0) {
			data.motionlessAC = data.data.attributes.ac.value - motionlessPenalty;
		}

		for (const item of data.items) {
			let cat;
			const isVehicleComponent =
				item.type === 'equipment' && item.flags.obsidian.subtype === 'vehicle';

			if (item.type === 'feat') {
				cat = item.data.activation.type;
				if (cat === 'special' || cat === 'bonus' || !cat.length) {
					cat = 'none';
				}
			} else if (item.type === 'weapon') {
				cat = data.landVehicle ? 'action' : 'component';
				if (!data.landVehicle) {
					item.componentType = 'weapon';
				}
			} else if (isVehicleComponent) {
				cat = 'component';
				item.isMovement = item.flags.obsidian.componentType === 'movement';

				if (item.flags.obsidian.componentType !== 'hull') {
					item.componentType = item.flags.obsidian.componentType;
				}
			} else {
				continue;
			}

			if ((['feat', 'weapon'].includes(item.type) || isVehicleComponent)
				&& !OBSIDIAN.notDefinedOrEmpty(item.flags.obsidian.conditions?.crew))
			{
				const threshold = item.flags.obsidian.conditions.crew;
				const layout = this.object.obsidian.layout;

				if (data.landVehicle) {
					const group = layout.groups[item._id];
					const crew = (group?.items || []).reduce((acc, a) => {
						if (layout.actors[a.id]) {
							acc += a.quantity;
						}
						return acc;
					}, 0);
					item.disabled = crew < threshold;
				} else {
					item.disabled = layout.crew < threshold;
				}
			}

			let category = data.featCategories[cat];
			if (!category) {
				category = [];
				data.featCategories[cat] = category;
			}

			category.push(item);
			item.obsidian.collection.attack.forEach(
				ObsidianCharacter.prototype._reifyAttackLinks,
				this);
		}

		data.featCategories.component?.sort((a, b) => {
			const typeA = a.componentType ?? a.flags.obsidian.componentType;
			const typeB = b.componentType ?? b.flags.obsidian.componentType;

			if (typeA === typeB) {
				return a.name.localeCompare(b.name);
			}

			const types = {hull: 1, control: 2, movement: 3, weapon: 4};
			return types[typeA] - types[typeB];
		});

		data.layout = await this._prepareLayout(data);

		return data;
	}

	render (force = false, options = {}) {
		ObsidianCharacter.prototype._applySettings.apply(this);
		return super.render(force, options);
	}

	setModal () {
		ObsidianCharacter.prototype.setModal.apply(this, arguments);
	}

	setPosition ({left, top, width, height, scale} = {}) {
		const pos = super.setPosition({left, top, width, height, scale});
		this._layoutGrid($(this.form));
		return pos;
	}

	_calculateEditorHeight () {
		return ObsidianNPC.prototype._calculateEditorHeight.apply(this, arguments);
	}

	activateEditor (name, options = {}, initialContent = '') {
		ObsidianNPC.prototype.activateEditor.apply(this, arguments);
	}

	_formatPacePerDay () {
		const walk = this.object.data.data.attributes.movement.walk;
		if (!walk || this.object.getFlag('obsidian', 'details.type') === 'land') {
			return '';
		}

		return `
			(${walk * 24}
			<span class="obsidian-npc-subtle">${game.i18n.localize('OBSIDIAN.MilesPerDay')}</span>)
		`;
	}

	_formatVehicleCapacity () {
		const capacity = this.object.data.data.attributes.capacity;
		const crew = capacity.crew
			? `${capacity.crew} ${game.i18n.localize('DND5E.VehicleCrew').toLowerCase()}`
			: '';
		const passengers = capacity.passengers
			? capacity.passengers
				+ ` ${game.i18n.localize('DND5E.VehiclePassengers').toLowerCase()}`
			: '';
		const cargo = capacity.cargo
			? capacity.cargo
				+ ` <span class="obsidian-npc-subtle">${game.i18n.localize('OBSIDIAN.Tons')}</span>`
			: '';
		return [[crew, passengers].filterJoin(', '), cargo].filterJoin('; ');
	}

	async _onChangeInput (event) {
		if (event.currentTarget.name.startsWith('qty-')) {
			return;
		}

		return super._onChangeInput(event);
	}

	async _onChangeInputDelta (event) {
		const delta = event.currentTarget.value;
		if (!event.currentTarget.classList.contains('obsidian-vehicle-component-hp')
			|| !['+', '-'].includes(delta.charAt(0)))
		{
			return super._onChangeInputDelta(event);
		}

		event.preventDefault();
		event.stopPropagation();
		const [, idx, ...props] = event.currentTarget.name.split('.');
		const item = this.object.items.contents[idx];

		if (!item) {
			return super._onChangeInputDelta(event);
		}

		const prop = props.join('.');
		let current = getProperty(item.data, prop);

		if (OBSIDIAN.notDefinedOrEmpty(current)) {
			current = 0;
		}

		item.update({[prop]: current + Number(delta)});
	}

	_onChangeTab (event, tabs, active) {
		if (active.startsWith('equipment-')) {
			Sheet.filterEquipment(this);
		}

		this._setCollapsed();
		this._setBackground();

		if (active === 'layout') {
			this._layoutGrid($(this.form));
		}
	}

	_onDrop (evt) {
		let data;
		try {
			data = JSON.parse(evt.dataTransfer.getData('text/plain'));
			if (data.type === 'Actor') {
				return this._addCrew(evt, data);
			}
		} catch (ignored) {}

		return Reorder.drop(this.actor, evt);
	}

	async _addCrew (evt, data) {
		if (!data.id && !data.uuid) {
			return;
		}

		let uuid = data.uuid;
		if (!uuid && data.id) {
			if (data.pack) {
				uuid = (await game.packs.get(data.pack)?.getDocument(data.id))?.uuid;
			} else {
				uuid = game.actors.get(data.id)?.uuid;
			}
		}

		if (!uuid) {
			return;
		}

		let raw = this.object.getFlag('obsidian', 'layout');
		if (!raw) {
			raw = {groups: [], items: [], actors: []};
		}

		if (!raw.actors) {
			raw.actors = [];
		}

		const matching = raw.actors.filter(a => a.uuid === uuid);
		matching.sort((a, b) => a.quantity - b.quantity);

		const existing = matching.pop();
		if (existing) {
			existing.quantity++;
		} else {
			raw.actors.push({uuid, quantity: 1, id: randomID(), parent: null});
		}

		return this.object.setFlag('obsidian', 'layout', raw);
	}

	_onResize (event) {
		ObsidianNPC.prototype._onResize.apply(this, arguments);
	}

	async _onSubmit (event, {updateData = null, preventClose = false, preventRender = false} = {}) {
		return ObsidianCharacter.prototype._onSubmit.apply(this, arguments);
	}

	_onMouseMove (evt) {
		if ((!this._dragging && !this._resizing) || this._throttled) {
			return;
		}

		this._throttled = true;
		requestAnimationFrame(() => {
			this._throttled = false;
			const {stride, size, gap} = this._getGrid();
			let top = evt.clientY - this._initial.y + this._initial.top;
			let left = evt.clientX - this._initial.x + this._initial.left;
			let height = evt.clientY - this._initial.y + this._initial.height;
			let width = evt.clientX - this._initial.x + this._initial.width;
			[top, left, height, width] = [top, left, height, width].map(x =>
				x.toNearest(stride) / stride);

			const isGroup = this._dragging
				? this._dragging.classList.contains('obsidian-layout-group')
				: !!this._resizing;

			const layout = isGroup
				? this._layoutForGroup(
					{x: left, y: top, w: width, h: height}, stride, gap)
				: this._layoutForItem({x: left, y: top}, stride, size, gap);

			if (this._dragging) {
				this._dragging.style.top = `${layout.top}px`;
				this._dragging.style.left = `${layout.left}px`;

				if (isGroup) {
					const group = this.object.obsidian.layout.groups[this._dragging.dataset.id];
					const diff = {x: left - group.x, y: top - group.y};
					group.items.forEach(item => {
						const l =
							this._layoutForItem(
								{x: item.x + diff.x, y: item.y + diff.y}, stride, size, gap);

						const el =
							this.form.querySelector(`.obsidian-layout-item[data-id="${item.id}"]`);

						el.style.top = `${l.top}px`;
						el.style.left = `${l.left}px`;
					});
				}
			} else if (this._resizing) {
				this._resizing.style.width = `${layout.width}px`;
				this._resizing.style.height = `${layout.height}px`;
			}
		});
	}

	_onMouseUp () {
		let {top, left, width, height} = (this._dragging || this._resizing).style;
		const {stride} = this._getGrid();
		[top, left, width, height] = [top, left, width, height].map(x =>
			Number(x.replace('px', '')).toNearest(stride) / stride);
		const id = (this._dragging || this._resizing).dataset.id;
		const type = this._dragging?.dataset?.type;
		const isDrag = !!this._dragging;
		const isGroup = isDrag
			? this._dragging.classList.contains('obsidian-layout-group')
			: !!this._resizing;
		this._dragging = false;
		this._resizing = false;
		document.removeEventListener('mousemove', this._moveListener);
		document.removeEventListener('mouseup', this._releaseListener);
		const update = {x: left, y: top};

		if (isGroup) {
			update.w = width;
			update.h = height;
		}

		const updates = [{id, isGroup, update, type}];
		if (isGroup && isDrag) {
			const group = this.object.obsidian.layout.groups[id];
			const diff = {x: left - group.x, y: top - group.y};
			group.items.forEach(item => updates.push({
				id: item.id, isGroup: false, type: item.type,
				update: {x: item.x + diff.x, y: item.y + diff.y}
			}));
		} else if (!isGroup && isDrag) {
			this._determineParent(update);
		}

		return this._updateLayout(updates);
	}

	_determineParent (update) {
		const groups = Object.values(this.object.obsidian.layout.groups);
		const {x, y} = update;

		update.parent = null;
		for (const group of groups) {
			if (x >= group.x && x < group.x + group.w && y >= group.y && y < group.y + group.h) {
				update.parent = group.id;
			}
		}
	}

	_onHoverLayoutItem (evt) {
		const target = evt.currentTarget;
		const bounds = target.getBoundingClientRect();
		let tooltip = target._tt;

		if (!tooltip) {
			tooltip =
				document.body.appendChild(
					target.querySelector('.obsidian-msg-tooltip').cloneNode(true));
			target._tt = tooltip;
		}

		const rect = tooltip.getBoundingClientRect();
		tooltip.style.display = 'block';
		tooltip.style.left = `${bounds.left}px`;
		tooltip.style.top = `${bounds.top - rect.height - (bounds.height / 2)}px`;
	}

	_onLeaveLayoutItem (evt) {
		if (evt.currentTarget._tt) {
			evt.currentTarget._tt.style.display = 'none';
		}
	}

	async _updateObject (event, formData) {
		return super._updateObject(event, OBSIDIAN.updateArrays(this.actor.data._source, formData));
	}

	_setBackground () {
		const grid = this._tabs[0]?.active === 'layout';
		this.element[0].classList.toggle('obsidian-vehicle-bg', grid);
	}

	_setCollapsed () {
		const tab = this.form.querySelector('.obsidian-floating-tab[data-tab="equipment"]');
		const active =
			this.settings.equipmentCollapsed === false && this._tabs[0]?.active === 'layout';
		tab.classList.toggle('active', active);
		const toggle = this.form.querySelector('.obsidian-equipment-tab-toggle object');
		toggle.dataset.fill = active ? '--obs-text-regular' : '--obs-mid';
		if (toggle.onload) {
			ObsidianNPC.prototype._applySVGFill.call(this, toggle);
		} else {
			toggle.onload = () => ObsidianNPC.prototype._applySVGFill.call(this, toggle);
		}
	}

	_toggleEquipment () {
		if (this.settings.equipmentCollapsed === undefined) {
			this.settings.equipmentCollapsed = false;
		} else {
			this.settings.equipmentCollapsed = !this.settings.equipmentCollapsed;
		}
		this._setCollapsed();

		if (this.actor.id) {
			game.settings.set('obsidian', this.actor.id, JSON.stringify(this.settings));
		}
	}

	async _prepareLayout () {
		const prepared = this.object.obsidian.layout;
		const actors = Object.values(prepared.actors);
		await Promise.all(actors.map(async a => {
			const actor = await fromUuid(a.uuid);
			a.name = actor.data.name;
			a.img = actor.data.img;
		}));

		return {
			groups: Object.values(prepared.groups),
			items: Object.values(prepared.items),
			actors
		};
	}

	_getGrid () {
		const layout = this.form.querySelector('.obsidian-layout');
		const computedStyle = getComputedStyle(layout);
		const [size, gap] = ['size', 'gap'].map(k =>
			Number(computedStyle.getPropertyValue(`--obs-grid-${k}`).replace('px', '')));
		const stride = size + gap;
		return {size, gap, stride};
	}

	_layoutGrid (html) {
		if (this._tabs[0]?.active !== 'layout') {
			return;
		}

		html = html[0];
		const layout = html.querySelector('.obsidian-layout');
		const {stride, size, gap} = this._getGrid();
		const groups = layout.querySelectorAll('.obsidian-layout-group');

		groups.forEach(group => {
			const config = this.object.obsidian.layout.groups[group.dataset.id];
			const {top, left, width, height} = this._layoutForGroup(config, stride, gap);
			group.style.left = `${left}px`;
			group.style.top = `${top}px`;
			group.style.width = `${width}px`;
			group.style.height = `${height}px`;
		});

		const items = layout.querySelectorAll('.obsidian-layout-item');
		const bounds = this.form.getBoundingClientRect();
		const rows = Math.floor(bounds.height / stride);
		let x = Math.floor((bounds.width - 47) / stride);
		let y = 0;

		for (const item of items) {
			const config = this.object.obsidian.layout[item.dataset.type][item.dataset.id];
			if (!('x' in config) || !('y' in config)) {
				config.x = x;
				config.y = y;
				y++;

				if (y >= rows) {
					y = 0;
					x--;
				}
			}

			const {top, left, width, height} = this._layoutForItem(config, stride, size, gap);
			item.style.left = `${left}px`;
			item.style.top = `${top}px`;
			item.style.width = `${width}px`;
			item.style.height = `${height}px`;
		}
	}

	_onAddGroup (evt, id) {
		const {stride} = this._getGrid();
		const bounds = this.form.getBoundingClientRect();
		const rows = Math.floor(bounds.height / stride);
		const group = {id: id ?? randomID(), x: 0, y: rows - 3, w: 3, h: 2};
		const groups = this.object.getFlag('obsidian', 'layout.groups');
		groups.push(group);
		return this.object.setFlag('obsidian', 'layout.groups', groups);
	}

	_onDeleteGroup (evt) {
		const id = evt.currentTarget.closest('[data-id]').dataset.id;
		const layout = this.object.getFlag('obsidian', 'layout');
		layout.groups.findSplice(g => g.id === id);
		layout.actors.forEach(a => {
			if (a.parent === id) {
				a.parent = null;
			}
		});
		return this.object.setFlag('obsidian', 'layout', layout);
	}

	_layoutForGroup (config, stride, gap) {
		const padding = gap / 2;
		return {
			left: config.x * stride + padding,
			top: config.y * stride + padding,
			width: config.w * stride + gap - 2 * padding,
			height: config.h * stride + gap - 2 * padding
		};
	}

	_layoutForItem (config, stride, size, gap) {
		return {
			left: config.x * stride + gap,
			top: config.y * stride + gap,
			width: size,
			height: size
		};
	}

	_activateLayout (html) {
		html.find('.obsidian-layout-add-group').css('display', 'flex')
			.click(this._onAddGroup.bind(this));

		html.find('.obsidian-layout-delete-group').click(this._onDeleteGroup.bind(this));

		html.find('.obsidian-layout-group h1').dblclick(evt => {
			evt.preventDefault();
			this._editGroupName = true;
			const target = evt.currentTarget;
			const jqel = $(target);
			target.contentEditable = 'true';
			jqel.focus();
			const id = target.closest('[data-id]').dataset.id;
			jqel.blur(() => {
				target.contentEditable = 'false';
				this._updateLayout([{id, isGroup: true, update: {name: target.innerText.trim()}}]);
				jqel.off('blur');
				jqel.off('keydown');
				this._editGroupName = false;
			}).keydown(evt => {
				if (evt.key === 'Enter') {
					evt.preventDefault();
					jqel.blur();
				}
			});
		});

		if (this._itemMenu) {
			html.find(
				`.obsidian-layout-item[data-id="${this._itemMenu}"] .obsidian-layout-item-controls`
			).css('display', 'grid');
			html.find(
				`.obsidian-layout-item[data-id="${this._itemMenu}"] .obsidian-layout-item-qty`
			).css('display', 'block');
		}

		html.find('.obsidian-layout-item').on('contextmenu', evt => {
			const target = evt.currentTarget;
			this._itemMenu = target.dataset.id;
			target.querySelector('.obsidian-layout-item-controls').style.display = 'grid';
			target.querySelector('.obsidian-layout-item-qty').style.display = 'block';
		});

		html.find('.obsidian-layout-item-qty').keyup(evt => {
			if (evt.key !== 'Enter') {
				return;
			}

			evt.preventDefault();
			let qty = evt.currentTarget.querySelector('input').value;
			if (OBSIDIAN.notDefinedOrEmpty(qty)) {
				return;
			}

			let current;
			const target = evt.currentTarget.closest('[data-id]');
			const id = target.dataset.id;
			const type = target.dataset.type;

			if (type === 'items') {
				const item = this.object.items.get(id);
				if (!item) {
					return;
				}

				current = item.data.data.quantity;
			} else {
				const a = this.object.obsidian.layout.actors[id];
				if (!a) {
					return;
				}

				current = a.quantity;
			}

			const isDelta = /^[+-]/.test(qty);
			qty = Number(qty);

			if (isDelta) {
				qty += current;
			}

			if (type === 'items') {
				this.object.items.get(id).update({'data.quantity': qty});
			} else {
				this._updateLayout([{id, isGroup: false, type, update: {quantity: qty}}]);
			}
		});

		html.find('.obsidian-layout-item-make-group').click(this._layoutItemMakeGroup.bind(this));
		html.find('.obsidian-layout-item-qty-add').click(evt => this._adjustLayoutItemQty(evt, 1));
		html.find('.obsidian-layout-item-qty-minus')
			.click(evt => this._adjustLayoutItemQty(evt, -1));
		html.find('.obsidian-layout-item-qty-split').click(async evt => {
			const target = evt.currentTarget.closest('[data-id]');
			const type = target.dataset.type;

			if (type === 'items') {
				return Sheet.splitItem(this, $(target));
			}

			const id = target.dataset.id;
			const actors = this.object.obsidian.layout.actors;
			const actor = actors[id];

			if (!actor) {
				return;
			}

			const doSplit = qty => {
				if (qty < 1) {
					return;
				}

				const raw = this.object.getFlag('obsidian', 'layout');
				const original = raw.actors.find(a => a.id === id);
				if (original.quantity - qty < 1) {
					return;
				}

				original.quantity -= qty;
				raw.actors.push({uuid: actor.uuid, quantity: qty, id: randomID(), parent: null});
				this.object.setFlag('obsidian', 'layout.actors', raw.actors);
			};

			if (actor.quantity < 3) {
				doSplit(1);
			} else {
				const dlg = await renderTemplate('modules/obsidian/html/dialogs/transfer.html', {
					max: actor.quantity - 1,
					name: actor.name
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
		});

		const initDrag = (evt, target) => {
			let {top, left} = target.style;
			[top, left] = [top, left].map(x => Number(x.replace('px', '')));
			this._initial = {x: evt.clientX, y: evt.clientY, top, left};
			document.addEventListener('mousemove', this._moveListener);
			document.addEventListener('mouseup', this._releaseListener);
		};

		html.find('.obsidian-layout-group header').mousedown(evt => {
			if (evt.button !== 0 || evt.target.closest('.obsidian-layout-delete-group')) {
				return;
			}

			clearTimeout(this._mouseDownTimeout);
			this._mouseDownTimeout = setTimeout(() => {
				if (this._editGroupName) {
					return;
				}

				this._dragging = evt.currentTarget.closest('[data-id]');
				initDrag(evt, this._dragging);
			}, 250);
		});

		html.find('.obsidian-layout-item').mousedown(evt => {
			if (evt.button !== 0) {
				return;
			}

			this._dragging = evt.currentTarget;
			initDrag(evt, this._dragging);
		});

		html.find('.obsidian-layout-resize-group').mousedown(evt => {
			if (evt.button !== 0) {
				return;
			}

			this._resizing = evt.currentTarget.closest('[data-id]');
			let {width, height} = this._resizing.style;
			[width, height] = [width, height].map(x => Number(x.replace('px', '')));
			this._initial = {x: evt.clientX, y: evt.clientY, width, height};
			document.addEventListener('mousemove', this._moveListener);
			document.addEventListener('mouseup', this._releaseListener);
		});
	}

	_adjustLayoutItemQty (evt, delta) {
		const target = evt.currentTarget.closest('[data-id]');
		const id = target.dataset.id;
		const type = target.dataset.type;

		if (type === 'items') {
			const item = this.object.items.get(id);
			if (!item) {
				return;
			}

			const qty = item.data.data.quantity + delta;
			if (qty < 0) {
				item.delete();
			} else {
				item.update({'data.quantity': qty});
			}
		} else {
			const a = this.object.obsidian.layout.actors[id];
			if (!a) {
				return;
			}

			const qty = a.quantity + delta;
			if (qty < 1) {
				const actors = this.object.getFlag('obsidian', 'layout.actors');
				if (!actors) {
					return;
				}

				actors.findSplice(a => a.id === id);
				this.object.setFlag('obsidian', 'layout.actors', actors);
			} else {
				this._updateLayout([{id, type, isGroup: false, update: {quantity: qty}}]);
			}
		}
	}

	async _layoutItemMakeGroup (evt) {
		const id = evt.currentTarget.closest('[data-id]').dataset.id;
		let item = this.object.items.get(id);

		if (!item) {
			return;
		}

		const qty = item.data.data.quantity;
		if (qty > 1) {
			await item.update({'data.quantity': qty - 1});
			const newItem = item.toObject();
			newItem.data.quantity = 1;
			[item] = await this.object.createEmbeddedDocuments('Item', [newItem]);
		}

		return this._onAddGroup(null, item.id);
	}

	async _updateLayout (updates) {
		let wasUpdated = false;
		let raw = this.object.getFlag('obsidian', 'layout');

		if (!raw) {
			raw = {groups: [], items: [], actors: []};
		}

		if (!raw?.groups) {
			raw.groups = [];
		}

		if (!raw?.items) {
			raw.items = [];
		}

		if (!raw?.actors) {
			raw.actors = [];
		}

		for (const {id, isGroup, type, update} of updates) {
			const prepared = this.object.obsidian.layout?.[isGroup ? 'groups' : type];
			if (!prepared) {
				return;
			}

			const entry = prepared[id];
			if (!entry) {
				return;
			}

			mergeObject(entry, update);
			const container = raw[isGroup ? 'groups' : type];
			const idx = container.findIndex(e => e.id === id);

			if (idx < 0) {
				container.push(entry);
				wasUpdated = true;
			} else {
				const original = container[idx];
				const diff = diffObject(original, update);

				if (isObjectEmpty(diff)) {
					continue;
				}

				container[idx] = duplicate(entry);
				wasUpdated = true;
			}
		}

		if (wasUpdated) {
			await this.object.setFlag('obsidian', 'layout', raw);
			this.render(true);
		}
	}
}
