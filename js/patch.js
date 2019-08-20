createEditor = (function () {
	const cached = createEditor;
	return function () {
		const name = $(arguments[0].target).parents('form').data('obsidian-name');
		if (name) {
			arguments[0].content_css = 'css/mce.css,modules/obsidian/css/obsidian-mce.css';
		}

		const capture = cached.apply(this, arguments);
		if (name) {
			Hooks.callAll(`MCEInit-${name}`, capture);
		}

		return capture;
	};
})();
