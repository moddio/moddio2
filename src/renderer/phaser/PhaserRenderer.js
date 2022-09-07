/// <reference types="@types/google.analytics" />
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
var PhaserRenderer = /** @class */ (function (_super) {
    __extends(PhaserRenderer, _super);
    function PhaserRenderer() {
        var _this = this;
        var forceCanvas = JSON.parse(localStorage.getItem('forceCanvas')) || {};
        _this = _super.call(this, {
            type: forceCanvas[gameId] ?
                Phaser.CANVAS : Phaser.AUTO,
            scale: {
                width: 600,
                height: 400,
                parent: 'game-div',
                mode: Phaser.Scale.ScaleModes.RESIZE,
                autoRound: true,
                resizeInterval: 100
            },
            render: {
                pixelArt: false,
                transparent: false
            },
            scene: [
                GameScene,
                MobileControlsScene
            ],
            loader: {
                crossOrigin: 'anonymous'
            },
            plugins: {
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
        if (typeof ga != 'undefined' && ige.env != 'local') {
            ga('send', {
                hitType: 'event',
                eventCategory: 'Rendering Engine',
                eventAction: _this.renderer.type
            });
        }
        return _this;
    }
    PhaserRenderer.prototype.setupInputListeners = function () {
        // Ask the input component to setup any listeners it has
        ige.input.setupListeners(this.canvas);
    };
    PhaserRenderer.prototype.getViewportBounds = function () {
        return this.scene.getScene('Game').cameras.main.worldView;
    };
    return PhaserRenderer;
}(Phaser.Game));
//# sourceMappingURL=PhaserRenderer.js.map