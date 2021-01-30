export default function ObsidianDie (faces) {
	let total = 0;
	const die = new Die({faces: faces});

	this.roll = n => {
		const results = [];
		for (let i = 0; i < n; i++) {
			const roll = die.roll();
			results.push(roll.result);
			total += roll.result;
		}

		return { results, faces, total };
	}
};

ObsidianDie.combine = function (...rolls) {
	if (!rolls.length) {
		return;
	}

	return {
		faces: rolls[0].faces,
		results: rolls.flatMap(r => r.results),
		total: rolls.reduce((acc, r) => acc + r.total, 0)
	};
};
