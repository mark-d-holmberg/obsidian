export function Queue () {
	const queue = [];

	this.runLater = (...promises) => {
		queue.push(...promises);
	};

	this.flush = async () => {
		await Promise.all(queue);
		queue.splice(0, queue.length);
	}

	this.pending = () => queue.length;
}
