class UiScene extends PhaserScene {
	tooltip: DevTooltip;
	abilityBar: AbilityBar;
	constructor() {
		super({ key: 'Ui', active: true });
	}

	init (): void {
		return;
	}

	create (): void {
		if (!taro.isMobile) {
			//this.tooltip = new DevTooltip(this);
		}
		const abilityBar = this.abilityBar = new AbilityBar(this);

		taro.client.on('create-ability-bar', (data: {keybindings: Record<string, ControlAbility>, abilities: Record<string, UnitAbility>}) => {
			const keybindings = data.keybindings;
			const abilities = data.abilities;
			abilityBar.clear();
			if (abilities) {
				Object.entries(abilities).forEach(([abilityId, ability]) => {
					let key;
					if (keybindings && (taro.isMobile && ability.visibility !== 'desktop' && ability.visibility !== 'none') ||
					(!taro.isMobile && ability.visibility !== 'mobile' && ability.visibility !== 'none')) {
						Object.entries(keybindings).forEach(([keybindingKey, keybinding]) => {
							if (keybinding.keyDown?.abilityId === abilityId || keybinding.keyUp?.abilityId === abilityId) {
								key = keybindingKey;
							}
						});
						abilityBar.addButton(abilityId, ability, key);
					}
				});
			}
		});

		taro.client.on('enterMapTab', () => {
			this.scene.setVisible(false);
		});

		taro.client.on('leaveMapTab', () => {
			this.scene.setVisible(true);
		});

		taro.client.on('start-press-key', (abilityId: string) => {
			abilityBar.buttons[abilityId]?.activate(true);
		});

		taro.client.on('stop-press-key', (abilityId: string) => {
			abilityBar.buttons[abilityId]?.activate(false);
		});

		taro.client.on('start-casting', (abilityId: string) => {
			abilityBar.buttons[abilityId]?.casting(true);
		});

		taro.client.on('stop-casting', (abilityId: string) => {
			abilityBar.buttons[abilityId]?.casting(false);
		});

		taro.client.on('set-ability-name', (abilityId: string, name) => {
			abilityBar.buttons[abilityId]?.name(name);
		});

		taro.client.on('set-ability-image', (abilityId: string, img) => {
			abilityBar.buttons[abilityId]?.iconUrl(img);
		});

		taro.client.on('start-ability-cooldown', (abilityId: string) => {
			abilityBar.buttons[abilityId]?.cooldown(true);
		});

		taro.client.on('stop-ability-cooldown', (abilityId: string) => {
			abilityBar.buttons[abilityId]?.cooldown(false);
		});
	}

	preload (): void {
		this.load.plugin('rexroundrectangleplugin', '/assets/js/rexroundrectangleplugin.min.js', true);
        this.load.plugin('rexcirclemaskimageplugin', '/assets/js/rexcirclemaskimageplugin.min.js?v=1.1', true);
		Object.values(taro.game.data.abilities).forEach(ability => {
			if (ability.iconUrl) this.load.image(ability.iconUrl, this.patchAssetUrl(ability.iconUrl));
		});
		Object.values(taro.game.data.unitTypes).forEach(unitType => {
			// temp fix for undefined crash
			if (unitType?.controls?.unitAbilities && Object.keys(unitType.controls.unitAbilities).length > 0) {
				Object.values(unitType.controls.unitAbilities).forEach(ability => {
					if (ability.iconUrl) this.load.image(ability.iconUrl, this.patchAssetUrl(ability.iconUrl));
				});
			}
		});
	}

	update (): void {
		return;
	}
}

