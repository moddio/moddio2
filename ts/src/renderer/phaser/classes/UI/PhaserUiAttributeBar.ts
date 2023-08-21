class PhaserUiAttributeBar extends Phaser.GameObjects.Container {

	/*private readonly bar: Phaser.GameObjects.Graphics;
	private readonly bitmapText: Phaser.GameObjects.BitmapText;
	private readonly rtText: Phaser.GameObjects.RenderTexture;*/
    //public attribute: any;
    private p: number;
    private value: number;
    private readonly background: Phaser.GameObjects.Graphics;
    private readonly bar: Phaser.GameObjects.Graphics;
    private readonly text: Phaser.GameObjects.Text;
    bitmapText: Phaser.GameObjects.BitmapText;
    rtText: Phaser.GameObjects.RenderTexture;

	constructor(scene: PhaserScene, private container, public attribute: any/*private unit: PhaserUnit*/) {

		super(scene);

        console.log('PhaserUiAttributeBar constructor');

        this.background = new Phaser.GameObjects.Graphics(scene);
        this.bar = new Phaser.GameObjects.Graphics(scene);

        const width = this.container.barWidth;
        const height = this.container.barHeight;
        const radius = this.container.barRadius;

        this.x = this.scene.sys.game.canvas.width * 0.5 + 10 + 300;
        this.y = this.scene.sys.game.canvas.height - height/2 - 20;
        this.value = 100;
        this.p = 76 / 100;

        //  BG
        this.background.fillStyle(0x495057, 0.74);
        this.background.fillRoundedRect(- width/2, - height/2, width, height, radius);
        this.add(this.background);

        // Attribute
        this.bar.fillStyle(Phaser.Display.Color.HexStringToColor(attribute.color).color);
        this.bar.fillRect(- width/2 + 3, - height/2 + 3, width - 6, height - 6);
        this.add(this.bar);

        // Text
        const text = this.text = scene.add.text(0, 0, `${attribute.name}: ${attribute.value}/${attribute.max}`, {
            fontFamily: 'arial',
            fontSize: 14,
            color: '#000000',
            align: 'center'
        });
        text.setResolution(2);
        text.setOrigin(0.5);  
        this.add(text);

        /*const text = this.bitmapText = scene.add.bitmapText(0, 0,
			BitmapFontManager.font(taro.renderer.scene.getScene('Game'), 'Arial', true, false, '#000000')
		);
		text.setCenterAlign();
		text.setFontSize(14);
		text.setOrigin(0.5);
		text.letterSpacing = -0.8;
		text.visible = false;
		this.add(text);*/

        /*const text = scene.add.bitmapText(
            0, 0,
            BitmapFontManager.font(scene,
                'Verdana', false, false, '#000000'
            ),
            '100/100',
            22
        );
        text.setOrigin(0.5);
        text.letterSpacing = 1.3;
        text.setVisible(true);
        this.add(text);*/

		/*if (scene.renderer.type === Phaser.CANVAS) {
			const rt = this.rtText = scene.add.renderTexture(0, 0);
			rt.setOrigin(0.5);
			rt.visible = false;
			this.add(rt);
		}*/

        //this.draw();

        scene.add.existing(this);

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

    updateAttribute(attribute) {
        this.attribute = attribute;
        //this.draw();
    }

    draw ()
    {
        this.bar.clear();

    }
}
