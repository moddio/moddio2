class TaroEntityPhysics3d extends TaroEntity {
    constructor(defaultData = {}) {
        super();
        this.classId = 'TaroEntityPhysics3d';
        this.scaleRatio = 30;
        // TaroEntity.prototype.init.call(this, defaultData)
        this.rigidBody = null;
    }
    updateBody(defaultData) {
        let body = this._stats.currentBody;
        if (!body)
            return;
        if (body.type === 'none' || (body.type === 'spriteOnly' && this.rigidBody)) {
            this.destroyBody();
            return;
        }
        let rigidBodyDesc;
        switch (this._stats.currentBody.type) {
            case 'dynamic':
                rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
                break;
            case 'static':
                rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
                break;
            default:
                return console.error('no valid type was set for the rigid body description');
        }
        this.rigidBody = taro.physics3d.world.createRigidBody(rigidBodyDesc);
    }
    destroyBody() {
        taro.physics3d.destroyBody(this.rigidBody);
        this.rigidBody = null;
    }
}
//# sourceMappingURL=TaroEntityPhysics3d.js.map