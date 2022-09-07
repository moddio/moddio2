interface MobileControlSettings {
	redFireZone?: boolean;
	onChange?(data: {
		angle: number,
		power: number
	}): void;
	onStart?(): void;
	onEnd?(): void;
}

class PhaserJoystick {

	private readonly virtualJoystick: {
		scene: MobileControlsScene,
		base: Phaser.GameObjects.Graphics;
		thumb: Phaser.GameObjects.Graphics;
		pointer: Phaser.Input.Pointer;
		angle: number;
		force: number;
		destroy (): void;
	} & Phaser.Events.EventEmitter;

	constructor (
		scene: MobileControlsScene,
		private x: number,
		private y: number,
		settings: MobileControlSettings
	) {
		const radius = 72;

		const base = scene.add.graphics();
		if (settings.redFireZone) {
			base.lineStyle(10, 0xff0000);
			base.fillStyle(0x000000, 0.5);
			base.fillCircle(0, 0, radius);
			base.strokeCircle(0, 0, radius);
		} else {
			base.fillStyle(0x000000, 0.5);
			base.fillCircle(0, 0, radius);
			base.alpha = 0.5;
		}

		const thumb = scene.add.graphics();
		thumb.fillStyle(0x000000);
		thumb.fillCircle(0, 0, 35/2);
		thumb.alpha = 0.5;

		const virtualJoystick = this.virtualJoystick =
			(<any>scene.plugins.get('virtual-joystick')).add(scene, {
				radius,
				base,
				thumb
			}) as PhaserJoystick['virtualJoystick'];

		this.updateTransform();

		virtualJoystick.on('update', () => {
			if (virtualJoystick.pointer) {
				settings.onChange && settings.onChange({
					angle: -virtualJoystick.angle,
					power: virtualJoystick.force
				});
			} else {
				settings.onEnd && settings.onEnd();
			}
		});

		scene.joysticks.push(this);
	}

	destroy (): void {
		this.virtualJoystick.destroy();
	}

	/**
	 * needed to apply transform as if joystick
	 * was child of controls container because
	 * virtual joystick plugin does not work
	 * well when joystick elements are nested
	 **/
	updateTransform (): void {
		const virtualJoystick = this.virtualJoystick;
		const scene = virtualJoystick.scene;
		const controls = scene.controls;

		const x = (this.x + 32) * controls.scaleX + controls.x;
		const y = (this.y + 12) * controls.scaleY + controls.y;

		const base = virtualJoystick.base;
		base.setScale(controls.scaleX, controls.scaleY);
		base.setPosition(x, y);

		const thumb = virtualJoystick.thumb;
		thumb.setScale(controls.scaleX, controls.scaleY);
		thumb.setPosition(x, y);
	}
}
