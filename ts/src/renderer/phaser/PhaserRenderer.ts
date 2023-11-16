/// <reference types="@types/google.analytics" />

class PhaserRenderer extends Phaser.Game {

	constructor () {
		let forceCanvas;
		if (!USE_LOCAL_STORAGE) {
			forceCanvas = storage['force-canvas'];
		} else {
			try {
				forceCanvas = JSON.parse(
					localStorage.getItem('forceCanvas')
				) || {};
			} catch (e) {
				// attempting to reset bugged localStorage.forceCanvas that just return [object Object]
				if (e instanceof SyntaxError) {
					// enable on menuUi
					taro.menuUi.setForceCanvas(true);
					forceCanvas = JSON.parse(
						localStorage.getItem('forceCanvas')
					) || {};
				}
			}
		}

		super({
			type: forceCanvas[gameId] || forceCanvas[0] ?
				Phaser.CANVAS : Phaser.AUTO,
			scale: {
				width: 600,
				height: 400,
				parent: 'game-div',
				mode: Phaser.Scale.ScaleModes.RESIZE,
				// autoCenter: Phaser.Scale.CENTER_BOTH,
				autoRound: true,
				resizeInterval: 100,
			},
			render: {
				pixelArt: false,
				transparent: false
			},
			fps: {
				smoothStep: false
			},
			scene: [
				GameScene,
				UiScene,
				DevModeScene,
				MobileControlsScene
			],
			loader: {
				crossOrigin: 'anonymous'
			},
			plugins: {
				global: [{
					key: 'virtual-joystick',
					plugin: rexvirtualjoystickplugin,
					start: true
				}]
			},
			audio: {
				disableWebAudio: true
			}
		});

		if (this.isBooted) {
			this.setupInputListeners();
		} else {
			this.events.once(Phaser.Core.Events.BOOT,
				this.setupInputListeners, this
			);
		}
	}

	private setupInputListeners(): void {
		// Ask the input component to set up any listeners it has
		taro.input.setupListeners(this.canvas);
	}

	getViewportBounds (): Phaser.Geom.Rectangle {
		return this.scene.getScene('Game').cameras.main.worldView;
	}

	getCameraPosition (): {x: number, y: number} {
		const camera = this.scene.getScene('Game').cameras.main;
		return {
			x: camera.centerX,
			y: camera.centerY
		};
	}

	getCameraWidth (): number {
		return this.scene.getScene('Game').cameras.main.displayWidth;
	}

	getCameraHeight (): number {
		return this.scene.getScene('Game').cameras.main.displayHeight;
	}
}
