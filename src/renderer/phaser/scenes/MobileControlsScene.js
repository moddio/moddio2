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
        this.scene.swapPosition('MobileControls', 'Ui');
        // enabling four mobile pointers
        this.input.addPointer(3);
        var scale = this.scale;
        var controls = this.controls = this.add.container();
        var joysticks = this.joysticks;
        taro.mobileControls.on('add-control', function (key, x, y, w, h, settings) {
            var _a;
            switch (key) {
                case 'movementWheel':
                case 'lookWheel':
                case 'lookAndFireWheel':
                    new PhaserJoystick(_this, x, y, settings);
                    break;
                default:
                    var relativeX_1 = Math.trunc((x + w / 2) / 960 * window.innerWidth - w / 2);
                    var relativeY_1 = Math.trunc((y + h / 2) / 540 * window.innerHeight - h / 2);
                    var uiScene_1 = taro.renderer.scene.getScene('Ui');
                    var buttonExist_1 = false;
                    Object.values((_a = uiScene_1 === null || uiScene_1 === void 0 ? void 0 : uiScene_1.abilityBar) === null || _a === void 0 ? void 0 : _a.buttons).forEach(function (button) {
                        if (button.key === key) {
                            button.x = relativeX_1 - uiScene_1.abilityBar.x + button.size / 2;
                            button.y = relativeY_1 - uiScene_1.abilityBar.y + button.size / 2;
                            buttonExist_1 = true;
                        }
                    });
                    if (buttonExist_1)
                        return;
                    var text = key.toUpperCase();
                    var button_1 = _this.add.image(relativeX_1, relativeY_1, 'mobile-button-up')
                        .setDisplaySize(w, h)
                        .setOrigin(0)
                        .setAlpha(0.6);
                    controls.add(button_1);
                    if (text === 'BUTTON1') {
                        var icon = _this.add.image(relativeX_1 + w / 2, relativeY_1 + h / 2, 'mobile-button-icon');
                        icon.setScale(0.5);
                        controls.add(icon);
                    }
                    else {
                        var label = _this.add.bitmapText(relativeX_1 + w / 2, relativeY_1 + h / 2, BitmapFontManager.font(_this, 'Arial', true, false, '#FFFFFF'));
                        label.setText(BitmapFontManager.sanitize(label.fontData, text));
                        label.setCenterAlign();
                        label.setFontSize(24);
                        label.setOrigin(0.5);
                        label.letterSpacing = -0.4;
                        controls.add(label);
                        if (_this.renderer.type === Phaser.CANVAS) {
                            var rt = _this.add.renderTexture(label.x, label.y, label.width, label.height);
                            rt.draw(label, label.width / 2, label.height / 2);
                            rt.setOrigin(0.5);
                            controls.add(rt);
                            label.visible = false;
                        }
                    }
                    button_1.setInteractive();
                    var clicked_1 = false;
                    button_1.on('pointerdown', function () {
                        _this.disablePointerEvents = true;
                        if (clicked_1)
                            return;
                        clicked_1 = true;
                        button_1.setTexture('mobile-button-down');
                        settings.onStart && settings.onStart();
                    });
                    var onPointerEnd = function () {
                        _this.enablePointerNextUpdate = true;
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
        var resized = false;
        taro.mobileControls.on('orientationchange', function (e) {
            switch (e) {
                case 'portrait-primary':
                    _this.game.scale.setGameSize(window.innerWidth, window.innerHeight);
                    if (resized) {
                        resized = false;
                    }
                    else {
                        resized = true;
                        window.dispatchEvent(new Event('resize'));
                    }
                    break;
                case 'landscape-primary':
                    _this.game.scale.setGameSize(window.innerWidth, window.innerHeight);
                    if (resized) {
                        resized = false;
                    }
                    else {
                        resized = true;
                        window.dispatchEvent(new Event('resize'));
                    }
                    break;
                default:
            }
        });
        taro.mobileControls.on('clear-controls', function () {
            joysticks.forEach(function (j) {
                j.destroy();
            });
            joysticks.length = 0;
            controls.getAll().forEach(function (c) {
                c.destroy();
            });
        });
        taro.mobileControls.on('visible', function (value) {
            _this.scene.setVisible(value);
        });
        this.input.on('pointerdown', function (pointer) {
            var emitPointerPosition = true;
            Object.keys(taro.mobileControls.controls).forEach(function (control) {
                if (control === 'lookWheel' || control === 'lookAndFireWheel')
                    emitPointerPosition = false;
            });
            if (emitPointerPosition) {
                var gameScene = taro.renderer.scene.getScene('Game');
                var worldPoint = gameScene.cameras.main.getWorldPoint(gameScene.input.activePointer.x, gameScene.input.activePointer.y);
                taro.input.emit('touchpointermove', [{
                        x: worldPoint.x,
                        y: worldPoint.y,
                    }]);
            }
            if (!this.disablePointerEvents) {
                if (this.joysticks.length === 0)
                    return;
                else if (this.joysticks.length === 1) {
                    var joystick = this.joysticks[0];
                    joystick.show();
                    joystick.x = pointer.x;
                    joystick.y = pointer.y;
                    joystick.updateTransform();
                }
                else {
                    var touchX = pointer.x;
                    var touchY = pointer.y;
                    if (touchX < this.cameras.main.displayWidth / 2.4) {
                        var leftJoystick = this.joysticks.find(function (_a) {
                            var side = _a.side;
                            return side === 'left';
                        });
                        if (leftJoystick) {
                            leftJoystick.show();
                            leftJoystick.x = touchX;
                            leftJoystick.y = touchY;
                            leftJoystick.updateTransform();
                        }
                    }
                    else if (touchX > this.cameras.main.displayWidth - (this.cameras.main.displayWidth / 2.4)) {
                        var rightJoystick = this.joysticks.find(function (_a) {
                            var side = _a.side;
                            return side === 'right';
                        });
                        if (rightJoystick) {
                            rightJoystick.show();
                            rightJoystick.x = touchX;
                            rightJoystick.y = touchY;
                            rightJoystick.updateTransform();
                        }
                    }
                }
            }
        }, this);
        this.input.on('pointerup', function (pointer) {
            if (!this.disablePointerEvents) {
                var touchX = pointer.x;
                if (touchX < this.cameras.main.displayWidth / 2.4) {
                    var leftJoystick = this.joysticks.find(function (_a) {
                        var side = _a.side;
                        return side === 'left';
                    });
                    if (leftJoystick)
                        leftJoystick.hide();
                }
                else if (touchX > this.cameras.main.displayWidth - (this.cameras.main.displayWidth / 2.4)) {
                    var rightJoystick = this.joysticks.find(function (_a) {
                        var side = _a.side;
                        return side === 'right';
                    });
                    if (rightJoystick)
                        rightJoystick.hide();
                }
            }
        }, this);
        /*if (scale.fullscreen.available) {
            scale.fullscreenTarget =
                document.getElementById('game-div');
            document.body.addEventListener('touchstart', () => {
                this.enterFullscreen();
            }, true);
            document.body.addEventListener('touchend', () => {
                this.enterFullscreen();
            }, true);
        }*/
    };
    MobileControlsScene.prototype.preload = function () {
        this.load.image('mobile-button-up', this.patchAssetUrl('https://cache.modd.io/asset/spriteImage/1549614640644_button1.png'));
        this.load.image('mobile-button-down', this.patchAssetUrl('https://cache.modd.io/asset/spriteImage/1549614658007_button2.png'));
        this.load.image('mobile-button-icon', this.patchAssetUrl('https://cache.modd.io/asset/spriteImage/1610494864771_fightFist_circle.png'));
    };
    MobileControlsScene.prototype.update = function () {
        if (this.enablePointerNextUpdate) {
            this.joysticks.forEach(function (j) {
                j.settings.onEnd && j.settings.onEnd();
            });
            this.enablePointerNextUpdate = false;
            this.disablePointerEvents = false;
        }
        //hide joysticks if no touching screen
        var gameScene = taro.renderer.scene.getScene('Game');
        var pointerDown = false;
        for (var i = 1; i < 6; i++) {
            var pointer = gameScene.input['pointer' + i.toString()];
            if (pointer && pointer.primaryDown)
                pointerDown = true;
        }
        if (!pointerDown) {
            var pointer = gameScene.input.mousePointer;
            if (pointer && pointer.primaryDown)
                pointerDown = true;
        }
        if (!pointerDown) {
            var leftJoystick = this.joysticks.find(function (_a) {
                var side = _a.side;
                return side === 'left';
            });
            if (leftJoystick)
                leftJoystick.hide();
            var rightJoystick = this.joysticks.find(function (_a) {
                var side = _a.side;
                return side === 'right';
            });
            if (rightJoystick)
                rightJoystick.hide();
        }
        else {
            var worldPoint = gameScene.cameras.main.getWorldPoint(gameScene.input.activePointer.x, gameScene.input.activePointer.y);
            taro.input.emit('pointermove', [{
                    x: worldPoint.x,
                    y: worldPoint.y,
                }]);
        }
    };
    MobileControlsScene.prototype.enterFullscreen = function () {
        if (!this.scale.isFullscreen) {
            this.scale.startFullscreen();
        }
    };
    return MobileControlsScene;
}(PhaserScene));
//# sourceMappingURL=MobileControlsScene.js.map