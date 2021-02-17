export function addTokenConfigHook () {
	Hooks.on('renderTokenConfig', onRender);
	Token.prototype._onUpdate = (function () {
		const cached = Token.prototype._onUpdate;
		return function () {
			this.drawBars();
			return cached.apply(this, arguments);
		};
	})();

	Token.prototype.getBarAttribute = (function () {
		const cached = Token.prototype.getBarAttribute;
		return function (bar) {
			const src = this.getFlag('obsidian', `${bar}.src`);
			const prop = this.getFlag('obsidian', `${bar}.res`);

			if (src === 'res' && prop) {
				return getResourceData(this.actor, prop);
			}

			return cached.apply(this, arguments);
		};
	})();
}

function onRender (config, html) {
	const resourceTab = html.find('[data-tab="resources"]');
	const groups = resourceTab.find('.form-group');
	const bar1Src = createSrc(config, 'bar1');
	const bar2Src = createSrc(config, 'bar2');
	const bar1Attr = resourceTab.find('[name="bar1.attribute"]');
	const bar2Attr = resourceTab.find('[name="bar2.attribute"]');
	const bar1Res = createResourceSelect(config, 'bar1');
	const bar2Res = createResourceSelect(config, 'bar2');

	const toggleSelect = evt => {
		const target = $(evt.currentTarget);
		const bar = target.data('bar');
		const attr = resourceTab.find(`[name="${bar}.attribute"]`);
		const res = resourceTab.find(`.obsidian-bar-res[data-bar="${bar}"]`);
		attr.removeClass('obsidian-hidden');
		res.removeClass('obsidian-hidden');

		if (target.val() === 'attr') {
			res.addClass('obsidian-hidden');
		} else {
			attr.addClass('obsidian-hidden');
		}
	};

	const fillData = bar => {
		const src = resourceTab.find(`.obsidian-bar-src[data-bar="${bar}"]`);
		const attr = resourceTab.find(`[name="${bar}.attribute"]`);
		const res = resourceTab.find(`.obsidian-bar-res[data-bar="${bar}"]`);
		const value = resourceTab.find(`.${bar}-value`);
		const max = resourceTab.find(`.${bar}-max`);

		if (src.val() === 'attr') {
			const prop = attr.val();
			const data = config.token.getBarAttribute(bar, {alternative: prop});

			if (data) {
				value.val(data.value);
				max.val(data.max);
			}
		} else {
			const prop = res.val();
			const data = getResourceData(config.actor, prop);

			if (data) {
				value.val(data.value);
				max.val(data.max);
			}
		}
	};

	bar1Src.insertBefore($(groups[1]));
	bar2Src.insertBefore($(groups[3]));
	bar1Res.insertAfter(bar1Attr);
	bar2Res.insertAfter(bar2Attr);
	bar1Src.find('.obsidian-bar-src').change(toggleSelect).change(() => fillData('bar1'));
	bar2Src.find('.obsidian-bar-src').change(toggleSelect).change(() => fillData('bar2'));
	bar1Res.change(() => fillData('bar1'));
	bar2Res.change(() => fillData('bar2'));

	toggleSelect({currentTarget: bar1Src.find('.obsidian-bar-src')[0]});
	toggleSelect({currentTarget: bar2Src.find('.obsidian-bar-src')[0]});
	fillData('bar1');
	fillData('bar2');
}

function createSrc (config, bar) {
	const src = config.token.getFlag('obsidian', `${bar}.src`) || 'attr';
	return $(`
		<div class="form-group">
			<label>${game.i18n.localize(`OBSIDIAN.BarSrc-${bar}`)}</label>
			<div class="form-fields">
				<select class="obsidian-bar-src" data-bar="${bar}" name="flags.obsidian.${bar}.src">
					<option value="attr" ${src === 'attr' ? 'selected' : ''}>
						${game.i18n.localize('OBSIDIAN.Attributes')}
					</option>
					<option value="res" ${src === 'res' ? 'selected' : ''}>
						${game.i18n.localize('OBSIDIAN.Resources')}
					</option>
				</select>
			</div>
		</div>
	`);
}

function createResourceSelect (config, bar) {
	const res = config.token.getFlag('obsidian', `${bar}.res`);
	const itemsWithResources =
		config.actor.items.entries.filter(i =>
			i.data.flags.obsidian.effects.some(e => e.components.some(c => c.type === 'resource')));

	itemsWithResources.sort((a, b) => a.name.localeCompare(b.name));
	const entries =
		itemsWithResources.flatMap(i =>
			i.data.flags.obsidian.effects.flatMap(e =>
				e.components.filter(c => c.type === 'resource')
					.map(c => {
						return {
							value: `${i.data._id}.${e.uuid}.${c.uuid}`,
							label: `[${i.name}] ${c.name}`
						};
					})));

	return $(`
		<select class="obsidian-bar-res" data-bar=${bar} name="flags.obsidian.${bar}.res">
			${entries.map(entry =>
				`<option value="${entry.value}" ${res === entry.value ? 'selected' : ''}>
					${entry.label}
				</option>`)}
		</select>
	`);
}

function getResourceData (actor, prop) {
	const [, , uuid] = prop.split('.');
	const component = actor.data.obsidian.components.get(uuid);

	if (component) {
		return {type: 'bar', value: component.remaining, max: component.max, attribute: prop};
	}

	return null;
}
