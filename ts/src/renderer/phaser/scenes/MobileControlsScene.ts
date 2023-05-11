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

		// enabling four mobile pointers
		this.input.addPointer(3);

		const scale = this.scale;
		const controls = this.controls = this.add.container();
		this.resize();
		scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);

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

					const text = key.toUpperCase();

					const button = this.add.image(x, y, 'mobile-button-up')
						.setDisplaySize(w, h)
						.setOrigin(0)
						.setAlpha(0.6);
					controls.add(button);

					if (text === 'BUTTON1') {
						const icon = this.add.image(
							x + w/2, y + h/2,
							'mobile-button-icon'
						);
						icon.setScale(0.5);
						controls.add(icon);
					} else {
						const label = this.add.bitmapText(
							x + w/2, y + h/2,
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
			reactApp.handlePointerDownForMobile && reactApp.handlePointerDownForMobile(pointer);
			this.initialPosition = {
				x: pointer.x,
				y: pointer.y,
			};
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
		}, this);

		this.input.on('pointerup', function(pointer) {
			this.finalPosition = {
				x: pointer.x,
				y: pointer.y,
			};

			const maxMovementWindow = 5;
			// if joystick isn't dragged or moved
			if (Math.abs(this.initialPosition.x - this.finalPosition.x) < maxMovementWindow && Math.abs(this.initialPosition.y - this.finalPosition.y) < maxMovementWindow) {	
				// select the element and check if the element position is within the joystick
				const chatEle = $('#mobile-chat-container');
				const chatElePos = chatEle.position();
				const chatEleWidth = chatEle.width();
				const chatEleHeight = chatEle.height();
				const chatEleX = chatElePos.left;
				const chatEleY = chatElePos.top;
				const chatEleX2 = chatEleX + chatEleWidth;
				const chatEleY2 = chatEleY + chatEleHeight;
				// if the pointer is within the joystick
				if (pointer.x > chatEleX && pointer.x < chatEleX2 && pointer.y > chatEleY && pointer.y < chatEleY2) {
					reactApp.openExpendedChat();
				}
			}
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
			this.enablePointerNextUpdate = false;
			this.disablePointerEvents = false;
		}
		//hide joysticks if no touching screen
		const gameScene = taro.renderer.scene.getScene('Game');
		let pointerDown = false;
		for (let i = 1; i < 6; i++) {
			var pointer = gameScene.input['pointer'+i.toString()];
			if (pointer.primaryDown) pointerDown = true;
		}
		if (!pointerDown) {
		    const leftJoystick = this.joysticks.find(({ side }) => side === 'left');
			if (leftJoystick) leftJoystick.hide();
			const rightJoystick = this.joysticks.find(({ side }) => side === 'right');
			if (rightJoystick) rightJoystick.hide();
		}
	}

	private enterFullscreen() {
		if (!this.scale.isFullscreen) {
			this.scale.startFullscreen();
		}
	}

	private resize() {
		// make the mobileControls container
		// fit the width and be anchored to the bottom
		const controls = this.controls;
		const scale = this.scale;

		controls.setScale(scale.width / 960);
		controls.y = scale.height - 540 * controls.scale;
	}
}
