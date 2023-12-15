type MobileControlKey =
	'movementWheel' |
	'lookWheel' |
	'lookAndFireWheel' |
	string;

class MobileControlsScene extends PhaserScene {

	controls: Phaser.GameObjects.Container;
	joysticks: PhaserJoystick[] = [];

	enablePointerNextUpdate: boolean;
	disablePointerEvents: boolean;

	constructor() {
		super({ key: 'MobileControls' });
	}

	init (): void {

        this.scene.swapPosition('MobileControls', 'Ui');

		// enabling four mobile pointers
		this.input.addPointer(3);

		const scale = this.scale;
		const controls = this.controls = this.add.container();

		const joysticks = this.joysticks;

		taro.mobileControls.on('add-control',(
			key: MobileControlKey,
			x: number,
			y: number,
			w: number,
			h: number,
			settings: MobileControlSettings
		) => {

			switch (key) {

				case 'movementWheel':
				case 'lookWheel':
				case 'lookAndFireWheel':

					new PhaserJoystick(this, x, y, settings);

					break;

				default:
					const relativeX = Math.trunc((x + w / 2) / 960 * window.innerWidth - w / 2);
					const relativeY = Math.trunc((y + h / 2) / 540 * window.innerHeight - h / 2);

                    const uiScene = taro.renderer.scene.getScene('Ui') as UiScene;
                    let buttonExist = false;
                    Object.values(uiScene?.abilityBar?.buttons).forEach((button) => {
                        if (button.key === key) {
                            button.x = relativeX - uiScene.abilityBar.x + button.size/2;
                            button.y = relativeY - uiScene.abilityBar.y + button.size/2;
                            buttonExist = true;
                        }
                    });
                    if (buttonExist) return;

					const text = key.toUpperCase();

					const button = this.add.image(relativeX, relativeY, 'mobile-button-up')
						.setDisplaySize(w, h)
						.setOrigin(0)
						.setAlpha(0.6);
					controls.add(button);

					if (text === 'BUTTON1') {
						const icon = this.add.image(
							relativeX + w/2, relativeY + h/2,
							'mobile-button-icon'
						);
						icon.setScale(0.5);
						controls.add(icon);
					} else {
						const label = this.add.bitmapText(
							relativeX + w/2, relativeY + h/2,
							BitmapFontManager.font(this,
								'Arial', true, false, '#FFFFFF'
							)
						);
						label.setText(BitmapFontManager.sanitize(
							label.fontData, text
						));
						label.setCenterAlign();
						label.setFontSize(24);
						label.setOrigin(0.5);
						label.letterSpacing = -0.4;
						controls.add(label);
						if (this.renderer.type === Phaser.CANVAS) {
							const rt = this.add.renderTexture(
								label.x, label.y, label.width, label.height
							);
							rt.draw(label, label.width/2, label.height/2);
							rt.setOrigin(0.5);
							controls.add(rt);

							label.visible = false;
						}
					}

					button.setInteractive();

					let clicked = false;

					button.on('pointerdown', () => {
						this.disablePointerEvents = true;

						if (clicked) return;
						clicked = true;
						button.setTexture('mobile-button-down');

						settings.onStart && settings.onStart();
					});
					const onPointerEnd = () => {
						this.enablePointerNextUpdate = true;

						if (!clicked) return;
						clicked = false;
						button.setTexture('mobile-button-up');

						settings.onEnd && settings.onEnd();
					};
					button.on('pointerup', onPointerEnd);
					button.on('pointerout', onPointerEnd);

					break;
			}
		});

		let resized = false;

		taro.mobileControls.on('orientationchange', (e: string) => {
            switch(e) {
                case 'portrait-primary':
                    this.game.scale.setGameSize(window.innerWidth, window.innerHeight);
					if (resized) {
						resized = false;
					} else {
						resized = true;
                		window.dispatchEvent(new Event('resize'));
					}
                    break;
                case 'landscape-primary':
                    this.game.scale.setGameSize(window.innerWidth, window.innerHeight);
					if (resized) {
						resized = false;
					} else {
						resized = true;
                		window.dispatchEvent(new Event('resize'));
					}
                    break;
                default:  
            }
        });

		taro.mobileControls.on('clear-controls', () => {

			joysticks.forEach((j) => {
				j.destroy();
			});
			joysticks.length = 0;

			controls.getAll().forEach((c) => {
				c.destroy();
			});

		});

		taro.mobileControls.on('visible', (value: boolean) => {
			this.scene.setVisible(value);
		});

		this.input.on('pointerdown', function(pointer) {
			let emitPointerPosition = true;
			Object.keys(taro.mobileControls.controls).forEach(control => {
				if (control === 'lookWheel' || control === 'lookAndFireWheel') emitPointerPosition = false;
			});

			if (emitPointerPosition) {
				const gameScene = taro.renderer.scene.getScene('Game');
				const worldPoint = gameScene.cameras.main.getWorldPoint(gameScene.input.activePointer.x, gameScene.input.activePointer.y);
				taro.input.emit('touchpointermove', [{
					x: worldPoint.x,
					y: worldPoint.y,
				}]);
			}

			if (!this.disablePointerEvents) {
				if (this.joysticks.length === 0) return;
				else if (this.joysticks.length === 1) {
					const joystick = this.joysticks[0];
					joystick.show();
					joystick.x = pointer.x;
					joystick.y = pointer.y;
					joystick.updateTransform();
				} else {
					var touchX = pointer.x;
					var touchY = pointer.y;
					if (touchX < this.cameras.main.displayWidth / 2.4) {
						const leftJoystick = this.joysticks.find(({ side }) => side === 'left');
						if (leftJoystick) {
							leftJoystick.show();
							leftJoystick.x = touchX;
							leftJoystick.y = touchY;
							leftJoystick.updateTransform();
						}
					} else if (touchX > this.cameras.main.displayWidth - (this.cameras.main.displayWidth / 2.4)) {
						const rightJoystick = this.joysticks.find(({ side }) => side === 'right');
						if (rightJoystick) {
							rightJoystick.show();
							rightJoystick.x = touchX;
							rightJoystick.y = touchY;
							rightJoystick.updateTransform();
						}
					}
				}
			}
		}, this);

		this.input.on('pointerup', function(pointer) {
			if (!this.disablePointerEvents) {
				var touchX = pointer.x;
				if (touchX < this.cameras.main.displayWidth / 2.4) {
					const leftJoystick = this.joysticks.find(({ side }) => side === 'left');
					if (leftJoystick) leftJoystick.hide();
				} else if (touchX > this.cameras.main.displayWidth - (this.cameras.main.displayWidth / 2.4)) {
					const rightJoystick = this.joysticks.find(({ side }) => side === 'right');
					if (rightJoystick) rightJoystick.hide();
				}
			}
		}, this);

		/*if (scale.fullscreen.available) {
			scale.fullscreenTarget =
				document.getElementById('game-div');
			document.body.addEventListener('touchstart', () => {
				this.enterFullscreen();
			}, true);
			document.body.addEventListener('touchend', () => {
				this.enterFullscreen();
			}, true);
		}*/
	}

