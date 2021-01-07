export function addLootSheetHook () {
	if (!game.modules.get('lootsheetnpc5e')?.active) {
		return;
	}

	Hooks.on('renderLootSheet5eNPC', onLootSheetRender);
}

function onLootSheetRender (sheet, html) {
	let form = html.find('form');
	if (!form.length) {
		form = html;
	}

	// Disable activating the price modifier button on enter.
	$(form.children()[0]).before($('<input type="submit" style="display: none;" disabled>'));

	html.find('.item-quantity').click(evt => activateNumberEdit(evt, sheet, 'quantity'));
	html.find('.item-weight').click(evt => activateNumberEdit(evt, sheet, 'weight'));
	html.find('.item-price').click(evt => activateNumberEdit(evt, sheet, 'price'));
}

function activateNumberEdit (evt, sheet, prop) {
	if (evt.currentTarget._obs_active) {
		return;
	}

	evt.currentTarget._obs_active = true;
	const target = $(evt.currentTarget);
	const id = target.closest('[data-item-id]').data('item-id');
	const item = sheet.actor.items.get(id);
	const value = item.data.data[prop];
	const input = $(`<input type="text" value="${value}">`);
	const done = () => {
		if (!input.val().length) {
			sheet.render(true);
			return;
		}

		const newValue = Number(input.val());
		if (newValue === value || isNaN(newValue) || newValue == null) {
			sheet.render(true);
			return;
		}

		item.update({[`data.${prop}`]: newValue});
	};

	target.empty().append(input);
	input.focus().select().change(done).blur(done);
}
