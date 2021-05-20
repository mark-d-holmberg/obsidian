import {ObsidianDialog} from './dialog.js';
import {Rules} from '../rules/rules.js';

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
		data.langs = Rules.PROF_LANG;
		data.weapons = Rules.PROF_WEAPON;
		data.profs = {};

		['weaponProf', 'armorProf', 'languages'].forEach(prop => {
			const trait = this.parent.actor.data.data.traits[prop]?.value;
			data.profs[prop] = {};

			if (trait) {
				trait.forEach(prof => data.profs[prop][prof] = true);
			}
		});

		[['langs', 'Lang', 2], ['weapons', 'WeaponProf', 3]].forEach(([prop, pref, take]) => {
			data[prop] = data[prop].map(k => {
				return {
					key: k,
					label: game.i18n.localize(`OBSIDIAN.${pref}.${k}`)
				}
			});

			// Head values stay at the top for easy access.
			const head = data[prop].splice(0, take);
			data[prop].sort((a, b) => a.label === b.label ? 0 : a.label < b.label ? -1 : 1);
			data[prop].unshift(...head);
		});

		return data;
	}

	/**
	 * @private
	 */
	async _updateObject (event, formData) {
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

		return super._updateObject(event, formData);
	}
}
