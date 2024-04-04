const aabb = require('aabb-3d')
const vec3 = require('gl-vec3')

var DEBUG = 0



/*
 *    RIGID BODY - internal data structure
 *  Only AABB bodies right now. Someday will likely need spheres?
*/

class RigidBody {
	constructor(_aabb, mass, friction, restitution, gravMult, onCollide, autoStep) {
		this.aabb = new aabb(_aabb.base, _aabb.vec) // clone
		this.mass = mass
		this.friction = friction
		this.restitution = restitution
		this.gravityMultiplier = gravMult
		this.onCollide = onCollide
		this.autoStep = !!autoStep
		this.airDrag = -1   // overrides global airDrag when >= 0
		this.fluidDrag = -1 // overrides global fluidDrag when >= 0
		this.onStep = null

		// internal state
		this.velocity = vec3.fromValues(0, 0, 0)
		this.resting = [0, 0, 0]
		this.inFluid = false

		// internals
		/** @internal */
		this._ratioInFluid = 0
		/** @internal */
		this._forces = vec3.fromValues(0, 0, 0)
		/** @internal */
		this._impulses = vec3.fromValues(0, 0, 0)
		/** @internal */
		this._sleepFrameCount = 10 | 0
	}

	setPosition(p) {
		// let pos = p;
		// if (typeof p === 'object' && !Array.isArray(p)) {
		// 	pos = vec3.fromValues(p.x, 3, p.y)
		// }
		// sanityCheck(pos)
		// vec3.subtract(pos, pos, this.aabb.base)
		// this.aabb.translate(pos)
		// this._markActive()
	}

	getPosition() {
		return vec3.clone(this.aabb.base)
	}

	setAngle() {

	}

	setAwake() {

	}

	setLinearVelocity(v) {
		vec3.set(this.velocity, v.x, v.y, v.z)
	}

	applyForce(f) {
		sanityCheck(f)
		vec3.add(this._forces, this._forces, f)
		this._markActive()
	}
	applyImpulse(i) {
		sanityCheck(i)
		vec3.add(this._impulses, this._impulses, i)
		this._markActive()
	}

	/** @internal */
	_markActive() {
		this._sleepFrameCount = 10 | 0
	}



	// temp
	atRestX() { return this.resting[0] }
	atRestY() { return this.resting[1] }
	atRestZ() { return this.resting[2] }
}




var sanityCheck = (v) => { }
if (DEBUG) sanityCheck = (v) => {
	if (isNaN(vec3.length(v))) throw 'Vector with NAN: ' + v
}

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = RigidBody;
}
