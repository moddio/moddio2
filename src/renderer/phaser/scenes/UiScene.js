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
var UiScene = /** @class */ (function (_super) {
    __extends(UiScene, _super);
    function UiScene() {
        return _super.call(this, { key: 'Ui', active: true }) || this;
    }
    UiScene.prototype.init = function () {
        return;
    };
    UiScene.prototype.create = function () {
        var _this = this;
        if (!taro.isMobile) {
            //this.tooltip = new DevTooltip(this);
        }
        var abilityBar = this.abilityBar = new AbilityBar(this);
        taro.client.on('create-ability-bar', function (data) {
            var keybindings = data.keybindings;
            var abilities = data.abilities;
            abilityBar.clear();
            if (abilities) {
                Object.entries(abilities).forEach(function (_a) {
                    var abilityId = _a[0], ability = _a[1];
                    var key;
                    if (keybindings && (taro.isMobile && ability.visibility !== 'desktop' && ability.visibility !== 'none') ||
                        (!taro.isMobile && ability.visibility !== 'mobile' && ability.visibility !== 'none')) {
                        Object.entries(keybindings).forEach(function (_a) {
                            var _b, _c;
                            var keybindingKey = _a[0], keybinding = _a[1];
                            if (((_b = keybinding.keyDown) === null || _b === void 0 ? void 0 : _b.abilityId) === abilityId || ((_c = keybinding.keyUp) === null || _c === void 0 ? void 0 : _c.abilityId) === abilityId) {
                                key = keybindingKey;
                            }
                        });
                        abilityBar.addButton(abilityId, ability, key);
                    }
                });
            }
        });
        taro.client.on('enterMapTab', function () {
            _this.scene.setVisible(false);
        });
        taro.client.on('leaveMapTab', function () {
            _this.scene.setVisible(true);
        });
        taro.client.on('start-press-key', function (abilityId) {
            var _a;
            (_a = abilityBar.buttons[abilityId]) === null || _a === void 0 ? void 0 : _a.activate(true);
        });
        taro.client.on('stop-press-key', function (abilityId) {
            var _a;
            (_a = abilityBar.buttons[abilityId]) === null || _a === void 0 ? void 0 : _a.activate(false);
        });
        taro.client.on('start-casting', function (abilityId) {
            var _a;
            (_a = abilityBar.buttons[abilityId]) === null || _a === void 0 ? void 0 : _a.casting(true);
        });
        taro.client.on('stop-casting', function (abilityId) {
            var _a;
            (_a = abilityBar.buttons[abilityId]) === null || _a === void 0 ? void 0 : _a.casting(false);
        });
        taro.client.on('set-ability-name', function (abilityId, name) {
            var button = abilityBar.buttons[abilityId];
            if (button) {
                button.name(name);
            }
        });
        taro.client.on('set-ability-image', function (abilityId, img) {
            var button = abilityBar.buttons[abilityId];
            if (button) {
                button.iconUrl(img);
            }
        });
        taro.client.on('start-ability-cooldown', function (abilityId) {
            var _a;
            (_a = abilityBar.buttons[abilityId]) === null || _a === void 0 ? void 0 : _a.cooldown(true);
        });
        taro.client.on('stop-ability-cooldown', function (abilityId) {
            var _a;
            (_a = abilityBar.buttons[abilityId]) === null || _a === void 0 ? void 0 : _a.cooldown(false);
        });
    };
    UiScene.prototype.preload = function () {
        var _this = this;
        this.load.plugin('rexroundrectangleplugin', '/assets/js/rexroundrectangleplugin.min.js', true);
        this.load.plugin('rexcirclemaskimageplugin', '/assets/js/rexcirclemaskimageplugin.min.js?v=1.1', true);
        Object.values(taro.game.data.abilities).forEach(function (ability) {
            if (ability.iconUrl)
                _this.load.image(ability.iconUrl, _this.patchAssetUrl(ability.iconUrl));
        });
        Object.values(taro.game.data.unitTypes).forEach(function (unitType) {
            var _a;
            // temp fix for undefined crash
            if (((_a = unitType === null || unitType === void 0 ? void 0 : unitType.controls) === null || _a === void 0 ? void 0 : _a.unitAbilities) && Object.keys(unitType.controls.unitAbilities).length > 0) {
                Object.values(unitType.controls.unitAbilities).forEach(function (ability) {
                    if (ability.iconUrl)
                        _this.load.image(ability.iconUrl, _this.patchAssetUrl(ability.iconUrl));
                });
            }
        });
    };
    UiScene.prototype.update = function () {
        return;
    };
    return UiScene;
}(PhaserScene));
//# sourceMappingURL=UiScene.js.map