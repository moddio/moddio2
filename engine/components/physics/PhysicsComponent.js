var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class PhysicsComponent extends TaroEventingClass {
    constructor(entity, options, callback) {
        super();
        this.classId = 'PhysicsComponent';
        this.componentId = 'physics';
        this.engine = options.engine;
        this._entity = entity;
        this._options = options;
        this._callback = callback;
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            this.simulation = this.engine === 'rapier' ? new RapierComponent() : new Box2dComponent();
            yield this.simulation.load();
            this._callback();
        });
    }
    /* CONVERT TO COMMENT BLOCKS */
    // b2d unused
    useWorker() { }
    // b2d get/set
    mode(val) {
        return !isNaN(val) ? this.simulation.mode(val) : this.simulation.mode();
    }
    // b2d get/set
    sleep(val) {
        return !isNaN(val) ? this.simulation.sleep(val) : this.simulation.sleep();
    }
    // b2d get/set
    scaleRatio(val) {
        return !isNaN(val) ? this.simulation.scaleRatio(val) : this.simulation.scaleRatio();
    }
    // b2d get/set
    tilesizeRatio(val) {
        return !isNaN(val) ? this.simulation.tilesizeRatio(val) : this.simulation.tilesizeRatio();
    }
    // b2d get
    world() {
        return this.simulation.world();
    }
    // b2d create fixture from params and fixture def
    createFixture(params) {
        return this.simulation.createFixture(params);
    }
    // b2d create body from definition and assign it to provided entity
    createBody(entity, body, isLossTolerant) {
        this.simulation.createBody(entity, body, isLossTolerant || false);
    }
    // b2d destroy body and remove it from entity
    destroyBody(entity, body) {
        this.simulation.destroyBody(entity, body);
    }
    // b2d unused
    createJoint() { }
    // b2d unused
    destroyJoint() { }
    // b2d check rectangle for entities
    getBodiesInRegion(region) {
        return this.simulation.getBodiesInRegion(region);
    }
    // b2d create physics bodies for map walls
    staticsFromMap(mapLayer, callback) {
        this.simulation.staticsFromMap(mapLayer, callback);
    }
    // b2d destroy all walls
    destroyWalls() {
        this.simulation.destroyWalls();
    }
    // b2d assign callbacks for different parts of a contact's lifetime
    contactListener(beginContact, endContact, preSolve, postSolve) {
        this.simulation.contactListener(beginContact, endContact, preSolve, postSolve);
    }
    // b2d get/set - disable collision generation for the world
    networkDebugMode(val) {
        return val == undefined ? this.simulation.networkDebugMode() : this.simulation.networkDebugMode(val);
    }
    // b2d (except planck) enable physics debug draw graphics
    enableDebug(mountScene) {
        this.simulation.enableDebug(mountScene);
    }
    // b2d get/set callback for every physics world step
    updateCallback(callback) {
        return callback ? this.simulation.updateCallback(callback) : this.simulation.updateCallback();
    }
    // b2d
    start() {
        this.simulation.start();
    }
    // b2d
    stop() {
        this.simulation.stop();
    }
    // b2d add physics actions to the engine's queue
    queueAction(action) {
        this.simulation.queueAction(action);
    }
    // b2d core simulation update method
    // stepped by TaroEngine
    update(dt) {
        this.simulation.update(dt);
    }
    // b2d destroy physics simulation
    destroy() {
        this.simulation.destroy();
    }
    // b2d call engine script triggers on contact begin
    _triggerContactEvent(entityA, entityB) {
        this.simulation._triggerContactEvent(entityA, entityB);
    }
    // b2d call engine script triggers on contact end
    _triggerLeaveEvent(entityA, entityB) {
        this.simulation._triggerLeaveEvent(entityA, entityB);
    }
    // b2d taro callback for beginning of a contact
    _beginContactCallback(contact) {
        this.simulation._beginContactCallback(contact);
    }
    // b2d taro callback for end of a contact
    _endContactCallback(contact) {
        this.simulation._endContactCallback(contact);
    }
    // b2d adds taro contact callbacks via contactListener
    _enableContactListener() {
        this.simulation._enableContactListener();
    }
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = PhysicsComponent;
}
//# sourceMappingURL=PhysicsComponent.js.map