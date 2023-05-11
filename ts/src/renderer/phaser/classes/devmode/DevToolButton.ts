class DevToolButton {
	name: string;
	button: Phaser.GameObjects.Rectangle;
	active: boolean;
	hidden: boolean;
	image: Phaser.GameObjects.Image;

	constructor (
		public devModeTools: DevModeTools,
		text: string,
		tooltipLabel: string,
		tooltipText: string,
		texture: string | null,
		x: number,
		y: number,
		w: number,
		container: Phaser.GameObjects.Container,
		func: (...args: any[]) => void,
		value?: number
	) {
		this.name = text;
		const h = devModeTools.BUTTON_HEIGHT;
		const scene = devModeTools.scene;
		const button = this.button = scene.add.rectangle(x + w/2, y + h/2, w, h, devModeTools.COLOR_WHITE);
		button.setInteractive();
		container.add(button);

		if (texture) {
			const image = this.image = scene.add.image(x + w/4 + h * 0.1, y + h * 0.1, texture)
				.setDisplaySize(h * 0.8, h * 0.8)
				.setOrigin(0);
			container.add(image);
		} else {
			const label = scene.add.bitmapText(
				x + w/2, y + h/2,
				BitmapFontManager.font(scene,
					'Verdana', false, false, '#000000'
				),
				text,
				22
			);
			label.setOrigin(0.5);
			label.letterSpacing = 1.3;
		    container.add(label);

			if (scene.renderer.type === Phaser.CANVAS) {
				const rt = scene.add.renderTexture(
					label.x, label.y,
					label.width, label.height
				);
				rt.draw(label, label.width/2, label.height/2);
				rt.setOrigin(0.5);
				container.add(rt);

				label.visible = false;
			}
		}
		button.on('pointerdown', () => {
			if (value || value === 0) func(value);
			else func();
		});
		button.on('pointerover', () => {
			scene.pointerInsideButtons = true;
			devModeTools.tooltip.showMessage(tooltipLabel, tooltipText);
		});
		button.on('pointerout', () => {
			scene.pointerInsideButtons = false;
			devModeTools.tooltip.fadeOut();
		});
	}

	highlight (mode: 'no'|'active'|'hidden'): void {
		switch (mode) {
			case 'hidden':
				this.hidden = true;
				this.active = false;
				this.button.setFillStyle(this.devModeTools['COLOR_GRAY'], 1);
				break;

			case 'active':
				this.active = true;
				this.hidden = false;
				this.button.setFillStyle(this.devModeTools['COLOR_LIGHT'], 1);
				break;

			case 'no':
				if (!this.hidden) {
					this.active = false;
					this.button.setFillStyle(this.devModeTools['COLOR_WHITE'], 1);
				}
				break;
		}
	}

	increaseSize (value: boolean): void {
		this.button.setScale(1 + (Number(value) * 0.2), 1 + (Number(value) * 0.10));
		/*if (value) {
			this.button.setStrokeStyle(2, 0x000000, 1);
		}
		else {
			this.button.setStrokeStyle();
		}*/
	}
}
