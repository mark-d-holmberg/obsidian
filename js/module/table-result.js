import {OBSIDIAN} from '../global.js';

export default class ObsidianTableResult extends TableResult {
	async update (data, options = {}) {
		if (this.parent.hasParentComponent) {
			const results = duplicate(this.parent.results._source);
			const thisResult = results.find(r => r._id === this.id);
			const update = expandObject(OBSIDIAN.updateArrays(this.data._source, data));
			mergeObject(thisResult, update, {inplace: true});
			return this.parent.update({results});
		} else {
			return super.update(data, options);
		}
	}

	async delete (context = {}) {
		if (this.parent.hasParentComponent) {
			return this.parent.deleteEmbeddedDocuments('TableResult', [this.id]);
		} else {
			return super.delete(context);
		}
	}
};
