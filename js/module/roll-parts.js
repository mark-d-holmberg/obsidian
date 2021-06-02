import ObsidianDie from '../module/die.js';

export const RollParts = {
	applyRollModifiers: function (parts, mod) {
		return parts.map(part => {
			if (!part.roll) {
				return part;
			}

			if (mod.max) {
				part.results.forEach(r => r.push(part.roll.faces));
				return part;
			}

			if (mod.reroll > 1) {
				const die = new Die({faces: part.roll.faces});
				part.results.forEach(r => {
					if (r.last() < mod.reroll) {
						r.push(die.roll().result);
					}
				});
			}

			if (mod.min > 1) {
				part.results.forEach(r => {
					if (r.last() < mod.min) {
						r.push(mod.min);
					}
				});
			}

			return part;
		});
	},

	calculateTotal: function (parts) {
		return Math.floor(parts.reduce((acc, part) => {
			if (!part.roll) {
				return acc + (part.mod || 0);
			}

			const mult = part.ndice && part.ndice < 0 ? -1 : 1;
			const subTotal = part.results.reduce((acc, r) => acc + r.last() * mult, 0);
			return acc + subTotal + (part.mod || 0);
		}, 0));
	},

	compileBreakdown: function (parts) {
		let isFirst = true;
		let totalConstants = 0;
		let onlyConstants = true;

		const breakdown = parts.reduce((acc, part) => {
			let expr = '';
			const modOnly = !part.roll;
			const name = part.name?.length ? ` [${part.name}]` : '';

			if (modOnly && part.mod) {
				expr = `${isFirst ? part.mod : part.mod.sgnex()}${name}`;
			} else if (!modOnly) {
				expr =
					`${(isFirst ? part.ndice : part.ndice.sgnex())}d${part.die}`
					+ (part.mod ? part.mod.sgnex() : '')
					+ name;

				const sgn = isFirst ? part.ndice < 0 ? '-' : '' : ` ${part.ndice < 0 ? '-' : '+'} `;
				const rolls =
					part.results.map(r =>
						RollParts.compileRerolls(r, part.crit ? part.crit : part.die))
						.join('+');

				acc.rhs += `${sgn}(${rolls})`;
				onlyConstants = false;
			}

			acc.lhs += expr;
			isFirst = false;
			totalConstants += (part.mod || 0);
			return acc;
		}, {lhs: '', rhs: ''});

		return breakdown.lhs
			+ (onlyConstants ? '' : ` = ${breakdown.rhs}${totalConstants.sgnex()}`);
	},

	compileData3D: function (parts) {
		const data3d = parts.reduce((acc, part) => {
			if (!part.roll) {
				return acc;
			}

			acc.formula.push(`${Math.abs(part.ndice)}d${part.die}`);
			acc.results.push(...part.results.map(r => r.last()));
			return acc;
		}, {formula: [], results: []});

		data3d.formula = data3d.formula.join('+');
		return data3d;
	},

	compileRerolls: function (rolls, max, min = 1) {
		const annotated = [];
		for (let i = 0; i < rolls.length; i++) {
			const roll = rolls[i];
			let cls;

			if (i === rolls.length - 1) {
				if (roll >= max) {
					cls = 'positive';
				} else if (roll <= min) {
					cls = 'negative';
				}
			} else {
				cls = 'grey';
			}

			if (cls) {
				annotated.push(`<span class="obsidian-${cls}">${roll}</span>`);
			} else {
				annotated.push(roll.toString());
			}
		}

		if (rolls.length > 1) {
			return `[${annotated.join(',')}]`;
		}

		return annotated[0];
	},

	rollParts: function (parts) {
		return parts.map(part => {
			if (part.ndice && !part.roll) {
				part.roll = new ObsidianDie(part.die).roll(Math.abs(part.ndice));
				part.results = part.roll.results.map(r => [r]);
			}

			return part;
		});
	}
};
