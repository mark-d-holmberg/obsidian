export const v3 = {
	convertHD: function (data) {
		if (data.flags.obsidian.hd) {
			data.data.hitDice = `d${data.flags.obsidian.hd}`;
		}
	}
};
