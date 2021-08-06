import {ObsidianStandaloneDialog} from './standalone.js';
import ObsidianActorPlacement from '../module/actor-placement.js';

const DEC_TO_FRAC = {
	'0.125': '1/8',
	'0.25': '1/4',
	'0.5': '1/2'
};

const FRAC_TO_DEC = {
	'1/8': 0.125,
	'1/4': 0.25,
	'1/2': 0.5
};

export default class ObsidianActorSelectorDialog extends ObsidianStandaloneDialog {
	constructor (actor, actors, options) {
		super({parent: options.parent, actor: actor});
		this._actor = actor;
		this._options = options;
		this._actors = actors;
	}

	static get defaultOptions () {
		const options = super.defaultOptions;
		options.classes = options.classes.concat(['obsidian-actor-select-window']);
		options.template = 'modules/obsidian/html/dialogs/actor-selector.html';
		options.title = game.i18n.localize('OBSIDIAN.SelectActor');
		options.width = 400;
		return options;
	}

	activateListeners (html) {
		super.activateListeners(html);
		html.find('.obsidian-col-name.rollable').click(this._initActorPlacement.bind(this));
		html.find('.obsidian-sub-tab').click(this._onClickCR.bind(this));
		html.find('.obsidian-input-search').keydown(this._onNameSearch.bind(this));
		html.find('.obsidian-clear-search').click(() => {
			html.find('.obsidian-input-search').val('');
			this._filterActors();
		});
	}

	async getData (options) {
		const data = super.getData();
		const actors = [];
		const resolving = [];

		this._actors.forEach(uuid => {
			const parts = uuid.split('.');
			if (parts[0] === 'Compendium' && parts.length < 4) {
				parts.shift();
				const pack = game.packs.get(parts.join('.'));

				if (!pack) {
					return;
				}

				resolving.push(pack.getContent().then(content => actors.push(...content)));
				return;
			}

			resolving.push(fromUuid(uuid).then(actor => {
				if (actor) {
					actors.push(actor);
				}
			}));
		});

		await Promise.all(resolving);
		data.actors = actors.map(actor => {
			let cr = actor.data.data.details.cr;
			if (actor.data.flags.obsidian?.details.type === 'object') {
				cr = 0;
			}

			let type = actor.data.flags.obsidian?.details.type;
			if (!type) {
				type = actor.data.data.details.type.value;
			}

			const fraction = DEC_TO_FRAC[cr];
			return {
				img: actor.img,
				name: actor.name,
				cr: fraction ? fraction : cr,
				type: type.capitalize(),
				uuid: actor.uuid
			};
		}).sort((a, b) => {
			const crDiff = crSort(a.cr, b.cr);
			if (crDiff === 0) {
				return a.name - b.name;
			}

			return crDiff;
		});

		const crs = new Set();
		data.actors.forEach(actor => {
			const fraction = DEC_TO_FRAC[actor.cr];
			crs.add(fraction ? fraction : actor.cr.toString());
		});

		data.crs = Array.from(crs.values()).sort(crSort);
		return data;
	}

	_filterActors () {
		const crs =
			new Set(
				Array.from(this.element.find('.obsidian-actor-cr-tab.obsidian-active'))
					.map(tab => tab.dataset.value));

		const name = this.element.find('.obsidian-input-search').val();
		const rows = this.element.find('.obsidian-tr');
		rows.removeClass('obsidian-hidden');
		rows.each((i, el) => {
			const matchesCR = crs.size < 1 || crs.has(el.dataset.cr);
			const matchesName = name.length < 1 || el.dataset.name.toLowerCase().includes(name);

			if (!matchesCR || !matchesName) {
				el.classList.add('obsidian-hidden');
			}
		});
	}

	_initActorPlacement (evt) {
		const target = evt.currentTarget;
		const uuid = target.closest('.obsidian-tr').dataset.uuid;
		const amount = Number(this.element.find('input[name="amount"]').val()) || 1;

		ObsidianActorPlacement.fromUUID(uuid).then(placement => {
			if (placement) {
				placement.place(amount, this._options);
			}
		});

		this.close();
	}

	_onClickCR (evt) {
		const target = evt.currentTarget;
		const isActive = target.classList.contains('obsidian-active');

		if (isActive) {
			target.classList.remove('obsidian-active');
		} else {
			target.classList.add('obsidian-active');
		}

		this._filterActors();
	}

	_onNameSearch () {
		clearTimeout(this._nameSearchTimeout);
		this._nameSearchTimeout = setTimeout(() => this._filterActors(), 200);
	}
}

function crSort (a, b) {
	let aNum = Number(a);
	let bNum = Number(b);

	if (isNaN(aNum)) {
		aNum = FRAC_TO_DEC[a];
	}

	if (isNaN(bNum)) {
		bNum = FRAC_TO_DEC[b];
	}

	return aNum - bNum;
}
