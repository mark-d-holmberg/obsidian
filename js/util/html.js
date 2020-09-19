export function cssIconHexagon (label, positive) {
	return `
		<div class="obsidian-css-icon obsidian-css-icon-sm obsidian-css-icon-hexagon
		            obsidian-css-icon-${positive ? 'positive' : 'negative'}">
			<div class="obsidian-css-icon-shape"></div>
			<div class="obsidian-css-icon-label">${game.i18n.localize(label)}</div>
		</div>
	`;
}
