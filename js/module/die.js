export default function ObsidianDie (faces) {
	let total = 0;
	const die = new Die({faces: faces, number: 1});

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
