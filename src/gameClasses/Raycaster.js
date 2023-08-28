var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var Raycaster = /** @class */ (function () {
    function Raycaster() {
        this.engine = taro.physics.engine;
        this.world = taro.physics.world();
        this.scaleRatio = taro.physics._scaleRatio;
        this.data = {};
        this.closest = RayCastClosest();
        this.multiple = RayCastMultiple();
        this.any = RaycastAny();
        this.forwardHit = false;
        this.reverseHit = false;
    }
    Raycaster.prototype.raycastLine = function (start, end) {
        // reverse
        var raycast = this.multiple;
        raycast.reset();
        this.world.rayCast(taro.physics.box2D ? new taro.physics.box2D.b2Vec2(end.x, end.y) : end, taro.physics.box2D ? new taro.physics.box2D.b2Vec2(start.x, start.y) : start, raycast.callback);
        taro.game.entitiesCollidingWithLastRaycast = _.clone(raycast.entities);
        // forward
        raycast.reset();
        this.world.rayCast(taro.physics.box2D ? new taro.physics.box2D.b2Vec2(start.x, start.y) : start, taro.physics.box2D ? new taro.physics.box2D.b2Vec2(end.x, end.y) : end, raycast.callback);
        var missedEntities = _.difference(taro.game.entitiesCollidingWithLastRaycast, raycast.entities);
        missedEntities.forEach(function (x) { return x.raycastFraction = 1 - x.raycastFraction; });
        taro.game.entitiesCollidingWithLastRaycast = __spreadArray(__spreadArray([], raycast.entities, true), missedEntities, true);
        taro.game.entitiesCollidingWithLastRaycast = this.sortHits(taro.game.entitiesCollidingWithLastRaycast);
        //debug
        // console.log(taro.game.entitiesCollidingWithLastRaycast.map(x=> `${x.id()} ${x._category} ${x.raycastFraction}`));
    };
    Raycaster.prototype.raycastBullet = function (start, end) {
        var _a;
        // forward
        var forwardRaycast = this.closest;
        forwardRaycast.reset();
        this.world.rayCast(taro.physics.box2D ? new taro.physics.box2D.b2Vec2(start.x, start.y) : start, taro.physics.box2D ? new taro.physics.box2D.b2Vec2(end.x, end.y) : end, forwardRaycast.callback // though it is currently hard-coded for 'Closest'
        );
        taro.game.entitiesCollidingWithLastRaycast = forwardRaycast.entity ? [forwardRaycast.entity] : [];
        this.forwardHit = true;
        var point = (_a = forwardRaycast.point) !== null && _a !== void 0 ? _a : end;
        var fraction = forwardRaycast.fraction;
        // reverse
        var reverseRaycast = this.any;
        reverseRaycast.reset();
        this.world.rayCast(taro.physics.box2D ? new taro.physics.box2D.b2Vec2(point.x, point.y) : point, taro.physics.box2D ? new taro.physics.box2D.b2Vec2(start.x, start.y) : start, reverseRaycast.callback);
        if (reverseRaycast.hit) {
            // we were obstructed when shooting
            this.reverseHit = true;
            taro.game.entitiesCollidingWithLastRaycast = [];
        }
        var bulletReturn = {
            start: start,
            point: point,
            fraction: fraction,
            obstructed: this.forwardHit === this.reverseHit
        };
        this.forwardHit = false;
        this.reverseHit = false;
        return bulletReturn;
    };
    Raycaster.prototype.sortHits = function (array) {
        return array = _.orderBy(array, ['raycastFraction'], ['asc']);
    };
    Raycaster.prototype.renderBullet = function (start, end, config) {
        taro.client.emit('create-ray', {
            start: {
                x: start.x * this.scaleRatio,
                y: start.y * this.scaleRatio
            },
            end: {
                x: end.x * this.scaleRatio,
                y: end.y * this.scaleRatio
            },
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
    switch (taro.physics.engine) {
        case 'BOX2DWASM':
            var box2D = taro.physics.box2D;
            var b2Fixture_1 = box2D.b2Fixture, b2Vec2_1 = box2D.b2Vec2, JSRayCastCallback = box2D.JSRayCastCallback, wrapPointer_1 = box2D.wrapPointer;
            def.callback = Object.assign(new JSRayCastCallback(), {
                /**
                 * @param {number} fixture_p pointer to {@link Box2D.b2Fixture}
                 * @param {number} point_p pointer to {@link Box2D.b2Vec2}
                 * @param {number} normal_p pointer to {@link Box2D.b2Vec2}
                 * @param {number} fraction
                 * @returns {number} -1 to filter, 0 to terminate, fraction to clip the ray for closest hit, 1 to continue
                 */
                ReportFixture: function (fixture_p, point_p, normal_p, fraction) {
                    var fixture = wrapPointer_1(fixture_p, b2Fixture_1);
                    var point = wrapPointer_1(point_p, b2Vec2_1);
                    var normal = wrapPointer_1(normal_p, b2Vec2_1);
                    var fixtureList = fixture.GetBody().GetFixtureList();
                    var entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
                    if (entity &&
                        (entity._category === 'unit' ||
                            entity._category === 'wall')) {
                        entity.lastRaycastCollisionPosition = {
                            x: point.x * taro.physics._scaleRatio,
                            y: point.y * taro.physics._scaleRatio
                        };
                        entity.raycastFraction = fraction;
                        def.entity = entity;
                        def.hit = true;
                        def.point = point;
                        def.normal = normal;
                        def.fraction = fraction;
                        return fraction;
                    }
                    else if (entity) {
                        return -1.0;
                    }
                    return fraction;
                }
            });
            break;
        default:
            def.callback = function (fixture, point, normal, fraction) {
                var fixtureList = fixture.m_body.m_fixtureList;
                var entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
                if (entity &&
                    (entity._category === 'unit' ||
                        entity._category === 'wall')) {
                    entity.lastRaycastCollisionPosition = {
                        x: point.x * taro.physics._scaleRatio,
                        y: point.y * taro.physics._scaleRatio
                    };
                    entity.raycastFraction = fraction;
                    def.entity = entity;
                    def.hit = true;
                    def.point = point;
                    def.normal = normal;
                    def.fraction = fraction;
                    return fraction;
                }
                else if (entity) {
                    return -1.0;
                }
                return fraction;
                // By returning the current fraction, we instruct the calling code to clip the ray and
                // continue the ray-cast to the next fixture. WARNING: do not assume that fixtures
                // are reported in order. However, by clipping, we can always get the closest fixture.
            };
            break;
    }
    return def;
});
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
    switch (taro.physics.engine) {
        case 'BOX2DWASM':
            var box2D = taro.physics.box2D;
            var b2Fixture_2 = box2D.b2Fixture, b2Vec2_2 = box2D.b2Vec2, JSRayCastCallback = box2D.JSRayCastCallback, wrapPointer_2 = box2D.wrapPointer;
            def.callback = Object.assign(new JSRayCastCallback(), {
                /**
                 * @param {number} fixture_p pointer to {@link Box2D.b2Fixture}
                 * @param {number} point_p pointer to {@link Box2D.b2Vec2}
                 * @param {number} normal_p pointer to {@link Box2D.b2Vec2}
                 * @param {number} fraction
                 * @returns {number} -1 to filter, 0 to terminate, fraction to clip the ray for closest hit, 1 to continue
                 */
                ReportFixture: function (fixture_p, point_p, normal_p, fraction) {
                    var fixture = wrapPointer_2(fixture_p, b2Fixture_2);
                    var point = wrapPointer_2(point_p, b2Vec2_2);
                    var normal = wrapPointer_2(normal_p, b2Vec2_2);
                    var fixtureList = fixture.GetBody().GetFixtureList();
                    var entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
                    if (entity &&
                        (entity._category === 'unit' ||
                            entity._category === 'wall')) {
                        entity.lastRaycastCollisionPosition = {
                            x: point.x * taro.physics._scaleRatio,
                            y: point.y * taro.physics._scaleRatio
                        };
                        entity.raycastFraction = fraction;
                        def.entities.push(entity);
                    }
                    def.points.push(point);
                    def.normals.push(normal);
                    // By returning 1, we instruct the caller to continue without clipping the
                    // ray.
                    return 1.0;
                }
            });
            break;
        default:
            def.callback = function (fixture, point, normal, fraction) {
                var fixtureList = fixture.m_body.m_fixtureList;
                var entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
                if (entity &&
                    (entity._category === 'unit' ||
                        entity._category === 'wall')) {
                    entity.lastRaycastCollisionPosition = {
                        x: point.x * taro.physics._scaleRatio,
                        y: point.y * taro.physics._scaleRatio
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
            break;
    }
    return def;
});
var RaycastAny = (function () {
    var def;
    def = {};
    def.reset = function () {
        def.hit = false;
        def.point = null;
        def.normal = null;
    };
    switch (taro.physics.engine) {
        case 'BOX2DWASM':
            var box2D = taro.physics.box2D;
            var b2Fixture_3 = box2D.b2Fixture, b2Vec2_3 = box2D.b2Vec2, JSRayCastCallback = box2D.JSRayCastCallback, wrapPointer_3 = box2D.wrapPointer;
            def.callback = Object.assign(new JSRayCastCallback(), {
                /**
                 * @param {number} fixture_p pointer to {@link Box2D.b2Fixture}
                 * @param {number} point_p pointer to {@link Box2D.b2Vec2}
                 * @param {number} normal_p pointer to {@link Box2D.b2Vec2}
                 * @param {number} fraction
                 * @returns {number} -1 to filter, 0 to terminate, fraction to clip the ray for closest hit, 1 to continue
                 */
                ReportFixture: function (fixture_p, point_p, normal_p, fraction) {
                    var fixture = wrapPointer_3(fixture_p, b2Fixture_3);
                    var point = wrapPointer_3(point_p, b2Vec2_3);
                    var normal = wrapPointer_3(normal_p, b2Vec2_3);
                    var fixtureList = fixture.GetBody().GetFixtureList();
                    var entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
                    if (entity &&
                        (entity._category === 'unit' ||
                            entity._category === 'wall')) {
                        def.hit = true;
                        def.point = point;
                        def.normal = normal;
                        return 0.0;
                    }
                    else if (entity) {
                        return -1.0;
                    }
                }
            });
            break;
        default:
            def.callback = function (fixture, point, normal) {
                var fixtureList = fixture.m_body.m_fixtureList;
                var entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
                if (entity &&
                    (entity._category === 'unit' ||
                        entity._category === 'wall')) {
                    def.hit = true;
                    def.point = point;
                    def.normal = normal;
                    return 0.0;
                }
                else if (entity) {
                    return -1.0;
                }
            };
            break;
    }
    return def;
});
if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
    module.exports = Raycaster;
}
//# sourceMappingURL=Raycaster.js.map