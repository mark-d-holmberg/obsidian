export function cssIconHexagon ({advantage, label, positive, wrapped} = {}) {
	positive = positive || advantage;
	label = label || `OBSIDIAN.${advantage ? 'Advantage' : 'Disadvantage'}Abbr`;

	return `
		${wrapped ? '<div class="obsidian-css-icon-inline-hexagon">' : ''}
		<div class="obsidian-css-icon obsidian-css-icon-sm obsidian-css-icon-hexagon
		            obsidian-css-icon-${positive ? 'positive' : 'negative'}">
			<div class="obsidian-css-icon-shape"></div>
			<div class="obsidian-css-icon-label">${game.i18n.localize(label)}</div>
		</div>
		${wrapped ? '</div>' : ''}
	`;
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
