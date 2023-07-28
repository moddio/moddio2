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
var PhaserProjectile = /** @class */ (function (_super) {
    __extends(PhaserProjectile, _super);
    function PhaserProjectile(scene, entity) {
        var _this = _super.call(this, scene, entity, "projectile/".concat(entity._stats.cellSheet.url)) || this;
        _this.sprite.visible = false;
        _this.scene.renderedEntities.push(_this.sprite);
        _this.gameObject = _this.sprite;
        var _a = entity._translate, x = _a.x, y = _a.y;
        _this.gameObject.setPosition(x, y);
        scene.projectilesList.push(_this);
        Object.assign(_this.evtListeners, {
            'update-texture': entity.on('update-texture', _this.updateTexture, _this),
        });
        return _this;
    }
    PhaserProjectile.prototype.updateTexture = function (data) {
        if (data === 'basic_texture_change') {
            this.sprite.anims.stop();
            this.key = "projectile/".concat(this.entity._stats.cellSheet.url);
            if (!this.scene.textures.exists(this.key)) {
                this.scene.loadEntity(this.key, this.entity._stats);
                this.scene.load.on("filecomplete-image-".concat(this.key), function cnsl() {
                    if (this && this.sprite) {
                        this.sprite.setTexture(this.key);
                        this.sprite.texture.setFilter(this.scene.filter);
                        var bounds = this.entity._bounds2d;
                        this.sprite.setDisplaySize(bounds.x, bounds.y);
                    }
                }, this);
                this.scene.load.start();
            }
            else {
                this.sprite.setTexture(this.key);
                var bounds = this.entity._bounds2d;
                this.sprite.setDisplaySize(bounds.x, bounds.y);
            }
        }
    };
    PhaserProjectile.prototype.destroy = function () {
        var _this = this;
        this.scene.renderedEntities = this.scene.renderedEntities.filter(function (item) { return item !== _this.sprite; });
        this.scene.projectilesList = this.scene.projectilesList.filter(function (item) { return item.entity.id() !== _this.entity.id(); });
        _super.prototype.destroy.call(this);
    };
    return PhaserProjectile;
}(PhaserAnimatedEntity));
//# sourceMappingURL=PhaserProjectile.js.map