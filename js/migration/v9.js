export const v9 = {
	convertTools: function (data) {
		if (data.flags.obsidian.skills.tools.length) {
			data.flags.obsidian.tools.custom = duplicate(data.flags.obsidian.skills.tools);
		}
	}
};
