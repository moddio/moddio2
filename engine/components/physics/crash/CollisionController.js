// controller function
const CollisionController = function (a, b, res) {
	if (a.data.entity.body.type != 'dynamic') return;
	// test case for now
	if (
		!['unit', 'wall', 'projectile'].includes(a.data.entity._category) ||
		!['unit', 'wall', 'projectile'].includes(b.data.entity._category)
	)
		return;

	const b_type = b.data.entity.body.type;

	if (b_type == 'static') return dyn_static_collision(a, b, res);
	else return dyn_dyn_collision(a, b, res);
};

////////////////////////////////////////////////////////////////
////////////////   STATIC   ////////////////////////////////////
////////////////////////////////////////////////////////////////

// we will eventually be adding b as a param
const dyn_static_collision = function (a, b, res) {
	//
	switch (b.data.entity._category) {
		case 'unit':
		case 'wall':
		default:
			dyn_static_exitPosition(a, b, res.overlapV);
			dyn_static_exitVelocity(a.data.entity, res.overlapN);
	}
};

const dyn_static_exitPosition = function (a, b, overlapV) {
	// for now expect this to be very simple
	a.data.entity.translateTo(a.pos.x - overlapV.x, a.pos.y - overlapV.y, 0);
};

const dyn_static_exitVelocity = function (a_entity, overlapN) {
	//
	let aVel = new taro.physics.crash.Vector(a_entity._velocity.x, a_entity._velocity.y);
	const a_restitution = a_entity.body.fixtures[0].restitution;

	aVel = aVel.clone().sub(aVel.projectN(overlapN).scale(2));

	//apply restitution
	aVel = aVel.scale(a_restitution);

	a_entity._velocity.x = aVel.x;
	a_entity._velocity.y = aVel.y;
};

////////////////////////////////////////////////////////////////
////////////////   DYNAMIC   ///////////////////////////////////
////////////////////////////////////////////////////////////////

const dyn_dyn_collision = function (a, b, res) {
	//
	switch (b.data.entity._category) {
		case 'projectile':
		case 'unit':
		case 'item':
		default:
			dyn_dyn_exitPositions(a, b, res.overlapV);
			dyn_dyn_exitVelocities(a.data.entity, b.data.entity, res.overlapN);
	}
};

const dyn_dyn_exitPositions = function (a, b, overlapV) {
	const halfOverlapV = overlapV.clone().scale(0.5);

	b.data.entity._hasMoved = true;
	a.data.entity.translateTo(a.pos.x - halfOverlapV.x, a.pos.y - halfOverlapV.y);
	b.data.entity.translateTo(b.pos.x + halfOverlapV.x, b.pos.y + halfOverlapV.y);
};

const dyn_dyn_exitVelocities = function (a_entity, b_entity, overlapN) {
	const normal = overlapN.clone();
	const tangent = normal.clone().perp();
	let temp;

	//restitutions
	const a_restitution = a_entity.body.fixtures[0].restitution;
	const b_restitution = b_entity.body.fixtures[0].restitution;

	let aVel = new taro.physics.crash.Vector(a_entity._velocity.x, a_entity._velocity.y);
	let bVel = new taro.physics.crash.Vector(b_entity._velocity.x, b_entity._velocity.y);
	temp = aVel;

	aVel = bVel.clone().projectN(normal).add(aVel.clone().projectN(tangent));
	bVel = temp.clone().projectN(normal).add(bVel.clone().projectN(tangent));

	//apply restitutions
	aVel = aVel.scale(a_restitution);
	bVel = bVel.scale(b_restitution);

	a_entity._velocity.x = aVel.x;
	a_entity._velocity.y = aVel.y;

	b_entity._velocity.x = bVel.x;
	b_entity._velocity.y = bVel.y;
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = CollisionController;
}
