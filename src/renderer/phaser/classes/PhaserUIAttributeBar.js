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
    function PhaserUiAttributeBar(scene /*private unit: PhaserUnit*/) {
        //const scene = unit.scene;
        var _this = _super.call(this, scene) || this;
        _this.background = new Phaser.GameObjects.Graphics(scene);
        _this.bar = new Phaser.GameObjects.Graphics(scene);
        var width = 200;
        var height = 20;
        _this.x = _this.scene.sys.game.canvas.width * 0.5 + 400;
        _this.y = _this.scene.sys.game.canvas.height * 0.95;
        _this.value = 100;
        _this.p = 76 / 100;
        //  BG
        _this.background.fillStyle(0x000000);
        _this.background.fillRect(_this.x - width / 2, _this.y - height / 2, width, height);
        _this.draw();
        scene.add.existing(_this.background);
        scene.add.existing(_this.bar);
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
    PhaserUiAttributeBar.prototype.draw = function () {
        this.bar.clear();
        //  Health
        this.bar.fillStyle(0xffffff);
        this.bar.fillRect(this.x + 2, this.y + 2, 76, 12);
        if (this.value < 30) {
            this.bar.fillStyle(0xff0000);
        }
        else {
            this.bar.fillStyle(0x00ff00);
        }
        var d = Math.floor(this.p * this.value);
        this.bar.fillRect(this.x + 2, this.y + 2, d, 12);
    };
    return PhaserUiAttributeBar;
}(Phaser.GameObjects.Container));
//# sourceMappingURL=PhaserUiAttributeBar.js.map