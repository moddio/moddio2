class UiScene extends PhaserScene {
	phaserButtonBar: PhaserButtonBar;
	constructor() {
		super({ key: 'Ui', active: true });
	}

	init(): void {
		return;
	}

	create(): void {
		/*if (!taro.isMobile) {
			return;
		}*/

		const phaserButtonBar = (this.phaserButtonBar = new PhaserButtonBar(this));

		taro.client.on(
			'create-ability-bar',
			(data: { keybindings: Record<string, ControlAbility>; abilities: Record<string, UnitAbility> }) => {
				const keybindings = data.keybindings;
				const abilities = data.abilities;
				phaserButtonBar.clear();
				if (abilities) {
					Object.entries(abilities).forEach(([abilityId, ability]) => {
						let key;
						if (
							(keybindings && taro.isMobile && ability.visibility !== 'desktop' && ability.visibility !== 'none') ||
							(!taro.isMobile && ability.visibility !== 'mobile' && ability.visibility !== 'none')
						) {
							Object.entries(keybindings).forEach(([keybindingKey, keybinding]) => {
								if (keybinding.keyDown?.abilityId === abilityId || keybinding.keyUp?.abilityId === abilityId) {
									key = keybindingKey;
								}
							});
							phaserButtonBar.addButton(abilityId, ability, key);
						}
					});
				}
			}
		);

		//const phaserButtonBar = this.phaserButtonBar = new PhaserButtonBar(this);

		taro.client.on('enterMapTab', () => {
			this.scene.setVisible(false);
		});

		taro.client.on('leaveMapTab', () => {
			this.scene.setVisible(true);
		});

		taro.client.on('start-press-key', (key: string) => {
			phaserButtonBar.buttons[key]?.activate(true);
		});

		taro.client.on('stop-press-key', (key: string) => {
			phaserButtonBar.buttons[key]?.activate(false);
		});

		taro.client.on('start-casting', (key: string) => {
			phaserButtonBar.buttons[key]?.casting(true);
		});

		taro.client.on('stop-casting', (key: string) => {
			phaserButtonBar.buttons[key]?.casting(false);
		});

		taro.client.on('start-ability-cooldown', (key: string) => {
			phaserButtonBar.buttons[key]?.cooldown(true);
		});

		taro.client.on('stop-ability-cooldown', (key: string) => {
			phaserButtonBar.buttons[key]?.cooldown(false);
		});
	}

	preload(): void {
		this.load.plugin('rexroundrectangleplugin', '/assets/js/rexroundrectangleplugin.min.js', true);
		this.load.plugin('rexcirclemaskimageplugin', '/assets/js/rexcirclemaskimageplugin.min.js?v=1.1', true);
		Object.values(taro.game.data.abilities).forEach((ability) => {
			if (ability.iconUrl) this.load.image(ability.iconUrl, this.patchAssetUrl(ability.iconUrl));
		});
		Object.values(taro.game.data.unitTypes).forEach((unitType) => {
			// temp fix for undefined crash
			if (unitType?.controls?.unitAbilities && Object.keys(unitType.controls.unitAbilities).length > 0) {
				Object.values(unitType.controls.unitAbilities).forEach((ability) => {
					if (ability.iconUrl) this.load.image(ability.iconUrl, this.patchAssetUrl(ability.iconUrl));
				});
			}
		});
	}

	update(): void {
		return;
	}
}
