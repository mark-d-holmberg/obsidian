export const v9 = {
	convertTools: function (data) {
		if (data.flags.obsidian.skills.tools?.length) {
			data.flags.obsidian.tools.custom = duplicate(data.flags.obsidian.skills.tools);
		}
	},

	convertToolFilters: function (data) {
		if (!data.flags.obsidian.effects.length) {
			return;
		}

		data.flags.obsidian.effects.flatMap(e => e.components)
			.filter(c =>
				c.type === 'filter' && c.filter === 'roll' && c.roll === 'check'
				&& c.check === 'tool' && c.collection.length)
			.flatMap(filter => filter.collection)
			.forEach(item => {
				if (item.key.startsWith('tools')) {
					item.key = 'custom' + item.key.substr(5);
				}
			});
	}
};
