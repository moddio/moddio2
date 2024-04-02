const voxelWrapper: PhysicsDistProps = {
	init: function (component: any): void {
		throw new Error("Function not implemented.");
	},
	getmxfp: function (body: any, self: any) {
		throw new Error("Function not implemented.");
	},
	queryAABB: function (self: any, aabb: any, callback: (...args: any) => any): void {
		throw new Error("Function not implemented.");
	},
	createBody: function (self: any, entity: any, body: any, isLossTolerant: boolean) {
		throw new Error("Function not implemented.");
	},
	createJoint: function (self: any, entityA: any, entityB: any, anchorA: any, anchorB: any): void {
		throw new Error("Function not implemented.");
	},
	contactListener: function (self: any, beginContactCallback: (contact: any) => any, endContactCallback: (contact: any) => any, preSolve: (contact: any) => any, postSolve: (contact: any) => any): void {
		throw new Error("Function not implemented.");
	}
}

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = voxelWrapper;
}
