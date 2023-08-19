class UiScene extends PhaserScene {

    attributes: PhaserAttributeBar[] = [];
	attributesContainer: Phaser.GameObjects.Container;

	constructor() {
		super({ key: 'Ui', active: true  });
	}

	init (): void {

        const barContainer = new PhaserUiBarsContainer(this);
        taro.client.on('attribute', (attribute) => {
            barContainer.updateBar(attribute);
		});
		
	}

    create ()
    {

    }

	preload (): void {

	}

	update () {
		
	}
}