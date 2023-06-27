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

		var targetWidth = 600; // the width of the game we want
		var targetHeight = 400; // the height of the game we want

// additional ratios

//Small – 360x240
//Normal – 480x320
//Large – 720x480
//XLarge – 960x640
//XXLarge – 1440x960

		var deviceRatio = (window.innerWidth/window.innerHeight); //device aspect ratio

		var newRatio = (targetHeight/targetWidth)*deviceRatio; //new ratio to fit the screen

		var newWidth = targetWidth*newRatio;
		var newHeight = targetHeight;

		var gameWidth = newWidth;
		var gameHeight = newHeight;
		var gameRendrer = Phaser.AUTO;

		super({
			// type: forceCanvas[gameId] || forceCanvas[0] ?
			// 	Phaser.CANVAS : Phaser.AUTO,
			type: Phaser.WEBGL,
			scale: {
				// width: 600,
				// height: 400,
				width: window.innerWidth * window.devicePixelRatio,
				height: window.innerHeight * window.devicePixelRatio,
				// width: newWidth,
				// height: newHeight,
				parent: 'game-div',
				mode: Phaser.Scale.ScaleModes.RESIZE,
				autoRound: true,
				// autoRound: false,
				resizeInterval: 100
			},
			render: {
				pixelArt: false,
				transparent: false,
				antialias: true,
				antialiasGL: true
			},
			fps: {
				smoothStep: false
			},
			scene: [
				GameScene,
				DevModeScene,
				MobileControlsScene
			],
			loader: {
				crossOrigin: 'anonymous'
			},
			plugins: {
				/*scene: [{
					  key: 'rexUI',
					  plugin: UIPlugin,
					  mapping: 'rexUI',
				}],*/
				global: [{
					key: 'virtual-joystick',
					plugin: rexvirtualjoystickplugin,
					start: true
				}]
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
}
