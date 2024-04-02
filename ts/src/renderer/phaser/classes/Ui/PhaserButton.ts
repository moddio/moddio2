class PhaserButton extends Phaser.GameObjects.Container {
	button: any;
	image: Phaser.GameObjects.Image;
	label: Phaser.GameObjects.BitmapText;
	timer: NodeJS.Timeout;
	backgroundColor: number;
	activeColor: number;
	fx: Phaser.FX.Bloom;

	onCooldown: boolean;
	cooldownLabel: Phaser.GameObjects.BitmapText;
	cooldownTimeLeft: number;
	cooldownTimer: NodeJS.Timer;

	constructor(
		scene: UiScene,
		private ability: UnitAbility,
		public id: string,
		public key: string = '',
		tooltipText: string,
		texture: string | null,
		x: number,
		y: number,
		public size: number,
		public radius: number
		//bar: Phaser.GameObjects.Container,
	) {
		super(scene);
		let backgroundColor = (this.backgroundColor = 0x000000);
		if (taro.isMobile) backgroundColor = this.backgroundColor = 0x333333;
		this.activeColor = 0xffff00;
		this.x = x;
		this.y = y;
		// @ts-ignore
		const button = (this.button = scene.add.rexRoundRectangle(0, 0, size, size, radius, backgroundColor, 0));
		button.setInteractive();
		this.add(button);

		// image
		if (texture && scene.textures.exists(texture)) {
			if (taro.isMobile) {
				// @ts-ignore
				const image = (this.image = scene.add.rexCircleMaskImage(0, 0, texture).setDisplaySize(size * 0.8, size * 0.8));
				this.add(image);
			} else {
				const image = (this.image = scene.add.image(0, 0, texture).setDisplaySize(size * 0.8, size * 0.8));
				this.add(image);
			}
			this.fx = this.image.preFX.addBloom(0xffffff, 1, 1, 2, 1.2).setActive(false);
		}
		// label
		if (key && key.length < 2) {
			const label = (this.label = scene.add.bitmapText(
				-size / 10 + size / 2,
				+size / 10 - size / 2,
				BitmapFontManager.font(scene, 'Verdana', true, false, '#FFFFFF'),
				key.toUpperCase(),
				14 * (taro.isMobile ? window.devicePixelRatio : 1)
			));
			label.setOrigin(0.5);
			label.letterSpacing = 1.3;
			this.add(label);
		}
		// cooldown label
		if (ability && ability.cooldown > 0) {
			const cooldownLabel = (this.cooldownLabel = scene.add.bitmapText(
				0,
				0,
				BitmapFontManager.font(scene, 'Verdana', false, true, '#FFFF00'),
				'',
				24 * (taro.isMobile ? window.devicePixelRatio : 1)
			));
			cooldownLabel.setOrigin(0.5);
			cooldownLabel.letterSpacing = 1.3;
			this.add(cooldownLabel);
		}

		scene.add.existing(this);

		if (taro.isMobile) {
			//hide key on mobile
			if (this.image) {
				if (this.label && this.label.visible) this.label.visible = false;
			}
			button.setFillStyle(backgroundColor, 0.7);
			const mobileControlScene = taro.renderer.scene.getScene('MobileControls') as MobileControlsScene;
			let clicked = false;
			button.on('pointerdown', () => {
				mobileControlScene.disablePointerEvents = true;
				this.activate(true);
				if (clicked) return;
				clicked = true;
				taro.client.emit('key-down', {
					device: 'key',
					key: key.toLowerCase(),
				});
			});
			const onPointerEnd = () => {
				mobileControlScene.enablePointerNextUpdate = true;
				this.activate(false);
				if (!clicked) return;
				clicked = false;
				taro.client.emit('key-up', {
					device: 'key',
					key: key.toLowerCase(),
				});
			};
			button.on('pointerup', onPointerEnd);
			button.on('pointerout', onPointerEnd);
		} else {
			button.on('pointerdown', () => {
				taro.client.isPressingPhaserButton = true;
				taro.client.emit('key-down', {
					device: 'key',
					key: key.toLowerCase(),
				});
			});
			button.on('pointerup', () => {
				taro.client.isPressingPhaserButton = false;
				taro.client.emit('key-up', {
					device: 'key',
					key: key.toLowerCase(),
				});
			});
			button.on('pointerover', () => {
				//scene.tooltip.showMessage(name, tooltipText);
				clearTimeout(this.timer);
			});
			button.on('pointerout', () => {
				//scene.tooltip.fadeOut();
				this.activate(false);
			});
		}
	}

	customize(size: number, radius: number): void {
		this.size = size;
		this.radius = radius;
		this.button.setSize(size, size);
		this.button.setRadius(radius);
		this.image?.setDisplaySize(size * 0.8, size * 0.8);
		this.label?.setPosition(-7 + size / 2, +7 - size / 2);
	}

	activate(bool: boolean): void {
		if (bool) {
			this.button.setFillStyle(this.activeColor, 1);
		} else {
			if (taro.isMobile) {
				this.button.setFillStyle(this.backgroundColor, 0.7);
			} else {
				this.button.setFillStyle(this.backgroundColor, 0);
			}
		}
	}

	casting(bool: boolean): void {
		if (bool) {
			if (this.image) {
				this.fx.setActive(true);
				//this.image.clearTint();
			}
		} else {
			if (this.image) {
				this.fx.setActive(false);
				if (this.onCooldown) {
					this.image.setTint(0x707070);
					this.startCooldownTimer();
				}
			}
		}
	}

	cooldown(bool: boolean): void {
		if (bool) {
			this.onCooldown = true;
			/*if (this.image) {
				this.image.setTint(0x707070);
			}*/
		} else {
			this.onCooldown = false;
			if (this.image) this.image.clearTint();
			clearInterval(this.cooldownTimer);
			this.cooldownTimeLeft = 0;
			this.cooldownLabel.text = '';
		}
	}

	startCooldownTimer(): void {
		this.cooldownTimeLeft = Math.floor((this.ability.cooldown - this.ability.castDuration) / 1000);
		this.cooldownLabel.text = this.getCooldownText();
		this.cooldownTimer = setInterval(() => {
			this.cooldownTimeLeft--;
			this.cooldownLabel.text = this.getCooldownText();
		}, 1000);
	}

	getCooldownText(): string {
		let cooldownText = this.cooldownTimeLeft.toString();
		if (this.cooldownTimeLeft > 99) cooldownText = `${Math.floor(this.cooldownTimeLeft / 60).toString()}m`;
		return cooldownText;
	}
}
