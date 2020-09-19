export const v10 = {
	convertAmmo: function (data) {
		if (data.flags?.obsidian?.ammo?.id) {
			data.flags.obsidian.ammo = data.flags.obsidian.ammo.id;
		}
	}
};
