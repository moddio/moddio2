class PhaserUiAttributeBar extends Phaser.GameObjects.Container {

    private readonly background: Phaser.GameObjects.Graphics;
    private readonly bar: Phaser.GameObjects.Graphics;
    private readonly text: Phaser.GameObjects.Text;
    bitmapText: Phaser.GameObjects.BitmapText;
    rtText: Phaser.GameObjects.RenderTexture;

	constructor(scene: PhaserScene, private container, public attribute: AttributeData) {

		super(scene);

        console.log('PhaserUiAttributeBar constructor');

        this.background = new Phaser.GameObjects.Graphics(scene);
        this.bar = new Phaser.GameObjects.Graphics(scene);

        this.add(this.background);
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

        this.draw();
        
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

    updateAttribute(attribute: AttributeData) {
        /*let valueOnly = true;
        Object.entries(attribute).forEach(property => {
            if (property[0] !== 'value' && property[0] !== 'isVisible' && property[1] !== this.attribute[property[0]]) {
                console.log('property changed', property)
                valueOnly = false;
            }
        });*/
        /*Object.values(attribute).forEach((property, index) => {
            if (property !== this.attribute[index]) {
                console.log('property changed', property)
                valueOnly = false;
            }
        });*/

        this.attribute = attribute;

        /*if (valueOnly) {
            this.updateValue();
        } else {*/
            this.draw();
        //}
    }

    updateValue() {
        const attribute = this.attribute;
        this.bar.scaleX = attribute.value/attribute.max;
        this.bar.x = - (1 - this.bar.scaleX) * this.container.barWidth/2;
        this.text.setText(`${attribute.name}: ${attribute.value}/${attribute.max}`);
    }

    draw ()
    {
        const attribute = this.attribute;
        const background = this.background;
        const bar = this.bar;

        this.background.clear();
        this.bar.clear();

        const width = this.container.barWidth;
        const height = this.container.barHeight;
        const radius = this.container.barRadius;

        this.x = this.scene.sys.game.canvas.width * 0.5 + 10;
        this.y = this.scene.sys.game.canvas.height - height/2 - 20;

        //  BG
        background.fillStyle(0x495057, 0.74);
        background.fillRoundedRect(- width/2, - height/2, width, height, radius);
        

        // Attribute
        bar.fillStyle(Phaser.Display.Color.HexStringToColor(attribute.color).color);
        bar.fillRect(- width/2 + 3, - height/2 + 3, width - 6, height - 6);
        

        // Text
        this.text.setText(`${attribute.name}: ${attribute.value}/${attribute.max}`);
        /*const text = this.text = scene.add.text(0, 0, `${attribute.name}: ${attribute.value}/${attribute.max}`, {
            fontFamily: 'arial',
            fontSize: 14,
            color: '#000000',
            align: 'center'
        });
        text.setResolution(2);
        text.setOrigin(0.5);  
        this.add(text);*/
        this.updateValue();
    }
}
