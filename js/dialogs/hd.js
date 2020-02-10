import {ObsidianDialog} from './dialog.js';
import {OBSIDIAN} from '../rules/rules.js';

export class ObsidianHDDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 250;
		options.title = game.i18n.localize('OBSIDIAN.OverrideHD');
		return options;
	}

	get template () {
		return 'modules/obsidian/html/dialogs/hd.html';
	}

	/**
	 * @param {JQuery} html
	 * @return undefined
	 */
	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-add-hd').click(this._onAddHD.bind(this));
		html.find('.obsidian-rm-hd').click(this._onRemoveHD.bind(this));
		ObsidianDialog.recalculateHeight(html);
	}

	getData () {
		const data = super.getData();
		data.hd = duplicate(this.parent.actor.data.flags.obsidian.attributes.hd);
		Object.values(data.hd).forEach(hd => {
			if (hd.max > 0) {
				hd.derived = true;
			}
		});

		return data;
	}

	/**
	 * @private
	 */
	async _onAddHD (evt) {
		evt.preventDefault();
		const hd = duplicate(this.parent.actor.data.flags.obsidian.attributes.hd);
		const existingHD = Object.keys(hd);
		const availableHD =
			OBSIDIAN.Rules.HD.filter(die => {
				return !existingHD.includes(die)
					|| (hd[die].max < 1 && OBSIDIAN.notDefinedOrEmpty(hd[die].override));
			});

		if (availableHD.length > 0) {
			const newHD = availableHD[0];
			hd[newHD] = {
				max: 0,
				value: 0,
				override: '1'
			};

			await this.parent.actor.update({'flags.obsidian.attributes.hd': hd});
			this.render(false);
		}
	}

	/**
	 * @private
	 */
	async _onRemoveHD (evt) {
		evt.preventDefault();
		const hd = duplicate(this.parent.actor.data.flags.obsidian.attributes.hd);
		const row = $(evt.currentTarget).closest('.obsidian-form-row');
		const hdVal = row.find('select').val();
		const removedHD = hd[hdVal];

		if (removedHD !== undefined) {
			removedHD.override = '';
			await this.parent.actor.update({'flags.obsidian.attributes.hd': hd});
			this.render(false);
		}
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		const overrides = {};
		this.element.find('select').each((i, el) => {
			const jqel = $(el);
			const hd = jqel.val();
			const override = jqel.next().val();

			if (overrides[hd] === undefined) {
				overrides[hd] = override;
			} else {
				overrides[hd] = Number(overrides[hd]) + Number(override);
			}
		});

		const hd = duplicate(this.parent.actor.data.flags.obsidian.attributes.hd);
		for (const [key, val] of Object.entries(overrides)) {
			if (hd[key] === undefined) {
				hd[key] = {
					max: 0,
					value: 0,
					override: val
				};
			} else {
				hd[key].override = val;
			}
		}

		for (const key of Object.keys(hd)) {
			if (!overrides[key]) {
				hd[key].override = '';
			}
		}

		super._updateObject(event, {'flags.obsidian.attributes.hd': hd});
	}
}
