class PhaserUiAttributeBar extends Phaser.GameObjects.Container {

	/*private readonly bar: Phaser.GameObjects.Graphics;
	private readonly bitmapText: Phaser.GameObjects.BitmapText;
	private readonly rtText: Phaser.GameObjects.RenderTexture;*/
    private p: number;
    private value: number;
    private readonly background: Phaser.GameObjects.Graphics;
    private readonly bar: Phaser.GameObjects.Graphics;
    private readonly text: Phaser.GameObjects.Text;

	constructor(scene: PhaserScene/*private unit: PhaserUnit*/) {

		//const scene = unit.scene;

		super(scene);

        this.background = new Phaser.GameObjects.Graphics(scene);
        this.bar = new Phaser.GameObjects.Graphics(scene);

        const width = 200;
        const height = 20;

        this.x = this.scene.sys.game.canvas.width * 0.5 + 400;
        this.y = this.scene.sys.game.canvas.height * 0.95;
        this.value = 100;
        this.p = 76 / 100;

        //  BG
        this.background.fillStyle(0x000000);
        this.background.fillRect(this.x - width/2, this.y - height/2, width, height);

        this.draw();

        scene.add.existing(this.background);
        scene.add.existing(this.bar);

		/*const bar = this.bar = scene.add.graphics();
		this.add(bar);

		const text = this.bitmapText = scene.add.bitmapText(0, 0,
			BitmapFontManager.font(scene, 'Arial', true, false, '#000000')
		);
		text.setCenterAlign();
		text.setFontSize(14);
		text.setOrigin(0.5);
		text.letterSpacing = -0.8;
		text.visible = false;
		this.add(text);

		if (scene.renderer.type === Phaser.CANVAS) {
			const rt = this.rtText = scene.add.renderTexture(0, 0);
			rt.setOrigin(0.5);
			rt.visible = false;
			this.add(rt);
		}*/
	}

    draw ()
    {
        this.bar.clear();

        

        //  Health

        this.bar.fillStyle(0xffffff);
        this.bar.fillRect(this.x + 2, this.y + 2, 76, 12);

        if (this.value < 30)
        {
            this.bar.fillStyle(0xff0000);
        }
        else
        {
            this.bar.fillStyle(0x00ff00);
        }

        var d = Math.floor(this.p * this.value);

        this.bar.fillRect(this.x + 2, this.y + 2, d, 12);
    }

	/*render (data: AttributeData): void {
		const {
			color,
			max,
			displayValue,
			index,
			showWhen,
			decimalPlaces
		} = data;

		const value = Number(data.value);

		this.name = data.type || data.key;

		const bar = this.bar;

		const w = 94;
		const h = 16;
		const borderRadius = h / 2 - 1;

		bar.clear();

		bar.fillStyle(Phaser.Display.Color
			.HexStringToColor(color)
			.color);

		if (value !== 0) {
			bar.fillRoundedRect(
				-w / 2,
				-h / 2,
				// we should not clamp here because it will mask whether or not there is a fault elsewhere in the attribute logic
				// because of this, changed from Math.max(w * Math.min(value, max)/ max...)
				Math.max(w * value / max, borderRadius * 1.5),
				h,
				borderRadius
			);
		}

		bar.lineStyle(2, 0x000000, 1);
		bar.strokeRoundedRect(
			-w / 2,
			-h / 2,
			w,
			h,
			borderRadius
		);

		const text = this.bitmapText;
		const rt = this.rtText;

		if (displayValue) {
			text.setText(value.toFixed(decimalPlaces));
			text.visible = !rt;
			if (rt) {
				rt.resize(text.width, text.height);
				rt.clear();
				rt.draw(text, text.width/2, text.height/2);
				rt.visible = true;
			}
		} else {
			text.setText('');
			text.visible = false;
			rt && (rt.visible = false);
		}

		this.y = (index - 1) * h*1.1;

		if ((showWhen instanceof Array &&
			showWhen.indexOf('valueChanges') > -1) ||
			showWhen === 'valueChanges') {
		}
	}*/
}
