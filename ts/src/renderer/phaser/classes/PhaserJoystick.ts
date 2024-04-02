interface MobileControlSettings {
	redFireZone?: boolean;
	onChange?(data: { angle: number; power: number }): void;
	onStart?(): void;
	onEnd?(): void;
}

class PhaserJoystick {
	public readonly virtualJoystick: {
		scene: MobileControlsScene;
		radius: number;
		base: Phaser.GameObjects.Graphics;
		thumb: Phaser.GameObjects.Graphics;
		pointer: Phaser.Input.Pointer;
		angle: number;
		force: number;
		setVisible(boolean): void;
		destroy(): void;
	} & Phaser.Events.EventEmitter;
	side: string;
	radius: number;

	constructor(
		scene: MobileControlsScene,
		private x: number,
		private y: number,
		public settings: MobileControlSettings
	) {
		const radius = (this.radius = scene.cameras.main.displayWidth * 0.05);

		const base = scene.add.graphics();
		base.fillStyle(0x18181b, 0.9);
		base.fillCircle(0, 0, radius);

		if (settings.redFireZone) {
			base.beginPath();
			base.lineStyle(radius / 8, 0xff0000);
			base.arc(0, 0, radius / 1.08, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(360), true, 0.02);
			base.strokePath();
			base.closePath();
			base.alpha = 1;
		} else {
			base.alpha = 0.5;
		}

		const thumb = scene.add.graphics();
		thumb.fillStyle(0x3f3f46);
		thumb.fillCircle(0, 0, 35 / 2);
		thumb.alpha = 0.9;

		const virtualJoystick = (this.virtualJoystick = (<any>scene.plugins.get('virtual-joystick')).add(scene, {
			radius,
			base,
			thumb,
		}) as PhaserJoystick['virtualJoystick']);

		this.updateTransform();
		this.hide();

		virtualJoystick.on('update', () => {
			if (virtualJoystick.pointer) {
				settings.onChange &&
					settings.onChange({
						angle: -virtualJoystick.angle,
						power: virtualJoystick.force / radius,
					});
			} else {
				settings.onEnd && settings.onEnd();
			}
		});

		scene.joysticks.push(this);

		if (scene.joysticks.length > 1) {
			if (scene.joysticks[1].x > scene.joysticks[0].x) {
				scene.joysticks[0].side = 'left';
				scene.joysticks[1].side = 'right';
			} else {
				scene.joysticks[0].side = 'right';
				scene.joysticks[1].side = 'left';
			}
		} else if (scene.joysticks.length === 1) {
			if (scene.joysticks[0].x > scene.cameras.main.displayWidth / 2) {
				scene.joysticks[0].side = 'right';
			} else {
				scene.joysticks[0].side = 'left';
			}
		}
	}

	show(): void {
		// this.virtualJoystick.setVisible(true);
	}

	hide(): void {
		this.virtualJoystick.setVisible(false);
	}

	destroy(): void {
		this.virtualJoystick.destroy();
	}

	/**
	 * needed to apply transform as if joystick
	 * was child of controls container because
	 * virtual joystick plugin does not work
	 * well when joystick elements are nested
	 **/
	updateTransform(): void {
		const virtualJoystick = this.virtualJoystick;
		const scene = virtualJoystick.scene;
		const controls = scene.controls;

		const x = this.x;
		const y = this.y;

		virtualJoystick.radius = this.radius * controls.scaleX;

		const base = virtualJoystick.base;
		base.setScale(controls.scaleX, controls.scaleY);
		base.setPosition(x, y);

		const thumb = virtualJoystick.thumb;
		thumb.setScale(controls.scaleX, controls.scaleY);
		thumb.setPosition(x, y);
	}
}
