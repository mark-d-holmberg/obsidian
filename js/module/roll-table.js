import {OBSIDIAN} from '../global.js';

export default class ObsidianTable extends RollTable {
	constructor (data = {}, context = {}) {
		super(data, context);
		this.options = context;
	}

	get hasParentComponent () {
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
		this.data.update(table, {recursive: false});
		this.sheet.render(false);
		return this.options.parentItem.setFlag('obsidian', 'effects', effects);
	}

	getEmbeddedDocument (embeddedName, id, {strict = false} = {}) {
		if (this.hasParentComponent) {
			const [, table] = this._getEmbeddedTable();
			const result = table.results.find(result => result._id === id);
			return new CONFIG[embeddedName].documentClass(result, {parent: this});
		} else {
			return super.getEmbeddedDocument(embeddedName, id, {strict});
		}
	}

	async createEmbeddedDocuments (embeddedName, data, options = {}) {
		if (this.hasParentComponent) {
			options.temporary = true;
			const newResults = await super.createEmbeddedDocuments(embeddedName, data, options);
			const [, table] = this._getEmbeddedTable();
			table.results.push(...newResults.map(r => r.toObject()));
			return this._updateEmbeddedResults(table.results);
		} else {
			return super.createEmbeddedDocuments(embeddedName, data, options);
		}
	}

	async updateEmbeddedDocuments (embeddedName, data, options = {}) {
		if (this.hasParentComponent) {
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
			return super.updateEmbeddedDocuments(embeddedName, data, options);
		}
	}

	async deleteEmbeddedDocuments (embeddedName, data, options = {}) {
		if (this.hasParentComponent) {
			const [, table] = this._getEmbeddedTable();
			table.results = table.results.filter(result => !data.includes(result._id));
			return this._updateEmbeddedResults(table.results);
		} else {
			return super.deleteEmbeddedDocuments(embeddedName, data, options);
		}
	}

	async update (data, options = {}) {
		if (this.hasParentComponent) {
			const parentItem = this.options.parentItem;
			const parentComponent = this.getFlag('obsidian', 'parentComponent');
			const newData =
				mergeObject(
					this.data._source,
					expandObject(OBSIDIAN.updateArrays(this.data._source, data)),
					{inplace: false});

			const effects = duplicate(parentItem.getFlag('obsidian', 'effects'));
			const component =
				effects.flatMap(e => e.components).find(c => c.uuid === parentComponent);

			const idx = component.tables.findIndex(table => table._id === this.id);
			component.tables[idx] = newData;

			await parentItem.setFlag('obsidian', 'effects', effects);
			this.data.update(newData, {recursive: false});

			// We have to bypass the normal render and instead return the async
			// _render for the case where _onSubmit is called before deleting
			// a TableResult. The _onSubmit is awaited, but since we don't
			// return a Promise with render, the TableResult is deleted while
			// the sheet hasn't re-rendered from the initial _onSubmit event,
			// causing the re-render after TableResult deletion to exit early.
			return this.sheet._render(false);
		} else {
			return super.update(data, options);
		}
	}
}
