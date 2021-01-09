export const v13 = {
	convertHD: function (data) {
		const formula = data.data.attributes.hp.formula;
		if (typeof formula !== 'string') {
			return;
		}

		const hd = formula.match(/(\d+)d(\d+)/);
		if (!hd || !hd.length || hd.length < 3) {
			return;
		}

		const die = Number(hd[1]);
		data.flags.obsidian.attributes.hd = {value: die, max: die};
	}
};
