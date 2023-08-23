class UiScene extends PhaserScene {

	attributesContainer: Phaser.GameObjects.Container;

	constructor() {
		super({ key: 'Ui', active: true  });
	}

	init (): void {

        if (taro.game.data.defaultData.phaserAttributeBars) {
            const barContainer = new PhaserUiBarsContainer(this);

            taro.client.on('update-attribute-width', (items: number) => {
                barContainer.barWidth = items * 48 - 4;
                if (barContainer.barWidth < 200) barContainer.barWidth = 200;
            });
        
            taro.client.on('update-all-attributes', (attributes: Record<string, AttributeData>) => {
                barContainer.bars.forEach(bar => bar.destroy());
                barContainer.bars = [];
                Object.values(attributes).forEach(attribute => {
                    if (
                        attribute.isVisible && (attribute.isVisible.indexOf && attribute.isVisible.indexOf('centerBar') > -1)
                    ) {
                        barContainer.addBar(attribute);
                    }
                });
                /*Object.entries(attributes).forEach(([type, attribute]) => {
                    if (
                        attribute.isVisible && (attribute.isVisible.indexOf && attribute.isVisible.indexOf('centerBar') > -1)
                    ) {
                        const bar = barContainer.bars.find(bar => bar.attribute.type === attribute.type);
                        if (bar) {
                            bar.updateAttribute(attribute);
                        } else {
                            barContainer.addBar(attribute);
                        }
                    }
                });
                barContainer.bars.forEach((bar, index) => {
                    const attribute = Object.values(attributes).find(attribute => attribute.type === bar.attribute.type);
                    if (!attribute || !attribute.isVisible || (attribute.isVisible.indexOf && attribute.isVisible.indexOf('centerBar') === -1)) {
                        bar.destroy();
                        barContainer.bars.splice(index, 1);
                    }
                    else {
                        bar.y = this.sys.game.canvas.height - barContainer.barHeight/2 - 20 - (barContainer.bars.length - 1 - index) * barContainer.barInterval;
                    }
                });   */
            });
        
            taro.client.on('update-attribute-bar', (attribute: AttributeData) => {
                barContainer.updateBar(attribute);
		    });
        }
        
		
	}

    create (): void {

    }

	preload (): void {

	}

	update (): void {
		
	}
}
