class TaroEntityPhysics3d extends TaroEntity {
	classId: string = 'TaroEntityPhysics3d';
	rigidBody: RAPIER.RigidBody | null;
	scaleRatio: number = 30;

	constructor(defaultData: any = {}) {
		super();
		// TaroEntity.prototype.init.call(this, defaultData)
		this.rigidBody = null;
	}

	updateBody(defaultData): void {
		let body = this._stats.currentBody;

		if (!body) return;
		if (body.type === 'none' || (body.type === 'spriteOnly' && this.rigidBody)) {
			this.destroyBody();
			return;
		}

		let rigidBodyDesc: RAPIER.RigidBodyDesc;
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

	destroyBody(): void {
		taro.physics3d.destroyBody(this.rigidBody);
		this.rigidBody = null;
	}
}

type defaultData = {
	translate: { x: number; y: number };
	rotate: number;
};
