export const v7 = {
	convertActorDefenses: function (data) {
		const defenses = getProperty(data, 'flags.obsidian.defenses');
		if (defenses?.conditions?.length && typeof defenses.conditions[0] === 'string') {
			defenses.conditions = defenses.conditions.map(def => {
				return {level: 'imm', condition: def};
			});
		}
	},

	convertItemDefenses: function (data) {
		if (!data.flags.obsidian.effects?.length) {
			return;
		}

		data.flags.obsidian.effects
			.flatMap(effect => effect.components)
			.filter(c => c.type === 'defense')
			.forEach(def => def.condition = {level: 'imm', condition: def.condition});
	}
};
