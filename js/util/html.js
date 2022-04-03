export function svgIcon ({positive, negative, label, title = '', size, icon} = {}) {
	const classes = [icon];
	if (size) {
		classes.push(`obsidian-svg-icon-${size}`);
	}

	if (positive || negative) {
		classes.push(`obsidian-svg-icon-${positive ? 'positive' : 'negative'}`);
	}

	return `
		<div class="obsidian-svg-icon ${classes.join(' ')}" title="${game.i18n.localize(title)}">
			${label ? `${game.i18n.localize(label)}` : ''}
		</div>
	`;
}

export function iconD20 ({advantage, positive, label, title, size} = {}) {
	positive = positive ?? advantage;
	title =  title ?? `OBSIDIAN.${advantage ? 'Advantage' : 'Disadvantage'}`;
	label = label ?? `OBSIDIAN.${advantage ? 'Advantage' : 'Disadvantage'}Abbr`;
	const icon = `obsidian-icon-d20-${advantage ? 'adv' : 'dis'}`;
	return svgIcon({positive, negative: !positive, label, title, size, icon});
}

export function cssIconCircle ({size, title, label} = {}) {
	return `
		<div ${title ? `title="${game.i18n.localize(title)}"` : ''}
		     class="obsidian-css-icon obsidian-css-icon-regular obsidian-css-icon-circle
		           ${size ? `obsidian-css-icon-${size}` : ''}">
			${game.i18n.localize(label)}
		</div>
	`;
}

export function defensePill ({
	body, size,
	headers = [],
	footers = [],
	classes = [],
	data = {}} = {})
{
	const pill = [];
	const sizeCls = size ? ` obsidian-item-drop-pill-${size}` : '';
	const dataset = Object.entries(data).map(([k, v]) => `data-${k}="${v}"`).join(' ');
	pill.push(`<div class="obsidian-item-drop-pill${sizeCls} ${classes.join(' ')}"${dataset}>`);

	const endPiece = (type, config) => {
		const label = game.i18n.localize(config.label);
		const num = config.type === 'number' ? ` obsidian-item-drop-pill-${type}-num` : '';
		type = `obsidian-item-drop-pill-${type}`;
		pill.push(`<div class="${type}${num}">`);

		if (config.type === 'd20') {
			pill.push(iconD20({advantage: config.level === 'adv', size}));
		} else if (config.type === 'circle') {
			pill.push(cssIconCircle({size, title: config.label, label: config.abbr}));
		} else if (config.type === 'def') {
			const title = game.i18n.localize(`OBSIDIAN.DefenseLevel.${config.level}`);
			pill.push(`
				<div title="${title}" class="obsidian-icon obsidian-icon-def-${config.level}"></div>
			`);
		} else if (config.type === 'icon') {
			pill.push(`
				<div title="${label}" class="obsidian-icon obsidian-icon-${config.value}"></div>
			`);
		} else if (config.type === 'img') {
			pill.push(`<img alt="${label}" title="${label}" src="${config.value}">`);
		} else if (config.type === 'number') {
			pill.push(`<strong>${config.value}</strong>`);
		} else if (config.type === 'svg') {
			pill.push(svgIcon({title: config.label, icon: config.value, size}));
		}

		pill.push('</div>');
	};

	headers.forEach(config => endPiece('header', config));

	if (body) {
		pill.push(`<div class="obsidian-item-drop-pill-body">${game.i18n.localize(body)}</div>`);
	}

	footers.forEach(config => endPiece('footer', config));
	pill.push('</div>');
	return pill.join('');
}

export function conditionPill ({condition, size = 'sm', active = false}) {
	active = !!active;
	const label = `OBSIDIAN.Condition.${condition}`;
	return defensePill({
		size, body: label, data: {value: condition},
		headers: [{label, type: 'svg', value: `obsidian-icon-condition-${condition}`}],
		classes: [
			`obsidian-condition-pill-${active ? '' : 'in'}active`, `obsidian-condition-${condition}`
		]
	});
}

export function fancyCheckbox (...args) {
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
		<div class="checkbox-content">
			${options.hash.label ? options.hash.label : game.i18n.localize(options.hash.content)}
		</div>
	</div>
	<input type="checkbox" name="${prop}" class="obsidian-hidden"
	       ${options.hash.checked ? 'checked' : ''}
	       ${options.hash.selector ? `data-selector="${options.hash.selector}"` : ''}>
	`;
}
