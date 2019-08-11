class ObsidianAttackDialog extends ObsidianDialog {
	constructor (parent, attackID) {
		super(parent, {
			title: game.i18n.localize('OBSIDIAN.EditAttack'),
			template: 'public/modules/obsidian/html/dialogs/attack.html'
		});

		this.attackID = attackID;
	}

	getData () {
		const data = super.getData();
		data.attackID = this.attackID;
		data.attack = this.parent.actor.data.flags.obsidian.attacks.custom[this.attackID];
		return data;
	}
}
