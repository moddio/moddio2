var DevToolButton = /** @class */ (function () {
    function DevToolButton(devModeTools, text, tooltipLabel, tooltipText, texture, x, y, w, container, func, value) {
        this.devModeTools = devModeTools;
        this.name = text;
        var h = devModeTools.BUTTON_HEIGHT;
        var scene = devModeTools.scene;
        var button = this.button = scene.add.rectangle(x + w / 2, y + h / 2, w, h, devModeTools.COLOR_WHITE);
        button.setInteractive();
        container.add(button);
        if (texture) {
            var image = this.image = scene.add.image(x + w / 4 + h * 0.1, y + h * 0.1, texture)
                .setDisplaySize(h * 0.8, h * 0.8)
                .setOrigin(0);
            container.add(image);
        }
        else {
            var label = scene.add.bitmapText(x + w / 2, y + h / 2, BitmapFontManager.font(scene, 'Verdana', false, false, '#000000'), text, 22);
            label.setOrigin(0.5);
            label.letterSpacing = 1.3;
            container.add(label);
            if (scene.renderer.type === Phaser.CANVAS) {
                var rt = scene.add.renderTexture(label.x, label.y, label.width, label.height);
                rt.draw(label, label.width / 2, label.height / 2);
                rt.setOrigin(0.5);
                container.add(rt);
                label.visible = false;
            }
        }
        button.on('pointerdown', function () {
            if (value || value === 0)
                func(value);
            else
                func();
        });
        button.on('pointerover', function () {
            scene.pointerInsideButtons = true;
            devModeTools.tooltip.showMessage(tooltipLabel, tooltipText);
        });
        button.on('pointerout', function () {
            scene.pointerInsideButtons = false;
            devModeTools.tooltip.fadeOut();
        });
    }
    DevToolButton.prototype.highlight = function (mode) {
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
    };
    DevToolButton.prototype.increaseSize = function (value) {
        this.button.setScale(1 + (Number(value) * 0.2), 1 + (Number(value) * 0.10));
        /*if (value) {
            this.button.setStrokeStyle(2, 0x000000, 1);
        }
        else {
            this.button.setStrokeStyle();
        }*/
    };
    return DevToolButton;
}());
//# sourceMappingURL=DevToolButton.js.map