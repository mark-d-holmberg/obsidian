createEditor = (function () {
	const cached = createEditor;
	return function () {
		const capture = cached.apply(this, arguments);
		const name = $(arguments[0].target).parents('form').data('name');
		if (name) {
			Hooks.callAll(`MCEInit-${name}`, capture);
		}

		return capture;
	};
})();