	preload (): void {

		this.load.image('mobile-button-up', this.patchAssetUrl(
			'https://cache.modd.io/asset/spriteImage/1549614640644_button1.png'
		));
		this.load.image('mobile-button-down', this.patchAssetUrl(
			'https://cache.modd.io/asset/spriteImage/1549614658007_button2.png'
		));

		this.load.image('mobile-button-icon', this.patchAssetUrl(
			'https://cache.modd.io/asset/spriteImage/1610494864771_fightFist_circle.png'
		));
	}

	update () {
		if (this.enablePointerNextUpdate) {
			this.joysticks.forEach((j) => {
				j.settings.onEnd && j.settings.onEnd();
			});
			this.enablePointerNextUpdate = false;
			this.disablePointerEvents = false;
		}
		//hide joysticks if no touching screen
		const gameScene = taro.renderer.scene.getScene('Game');
		let pointerDown = false;
		for (let i = 1; i < 6; i++) {
			var pointer = gameScene.input['pointer'+i.toString()];
			if (pointer && pointer.primaryDown) pointerDown = true;
		}
        if (!pointerDown) {
            var pointer = gameScene.input.mousePointer;
            if (pointer && pointer.primaryDown) pointerDown = true;
        }
		if (!pointerDown) {
		    const leftJoystick = this.joysticks.find(({ side }) => side === 'left');
			if (leftJoystick) leftJoystick.hide();
			const rightJoystick = this.joysticks.find(({ side }) => side === 'right');
			if (rightJoystick) rightJoystick.hide();
		} else {
			const worldPoint = gameScene.cameras.main.getWorldPoint(gameScene.input.activePointer.x, gameScene.input.activePointer.y);
			taro.input.emit('pointermove', [{
		    	x: worldPoint.x,
		    	y: worldPoint.y,
		    }]);
		}
	}

	private enterFullscreen() {
		if (!this.scale.isFullscreen) {
			this.scale.startFullscreen();
		}
	}
}
