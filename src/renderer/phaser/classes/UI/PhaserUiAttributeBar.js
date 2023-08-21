var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var PhaserUiAttributeBar = /** @class */ (function (_super) {
    __extends(PhaserUiAttributeBar, _super);
    function PhaserUiAttributeBar(scene, container, attribute /*private unit: PhaserUnit*/) {
        var _this = _super.call(this, scene) || this;
        _this.container = container;
        _this.attribute = attribute;
        console.log('PhaserUiAttributeBar constructor');
        _this.background = new Phaser.GameObjects.Graphics(scene);
        _this.bar = new Phaser.GameObjects.Graphics(scene);
        var width = _this.container.barWidth;
        var height = _this.container.barHeight;
        var radius = _this.container.barRadius;
        _this.x = _this.scene.sys.game.canvas.width * 0.5 + 10 + 300;
        _this.y = _this.scene.sys.game.canvas.height - height / 2 - 20;
        _this.value = 100;
        _this.p = 76 / 100;
        //  BG
        _this.background.fillStyle(0x495057, 0.74);
        _this.background.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
        _this.add(_this.background);
        // Attribute
        _this.bar.fillStyle(Phaser.Display.Color.HexStringToColor(attribute.color).color);
        _this.bar.fillRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6);
        _this.add(_this.bar);
        // Text
        var text = _this.text = scene.add.text(0, 0, "".concat(attribute.name, ": ").concat(attribute.value, "/").concat(attribute.max), {
            fontFamily: 'arial',
            fontSize: 14,
            color: '#000000',
            align: 'center'
        });
        text.setResolution(2);
        text.setOrigin(0.5);
        _this.add(text);
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
        scene.add.existing(_this);
        return _this;
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
    PhaserUiAttributeBar.prototype.updateAttribute = function (attribute) {
        this.attribute = attribute;
        //this.draw();
    };
    PhaserUiAttributeBar.prototype.draw = function () {
        this.bar.clear();
    };
    return PhaserUiAttributeBar;
}(Phaser.GameObjects.Container));
//# sourceMappingURL=PhaserUiAttributeBar.js.map