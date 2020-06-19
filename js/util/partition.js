export function Partitioner (categories) {
	const partitions = {};
	categories.forEach(category => partitions[category] = []);

	this.partition = (items, categoryFn) => {
		for (const item of items) {
			partitions[categoryFn(item)].push(item);
		}
	}

	this.get = (...categories) => {
		if (categories.length < 2) {
			return partitions[categories[0]];
		}

		let collection = [];
		for (const category of categories) {
			collection = collection.concat(partitions[category]);
		}

		return collection;
	}

	this.not = (...categories) =>
		this.get(...Object.keys(partitions).filter(p => !categories.includes(p)));
}
