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
var PhaserAnimatedEntity = /** @class */ (function (_super) {
    __extends(PhaserAnimatedEntity, _super);
    function PhaserAnimatedEntity(scene, entity, key) {
        var _this = _super.call(this, entity) || this;
        _this.scene = scene;
        _this.key = key;
        _this.attachedParticles = [];
        var bounds = entity._bounds2d;
        _this.sprite = _this.addSprite(key);
        _this.sprite.setDisplaySize(bounds.x, bounds.y);
        _this.sprite.rotation = entity._rotate.z;
        Object.assign(_this.evtListeners, {
            'play-animation': entity.on('play-animation', _this.playAnimation, _this),
            'transform-debug': entity.on('transform-debug', _this.transformDebug, _this),
            size: entity.on('size', _this.size, _this),
            scale: entity.on('scale', _this.scale, _this),
            flip: entity.on('flip', _this.flip, _this),
        });
        return _this;
    }
    PhaserAnimatedEntity.prototype.playAnimation = function (animationId) {
        if (this.scene.anims.exists("".concat(this.key, "/").concat(animationId))) {
            this.sprite.play("".concat(this.key, "/").concat(animationId));
        }
        else {
            this.sprite.anims.stop();
        }
    };
    PhaserAnimatedEntity.prototype.transform = function (data) {
        this.gameObject.setPosition(data.x, data.y);
        this.sprite.rotation = data.rotation;
        this.flip(this.entity._stats.flip);
    };
    PhaserAnimatedEntity.prototype.transformDebug = function (data) {
        if (data.debug === 'green-square') {
            if (!this.debugGameObject) {
                var bounds = this.entity._bounds2d;
                this.debugGameObject = this.scene.add.rectangle(0, 0, bounds.x, bounds.y);
                this.debugGameObject.setStrokeStyle(2, 0x008000);
            }
            this.debugGameObject.setPosition(data.x, data.y);
            this.debugGameObject.rotation = data.rotation;
        }
        else if (data.debug === 'blue-square') {
            if (!this.debugGameObjectBlue) {
                var bounds = this.entity._bounds2d;
                this.debugGameObjectBlue = this.scene.add.rectangle(0, 0, bounds.x, bounds.y);
                this.debugGameObjectBlue.setStrokeStyle(2, 0x0000FF);
            }
            this.debugGameObjectBlue.setPosition(data.x, data.y);
            this.debugGameObjectBlue.rotation = data.rotation;
        }
        else if (data.debug === 'red-square') {
            if (!this.debugGameObjectRed) {
                var bounds = this.entity._bounds2d;
                this.debugGameObjectRed = this.scene.add.rectangle(0, 0, bounds.x, bounds.y);
                this.debugGameObjectRed.setStrokeStyle(2, 0xFF0000);
            }
            this.debugGameObjectRed.setPosition(data.x, data.y);
            this.debugGameObjectRed.rotation = data.rotation;
        }
    };
    PhaserAnimatedEntity.prototype.size = function (data) {
        this.sprite.setSize(data.width, data.height);
        this.sprite.setDisplaySize(data.width, data.height);
    };
    PhaserAnimatedEntity.prototype.scale = function (data) {
        this.sprite.setScale(data.x, data.y);
    };
    PhaserAnimatedEntity.prototype.flip = function (flip) {
        this.sprite.setFlip(flip % 2 === 1, flip > 1);
    };
    PhaserAnimatedEntity.prototype.destroy = function () {
        this.sprite = null;
        this.attachedParticles.forEach(function (particle) { return particle.stop(); });
        _super.prototype.destroy.call(this);
    };
    PhaserAnimatedEntity.prototype.useTexturePack = function (key) {
        if (this.scene.textures.exists('pack-result')) {
            var frame = this.scene.textures.getFrame('pack-result', key);
            if (frame && frame.name === key) {
                if (this.entity._stats.cellSheet.columnCount === 1 && this.entity._stats.cellSheet.rowCount === 1) {
                    return true;
                }
            }
        }
        return false;
    };
    PhaserAnimatedEntity.prototype.addSprite = function (key) {
        if (this.useTexturePack(key)) {
            return this.scene.add.sprite(0, 0, 'pack-result', key);
        }
        return this.scene.add.sprite(0, 0, key);
    };
    PhaserAnimatedEntity.prototype.setTexture = function (key) {
        if (this.useTexturePack(key)) {
            return this.sprite.setTexture('pack-result', key);
        }
        return this.sprite.setTexture(key);
    };
    return PhaserAnimatedEntity;
}(PhaserEntity));
//# sourceMappingURL=PhaserAnimatedEntity.js.map