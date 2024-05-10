var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class RapierComponent extends TaroEventingClass {
    // scaleRatio = 30;
    //
    constructor() {
        // core functionality / inherited
        super();
        // TODO: discern 2d/3d in engine and serve sources dynamically
        //		 so we can name these physics
        this.classId = 'RapierComponent';
        // engine will always be rapier
        this.engine = 'RAPIER';
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            yield RAPIER.init();
            // decide whether to init with Vector3.Zero or default earth gravity
            this.world3d = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
        });
    }
    destroyBody3d(body) {
        // from docs World.removeRigidBody()
        // This will remove this rigid-body as well as all its attached colliders
        // and joints. Every other bodies touching or attached by joints to this
        // rigid-body will be woken-up.
        this.world3d.removeRigidBody(body);
    }
    useWorker(...args) { }
    mode(...args) { }
    sleep(...args) { }
    scaleRatio(...args) { }
    tilesizeRatio(...args) { }
    world(...args) { }
    createFixture(...args) { }
    createBody(...args) { }
    destroyBody(...args) { }
    createJoint(...args) { }
    destroyJoint(...args) { }
    getBodiesInRegion(...args) { }
    staticsFromMap(...args) { }
    destroyWalls(...args) { }
    contactListener(...args) { }
    networkDebugMode(...args) { }
    enableDebug(...args) { }
    updateCallback(...args) { }
    start(...args) { }
    stop(...args) { }
    queueAction(...args) { }
    update(...args) { }
    destroy(...args) { }
    _triggerContactEvent(...args) { }
    _triggerLeaveEvent(...args) { }
    _beginContactCallback(...args) { }
    _endContactCallback(...args) { }
    _enableContactListener(...args) { }
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = RapierComponent;
}
//# sourceMappingURL=RapierComponent.js.map