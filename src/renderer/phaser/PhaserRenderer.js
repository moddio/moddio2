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
/// <reference types="@types/google.analytics" />
var PhaserRenderer = /** @class */ (function (_super) {
    __extends(PhaserRenderer, _super);
    function PhaserRenderer() {
        var _this = this;
        var forceCanvas;
        if (!USE_LOCAL_STORAGE) {
            forceCanvas = storage['force-canvas'];
        }
        else {
            try {
                forceCanvas = JSON.parse(localStorage.getItem('forceCanvas')) || {};
            }
            catch (e) {
                // attempting to reset bugged localStorage.forceCanvas that just return [object Object]
                if (e instanceof SyntaxError) {
                    // enable on menuUi
                    taro.menuUi.setForceCanvas(true);
                    forceCanvas = JSON.parse(localStorage.getItem('forceCanvas')) || {};
                }
            }
        }
        document.getElementById('game-div').setAttribute('style', "width:".concat(100 / taro.client.resolutionCoefficient, "%;height:").concat(100 / taro.client.resolutionCoefficient, "%;"));
        _this = _super.call(this, {
            type: forceCanvas[gameId] || forceCanvas[0] ?
                Phaser.CANVAS : Phaser.AUTO,
            scale: {
                width: 600,
                height: 400,
                parent: 'game-div',
                mode: Phaser.Scale.ScaleModes.RESIZE,
                autoRound: true,
                resizeInterval: 100,
                autoCenter: Phaser.Scale.Center.CENTER_BOTH,
            },
            render: {
                pixelArt: false,
                transparent: false
            },
            fps: {
                smoothStep: false
            },
            scene: [
                GameScene,
                DevModeScene,
                MobileControlsScene
            ],
            loader: {
                crossOrigin: 'anonymous'
            },
            plugins: {
                /*scene: [{
                      key: 'rexUI',
                      plugin: UIPlugin,
                      mapping: 'rexUI',
                }],*/
                global: [{
                        key: 'virtual-joystick',
                        plugin: rexvirtualjoystickplugin,
                        start: true
                    }]
            }
        }) || this;
        if (_this.isBooted) {
            _this.setupInputListeners();
        }
        else {
            _this.events.once(Phaser.Core.Events.BOOT, _this.setupInputListeners, _this);
        }
        return _this;
    }
    PhaserRenderer.prototype.setupInputListeners = function () {
        // Ask the input component to set up any listeners it has
        taro.input.setupListeners(this.canvas);
    };
    PhaserRenderer.prototype.getViewportBounds = function () {
        return this.scene.getScene('Game').cameras.main.worldView;
    };
    return PhaserRenderer;
}(Phaser.Game));
//# sourceMappingURL=PhaserRenderer.js.map