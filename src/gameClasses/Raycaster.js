var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var Raycaster = /** @class */ (function () {
    function Raycaster() {
        this.engine = ige.physics.engine;
        this.world = ige.physics.world();
        this.scaleRatio = ige.physics._scaleRatio;
        this.data = {};
        this.closest = RayCastClosest;
        this.multiple = RayCastMultiple;
        // BOX2DWEB (callback, start, end)
        // PLANCK (start, end, callback)
    }
    Raycaster.prototype.raycast = function (start, end, config) {
        var callback, reset;
        this.data = {};
        switch (config.method) {
            case 'closest':
                this.data = this[config.method];
                reset = this.data.reset;
                callback = this.data.callback;
                break;
            case 'multiple':
                this.data = this[config.method];
                reset = this.data.reset;
                callback = this.data.callback;
                break;
        }
        reset();
        this.world.rayCast(start, end, callback);
        // leaning towards having this list exist on the item or both
        if (config.method === 'multiple') {
            this.sortHits();
            ige.game.entitiesCollidingWithLastRaycast = this.data.entities;
        }
        else if (config.method === 'closest') {
            ige.game.entitiesCollidingWithLastRaycast = [this.data.entity];
        }
        if (ige.isClient) {
            end = (config.method === 'closest' && this.data.point) ?
                {
                    x: this.data.point.x * this.scaleRatio,
                    y: this.data.point.y * this.scaleRatio
                } :
                {
                    x: end.x * this.scaleRatio,
                    y: end.y * this.scaleRatio
                };
            this.drawRay(start, end, __assign(__assign({}, config), { fraction: this.data.fraction }));
        }
    };
    Raycaster.prototype.sortHits = function () {
        this.data.entities = _.orderBy(this.data.entities, ['raycastFraction'], ['asc']);
    };
    Raycaster.prototype.drawRay = function (start, end, config) {
        ige.client.emit('create-ray', {
            start: {
                x: start.x * this.scaleRatio,
                y: start.y * this.scaleRatio
            },
            end: end,
            config: config
        });
    };
    return Raycaster;
}());
var RayCastClosest = (function () {
    var def;
    def = {};
    def.reset = function () {
        def.hit = false;
        def.point = null;
        def.normal = null;
        def.entity = null;
        def.fraction = 1;
    };
    def.callback = function (fixture, point, normal, fraction) {
        var fixtureList = fixture.m_body.m_fixtureList;
        var entity = fixtureList && fixtureList.igeId && ige.$(fixtureList.igeId);
        if (entity) {
            entity.lastRaycastCollisionPosition = {
                x: point.x * ige.physics._scaleRatio,
                y: point.y * ige.physics._scaleRatio
            };
            entity.raycastFraction = fraction;
            def.entity = entity;
        }
        def.hit = true;
        def.point = point;
        def.normal = normal;
        def.fraction = fraction;
        // By returning the current fraction, we instruct the calling code to clip the ray and
        // continue the ray-cast to the next fixture. WARNING: do not assume that fixtures
        // are reported in order. However, by clipping, we can always get the closest fixture.
        return fraction;
    };
    return def;
})();
var RayCastMultiple = (function () {
    var def;
    def = {};
    // var raycastCollidesWith = self._stats.raycastCollidesWith; // outdated?
    def.points = [];
    def.normals = [];
    def.entities = [];
    def.reset = function () {
        def.points = [];
        def.normals = [];
        def.entities = [];
    };
    def.callback = function (fixture, point, normal, fraction) {
        var fixtureList = fixture.m_body.m_fixtureList;
        var entity = fixtureList && fixtureList.igeId && ige.$(fixtureList.igeId);
        if (entity) {
            entity.lastRaycastCollisionPosition = {
                x: point.x * ige.physics._scaleRatio,
                y: point.y * ige.physics._scaleRatio
            };
            entity.raycastFraction = fraction;
            def.entities.push(entity);
        }
        def.points.push(point);
        def.normals.push(normal);
        // By returning 1, we instruct the caller to continue without clipping the
        // ray.
        return 1.0;
    };
    return def;
})();
if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
    module.exports = Raycaster;
}
//# sourceMappingURL=Raycaster.js.map