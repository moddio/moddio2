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
    static log(msg, type) {
        console.log(msg, type);
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('..........................................');
            this.simulation = new Box2dComponent(this._entity, this._options);
            yield this.simulation.load();
            this._callback();
            yield RAPIER.init();
            let gravity = { x: 0.0, y: -9.81, z: 0.0 };
            let world = new RAPIER.World(gravity);
            this.world = world;
            // Create the ground
            let groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0);
            world.createCollider(groundColliderDesc);
            // Create a dynamic rigid-body.
            let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0.0, 1.0, 0.0);
            let rigidBody = world.createRigidBody(rigidBodyDesc);
            // Create a cuboid collider attached to the dynamic rigidBody.
            let colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
            let collider = world.createCollider(colliderDesc, rigidBody);
            console.log(world);
            // Game loop. Replace by your own game loop system.
            let gameLoop = () => {
                // Ste the simulation forward.
                world.step();
                // Get and print the rigid-body's position.
                let position = rigidBody.translation();
                console.log('Rigid-body position: ', position.x, position.y, position.z);
                setTimeout(gameLoop, 16);
            };
            gameLoop();
        });
    }
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = PhysicsComponent;
}
//# sourceMappingURL=PhysicsComponent.js.map