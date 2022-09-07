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
var MobileControlsScene = /** @class */ (function (_super) {
    __extends(MobileControlsScene, _super);
    function MobileControlsScene() {
        var _this = _super.call(this, { key: 'MobileControls' }) || this;
        _this.joysticks = [];
        return _this;
    }
    MobileControlsScene.prototype.init = function () {
        var _this = this;
        // enabling four mobile pointers
        this.input.addPointer(3);
        var scale = this.scale;
        var controls = this.controls = this.add.container();
        this.resize();
        scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
        var joysticks = this.joysticks;
        ige.mobileControls.on('add-control', function (key, x, y, w, h, settings) {
            switch (key) {
                case 'movementWheel':
                case 'lookWheel':
                case 'lookAndFireWheel':
                    new PhaserJoystick(_this, x, y, settings);
                    break;
                default:
                    var text = key.toUpperCase();
                    var button_1 = _this.add.image(x, y, 'mobile-button-up')
                        .setDisplaySize(w, h)
                        .setOrigin(0)
                        .setAlpha(0.6);
                    controls.add(button_1);
                    if (text === 'BUTTON1') {
                        var icon = _this.add.image(x + w / 2, y + h / 2, 'mobile-button-icon');
                        icon.setScale(0.5);
                        controls.add(icon);
                    }
                    else {
                        var label = _this.add.bitmapText(x + w / 2, y + h / 2, 'Arial_24px_bold_white', text);
                        label.setCenterAlign();
                        label.setFontSize(26);
                        label.setOrigin(0.5);
                        controls.add(label);
                    }
                    button_1.setInteractive();
                    var clicked_1 = false;
                    button_1.on('pointerdown', function () {
                        if (clicked_1)
                            return;
                        clicked_1 = true;
                        button_1.setTexture('mobile-button-down');
                        settings.onStart && settings.onStart();
                    });
                    var onPointerEnd = function () {
                        if (!clicked_1)
                            return;
                        clicked_1 = false;
                        button_1.setTexture('mobile-button-up');
                        settings.onEnd && settings.onEnd();
                    };
                    button_1.on('pointerup', onPointerEnd);
                    button_1.on('pointerout', onPointerEnd);
                    break;
            }
        });
        ige.mobileControls.on('clear-controls', function () {
            joysticks.forEach(function (j) {
                j.destroy();
            });
            joysticks.length = 0;
            controls.getAll().forEach(function (c) {
                c.destroy();
            });
        });
        ige.mobileControls.on('visible', function (value) {
            _this.scene.setVisible(value);
        });
        if (scale.fullscreen.available) {
            scale.fullscreenTarget =
                document.getElementById('game-div');
            document.body.addEventListener('touchstart', function () {
                _this.enterFullscreen();
            }, true);
            document.body.addEventListener('touchend', function () {
                _this.enterFullscreen();
            }, true);
        }
    };
    MobileControlsScene.prototype.preload = function () {
        this.load.image('mobile-button-up', this.patchAssetUrl('https://cache.modd.io/asset/spriteImage/1549614640644_button1.png'));
        this.load.image('mobile-button-down', this.patchAssetUrl('https://cache.modd.io/asset/spriteImage/1549614658007_button2.png'));
        this.load.image('mobile-button-icon', this.patchAssetUrl('https://cache.modd.io/asset/spriteImage/1610494864771_fightFist_circle.png'));
    };
    MobileControlsScene.prototype.enterFullscreen = function () {
        if (!this.scale.isFullscreen) {
            this.scale.startFullscreen();
        }
    };
    MobileControlsScene.prototype.resize = function () {
        // make the mobileControls container
        // fit the width and be anchored to the bottom
        var controls = this.controls;
        var scale = this.scale;
        controls.y = scale.height - 540;
        controls.setScale(scale.width / 960);
        this.joysticks.forEach(function (j) {
            j.updateTransform();
        });
    };
    return MobileControlsScene;
}(PhaserScene));
//# sourceMappingURL=MobileControlsScene.js.map