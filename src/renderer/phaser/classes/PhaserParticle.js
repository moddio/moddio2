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
var PhaserParticle = /** @class */ (function (_super) {
    __extends(PhaserParticle, _super);
    function PhaserParticle(scene, particle) {
        var _this = this;
        var particleData = taro.game.data.particleTypes[particle.particleId];
        //@ts-ignore //there seems to be an issue with phaser's type def for particleEmitter
        _this = _super.call(this, scene, particle.position.x, particle.position.y, "particle/".concat(particleData.url), PhaserParticle.createConfig(scene, particleData, particle.angle)) || this;
        if (particle.entityId) {
            var entity = scene.findEntity(particle.entityId);
            if (entity) {
                entity.attachedParticles.push(_this);
                _this.startFollow(entity.gameObject);
            }
        }
        _this.setDepth(particleData["z-index"].depth);
        _this.on('complete', function (emitter) { emitter.destroy(); });
        scene.entityLayers[particleData["z-index"].layer - 1].add(_this);
        return _this;
    }
    PhaserParticle.createConfig = function (scene, data, angle) {
        if (data) {
            var frame = scene.textures.getFrame("particle/".concat(data.url));
            var config = {
                angle: function (particle, key, value) {
                    var direction = Math.floor(Math.random() * (data.angle.max - data.angle.min + 1) + data.angle.min) + angle;
                    particle.angle = data.fixedRotation ? 0 : direction;
                    return direction - 90;
                },
                rotate: function (particle, key, value) {
                    return value;
                },
                speed: { min: data.speed.min, max: data.speed.max },
                lifespan: data.lifeBase,
                alpha: { start: 1, end: data.deathOpacityBase },
                name: data.name,
                duration: data.duration,
                frequency: data.emitFrequency,
                scaleX: data.dimensions.width / frame.width,
                scaleY: data.dimensions.height / frame.height
            };
            if (data.emitZone && data.emitZone.x && data.emitZone.y) {
                config.emitZone = new Phaser.GameObjects.Particles.Zones.RandomZone(new Phaser.Geom.Rectangle(-data.emitZone.x / 2, -data.emitZone.y / 2, data.emitZone.x, data.emitZone.y));
            }
            ;
            return config;
        }
    };
    return PhaserParticle;
}(Phaser.GameObjects.Particles.ParticleEmitter));
//# sourceMappingURL=PhaserParticle.js.map