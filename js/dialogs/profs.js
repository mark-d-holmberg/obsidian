import {ObsidianDialog} from './dialog.js';

export class ObsidianProficienciesDialog extends ObsidianDialog {
	static get defaultOptions () {
		const options = super.defaultOptions;
		options.width = 650;
		options.title = game.i18n.localize('OBSIDIAN.EditProficiencies');
		options.template = 'modules/obsidian/html/dialogs/profs.html';
		return options;
	}

	getData () {
		const data = super.getData();
		data.profs = {};

		['weaponProf', 'armorProf', 'languages'].forEach(prop => {
			const trait = this.parent.actor.data.data.traits[prop]?.value;
			data.profs[prop] = {};

			if (trait) {
				trait.forEach(prof => data.profs[prop][prof] = true);
			}
		});

		return data;
	}

	/**
	 * @private
	 */
	_updateObject (event, formData) {
		formData = {};
		['weaponProf', 'armorProf', 'languages'].forEach(prop =>
			formData[`data.traits.${prop}.value`] = []);

		this.element.find('input').each((i, el) => {
			if (el.type === 'checkbox' && el.checked) {
				const [prop, key] = el.name.split('.');
				formData[`data.traits.${prop}.value`].push(key);
			} else if (el.type === 'text') {
				const custom = el.value.split(/[,;] ?/);
				formData[el.name] = el.value;
				formData[`flags.obsidian.traits.profs.custom.${el.dataset.flag}`] = [];

				if (custom.length > 1 || custom[0].length) {
					formData[`flags.obsidian.traits.profs.custom.${el.dataset.flag}`] = custom;
				}
			}
		});

		super._updateObject(event, formData);
	}
}
