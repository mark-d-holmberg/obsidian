import {OBSIDIAN} from '../global.js';

export function addTransformHook () {
	Hooks.on('dnd5e.transformActor', transform);
}

function transform (original, target, data) {
	if (data.flags.dnd5e.transformOptions.mergeSkills) {
		let originalSkills = original.data.data.skills;
		if (original.data.obsidian?.skills) {
			originalSkills = original.data.data.skills;
		}

		for (const [id, skill] of Object.entries(originalSkills)) {
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

	const hdFormula = target.data.data.attributes.hp.formula;
	if (!OBSIDIAN.notDefinedOrEmpty(hdFormula) && hdFormula.includes('d')) {
		const [, n, d] = hdFormula.match(/(\d+)d(\d+)/);
		const hd = data.flags.obsidian.attributes.hd;
		data.items.filter(i => i.type === 'class')
			.concat({data: {hitDice: `d${d}`}})
			.forEach(cls => {
				let existing = hd[cls.data.hitDice || 'd6'];
				if (!existing) {
					existing = {value: 0, max: 0};
					hd[cls.data.hitDice || 'd6'] = existing;
				}

				existing.override = 0;
				if (`d${d}` === cls.data.hitDice) {
					existing.override = Number(n);
					existing.value = Number(n);
				}
			});
	}
}
