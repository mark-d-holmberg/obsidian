import {OBSIDIAN} from '../global.js';

export default class ObsidianTable extends RollTable {
	get isEmbedded () {
		return this.getFlag('obsidian', 'isEmbedded')
			&& this.getFlag('obsidian', 'parentComponent')
			&& this.options.parentItem;
	}

	_getEmbeddedTable () {
		const parentItem = this.options.parentItem;
		const parentComponent = this.getFlag('obsidian', 'parentComponent');
		const effects = duplicate(parentItem.getFlag('obsidian', 'effects'));
		const component = effects.flatMap(e => e.components).find(c => c.uuid === parentComponent);
		const table = component.tables.find(table => table._id === this.id);
		return [effects, table];
	}

	_updateEmbeddedResults (results) {
		const [effects, table] = this._getEmbeddedTable();
		table.results = results;
		this.data.results = results;
		this.sheet.render(false);
		return this.options.parentItem.setFlag('obsidian', 'effects', effects);
	}

	getEmbeddedEntity (embeddedName, id, {strict = false} = {}) {
		if (this.isEmbedded) {
			const [, table] = this._getEmbeddedTable();
			return table.results.find(result => result._id === id);
		} else {
			return super.getEmbeddedEntity(embeddedName, id, {strict});
		}
	}

	async createEmbeddedEntity (embeddedName, data, options = {}) {
		if (this.isEmbedded) {
			options.temporary = true;
			const newResults = await super.createEmbeddedEntity(embeddedName, data, options);
			const [, table] = this._getEmbeddedTable();

			if (Array.isArray(newResults)) {
				table.results.push(...newResults);
			} else {
				table.results.push(newResults);
			}

			return this._updateEmbeddedResults(table.results);
		} else {
			return super.createEmbeddedEntity(embeddedName, data, options);
		}
	}

	async updateEmbeddedEntity (embeddedName, data, options = {}) {
		if (this.isEmbedded) {
			data = Array.isArray(data) ? data : [data];
			const dataByID = new Map(data.map(datum => [datum._id, datum]));
			const [, table] = this._getEmbeddedTable();
			for (const result of table.results) {
				const update = dataByID.get(result._id);
				if (update) {
					mergeObject(result, update, {inplace: true});
				}
			}

			return this._updateEmbeddedResults(table.results);
		} else {
			return super.updateEmbeddedEntity(embeddedName, data, options);
		}
	}

	async deleteEmbeddedEntity (embeddedName, data, options = {}) {
		if (this.isEmbedded) {
			const [, table] = this._getEmbeddedTable();
			data = Array.isArray(data) ? data : [data];
			table.results = table.results.filter(result => !data.includes(result._id));
			return this._updateEmbeddedResults(table.results);
		} else {
			return super.deleteEmbeddedEntity(embeddedName, data, options);
		}
	}

	async update (data, options = {}) {
		if (this.isEmbedded) {
			const parentItem = this.options.parentItem;
			const parentComponent = this.getFlag('obsidian', 'parentComponent');
			const newData =
				mergeObject(
					this.data,
					expandObject(OBSIDIAN.updateArrays(this.data, data)),
					{inplace: false});

			const effects = duplicate(parentItem.getFlag('obsidian', 'effects'));
			const component =
				effects.flatMap(e => e.components).find(c => c.uuid === parentComponent);

			const idx = component.tables.findIndex(table => table._id === this.id);
			component.tables[idx] = newData;

			await parentItem.setFlag('obsidian', 'effects', effects);
			this.data = newData;
			this.sheet.render(false);
		} else {
			return super.update(data, options);
		}
	}
}
