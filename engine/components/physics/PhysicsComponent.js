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
    // unused
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
        this.simulation.world();
    }
    createFixture() { }
    createBody() { }
    destroyBody() { }
    createJoint() { }
    destroyJoint() { }
    getBodiesInRegion() { }
    staticsFromMap() { }
    destroyWalls() { }
    contactListener() { }
    networkDebugMode() { }
    enableDebug() { }
    updateCallback() { }
    start() { }
    stop() { }
    queueAction() { }
    update() { }
    destroy() { }
    _triggerContactEvent() { }
    _triggerLeaveEvent() { }
    _beginContactCallback() { }
    _endContactCallback() { }
    _enableContactListener() { }
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = PhysicsComponent;
}
//# sourceMappingURL=PhysicsComponent.js.map