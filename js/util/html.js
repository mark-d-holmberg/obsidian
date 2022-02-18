export function iconD20 ({advantage, positive, label, title, size=16} = {}) {
	positive = positive ?? advantage;
	title =  title ?? `OBSIDIAN.${advantage ? 'Advantage' : 'Disadvantage'}`;
	label = label ?? `OBSIDIAN.${advantage ? 'Advantage' : 'Disadvantage'}Abbr`;
	const onload = `
		const style = getComputedStyle(document.documentElement);
		const positive = style.getPropertyValue('--obs-positive').trim();
		const negative = style.getPropertyValue('--obs-negative').trim();
		const isPositive = this.dataset.positive === 'true';
		const g = this.contentDocument.getElementsByTagName('g')[0];
		g.setAttribute('fill', isPositive ? positive : negative);
	`;

	return `
		<div class="obsidian-svg-icon obsidian-svg-icon-${positive ? 'positive' : 'negative'}"
		     title="${game.i18n.localize(title)}">
			<object type="image/svg+xml" data="modules/obsidian/img/d20.svg" height="${size}"
			        width="${size}" data-positive="${positive}" onload="${onload}"></object>
	        <label>${game.i18n.localize(label)}</label>
		</div>
	`;
}

export function cssIconCircle ({size, title, label} = {}) {
	return `
		<div ${title ? `title="${game.i18n.localize(title)}"` : ''}
		     class="obsidian-icon obsidian-css-icon-regular obsidian-css-icon-circle
		           ${size ? `obsidian-css-icon-${size}` : ''}">
			<div class="obsidian-css-icon-shape"></div>
			<div class="obsidian-css-icon-label">${game.i18n.localize(label)}</div>
		</div>
	`;
}

export function defensePill ({headers = [], body, footers = [], size} = {}) {
	const pill = [];
	const sizeCls = size ? ` obsidian-item-drop-pill-${size}` : '';
	pill.push(`<div class="obsidian-item-drop-pill${sizeCls}">`);

	const endPiece = (type, config) => {
		const label = game.i18n.localize(config.label);
		const num = config.type === 'number' ? ` obsidian-item-drop-pill-${type}-num` : '';
		type = `obsidian-item-drop-pill-${type}`;
		pill.push(`<div class="${type}${num}">`);

		if (config.type === 'd20') {
			pill.push(iconD20({advantage: config.level === 'adv', size: size === 'sm' ? 14 : 16}));
		} else if (config.type === 'circle') {
			pill.push(cssIconCircle({size, title: config.label, label: config.abbr}));
		} else if (config.type === 'def') {
			pill.push(`
				<div title="${label}" class="obsidian-icon obsidian-icon-def-${config.level}"></div>
			`);
		} else if (config.type === 'icon') {
			pill.push(`
				<div title="${label}" class="obsidian-icon obsidian-icon-${config.value}"></div>
			`);
		} else if (config.type === 'img') {
			pill.push(`<img alt="${label}" title="${label}" src="${config.value}">`);
		} else if (config.type === 'number') {
			pill.push(`<strong>${config.value}</strong>`);
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

export function cssIconDiamond ({label, positive, wrapped, level, title}) {
	switch (level) {
		case 'vuln':
			label = 'OBSIDIAN.VulnerabilityAbbr';
			title = 'OBSIDIAN.DefenseLevel.vuln';
			positive = false;
			break;

		case 'res':
			label = 'OBSIDIAN.ResistanceAbbr';
			title = 'OBSIDIAN.DefenseLevel.res';
			positive = true;
			break;

		case 'imm':
			label = 'OBSIDIAN.ImmunityAbbr';
			title = 'OBSIDIAN.DefenseLevel.imm';
			positive = true;
			break;
	}

	return `
		${wrapped ? '<div class="obsidian-css-icon-inline-diamond">' : ''}
		<div class="obsidian-css-icon obsidian-css-icon-sm obsidian-css-icon-diamond
		            obsidian-css-icon-${positive ? 'positive' : 'negative'}"
		     title="${game.i18n.localize(title)}">
			<div class="obsidian-css-icon-shape"></div>
			<div class="obsidian-css-icon-label">${game.i18n.localize(label)}</div>
		</div>
		${wrapped ? '</div>' : ''}
	`;
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
