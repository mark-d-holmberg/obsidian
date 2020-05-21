export function addTransformHook () {
	Hooks.on('transformActor', transform);
}

function transform (original, target, data) {
	if (data.flags.dnd5e.transformOptions.mergeSkills) {
		for (const [id, skill] of Object.entries(original.data.data.skills)) {
			data.flags.obsidian.skills[id].value =
				Math.max(skill.value, target.data.data.skills[id].value);
		}
	}

	if (data.flags.dnd5e.transformOptions.mergeSaves) {
		for (const [id, abl] of Object.entries(data.data.abilities)) {
			const oa = original.data.data.abilities[id];
			const ta = target.data.data.abilities[id];
			abl.proficient = Math.max(oa.proficient, ta.proficient);

			const newSave = ta.prof + oa.mod + original.data.flags.obsidian.saves[id].bonus;
			if (ta.save > newSave) {
				data.flags.obsidian.saves[id].bonus += ta.save - newSave;
			}
		}
	}
}
