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
var PhaserAttributeBar = /** @class */ (function (_super) {
    __extends(PhaserAttributeBar, _super);
    function PhaserAttributeBar(unit) {
        var _this = this;
        var scene = unit.scene;
        _this = _super.call(this, scene) || this;
        _this.unit = unit;
        var bar = _this.bar = scene.add.graphics();
        _this.add(bar);
        var text = _this.bitmapText = scene.add.bitmapText(0, 0, BitmapFontManager.font(scene, 'Arial', true, false, '#000000'));
        text.setCenterAlign();
        text.setFontSize(14);
        text.setOrigin(0.5);
        text.letterSpacing = -0.8;
        text.visible = false;
        _this.add(text);
        if (scene.renderer.type === Phaser.CANVAS) {
            var rt = _this.rtText = scene.add.renderTexture(0, 0);
            rt.setOrigin(0.5);
            rt.visible = false;
            _this.add(rt);
        }
        // TODO batch entire attribute bar, not only text
        unit.attributesContainer.add(_this);
        unit.attributesContainer.height = 16;
        unit.updateGameObjectSize();
        return _this;
    }
    PhaserAttributeBar.get = function (unit) {
        if (!this.pool) {
            this.pool = unit.scene.make.group({});
        }
        var bar = this.pool.getFirstDead(false);
        if (!bar) {
            bar = new PhaserAttributeBar(unit);
            this.pool.add(bar);
        }
        bar.setActive(true);
        bar.unit = unit;
        unit.attributesContainer.add(bar);
        unit.attributesContainer.height += 16;
        unit.updateGameObjectSize();
        bar.setVisible(true);
        return bar;
    };
    PhaserAttributeBar.release = function (bar) {
        bar.resetFadeOut();
        bar.setVisible(false);
        bar.unit.attributesContainer.remove(bar);
        bar.unit.attributesContainer.height -= 16;
        bar.unit.updateGameObjectSize();
        bar.unit = null;
        bar.name = null;
        bar.setActive(false);
    };
    PhaserAttributeBar.prototype.render = function (data) {
        var color = data.color, max = data.max, displayValue = data.displayValue, index = data.index, showWhen = data.showWhen, decimalPlaces = data.decimalPlaces;
        var value = Number(data.value);
        this.name = data.type || data.key;
        var bar = this.bar;
        var w = 94;
        var h = 16;
        var borderRadius = h / 2 - 1;
        bar.clear();
        bar.fillStyle(Phaser.Display.Color
            .HexStringToColor(color)
            .color);
        if (value !== 0) {
            bar.fillRoundedRect(-w / 2, -h / 2, 
            // we should not clamp here because it will mask whether or not there is a fault elsewhere in the attribute logic
            // because of this, changed from Math.max(w * Math.min(value, max)/ max...)
            Math.max(w * value / max, borderRadius * 1.5), h, borderRadius);
        }
        bar.lineStyle(2, 0x000000, 1);
        bar.strokeRoundedRect(-w / 2, -h / 2, w, h, borderRadius);
        var text = this.bitmapText;
        var rt = this.rtText;
        if (displayValue) {
            text.setText(value.toFixed(decimalPlaces));
            text.visible = !rt;
            if (rt) {
                rt.resize(text.width, text.height);
                rt.clear();
                rt.draw(text, text.width / 2, text.height / 2);
                rt.visible = true;
            }
        }
        else {
            text.setText('');
            text.visible = false;
            rt && (rt.visible = false);
        }
        this.y = (index - 1) * h * 1.1;
        this.resetFadeOut();
        if ((showWhen instanceof Array &&
            showWhen.indexOf('valueChanges') > -1) ||
            showWhen === 'valueChanges') {
            this.fadeOut();
        }
    };
    PhaserAttributeBar.prototype.fadeOut = function () {
        var _this = this;
        var scene = this.scene;
        this.fadeTimerEvent = scene.time.delayedCall(1000, function () {
            _this.fadeTimerEvent = null;
            _this.fadeTween = scene.tweens.add({
                targets: _this,
                alpha: 0,
                duration: 500,
                onComplete: function () {
                    _this.fadeTween = null;
                    var unit = _this.unit;
                    if (unit) {
                        var attributes = unit.attributes;
                        var index = attributes.indexOf(_this);
                        if (index !== -1) {
                            attributes.splice(index, 1);
                            PhaserAttributeBar.release(_this);
                        }
                    }
                }
            });
        });
    };
    PhaserAttributeBar.prototype.resetFadeOut = function () {
        // reset fade timer and tween
        if (this.fadeTimerEvent) {
            this.scene.time.removeEvent(this.fadeTimerEvent);
            this.fadeTimerEvent = null;
        }
        if (this.fadeTween) {
            this.fadeTween.remove();
            this.fadeTween = null;
        }
        this.alpha = 1;
    };
    return PhaserAttributeBar;
}(Phaser.GameObjects.Container));
//# sourceMappingURL=PhaserAttributeBar.js.map