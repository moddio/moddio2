# Old implementations of physics in collision listener

```js
let aVelVec, bVelVec;

const dyn_dyn_exitVelocities = function (aEntity, bEntity, overlapN) {
	const normal = overlapN.clone();
	const tangent = normal.clone().perp();
	let temp;

	let aVel = new taro.physics.simulation.crash.Vector(aEntity._velocity.x, aEntity._velocity.y);
	let bVel = new taro.physics.simulation.crash.Vector(bEntity._velocity.x, bEntity._velocity.y);
	temp = aVel;
	// const aVel_n = bVel.clone().projectN(normal);
	// const aVel_t = aVel.clone().projectN(tangent);

	// const bVel_n = aVel.clone().projectN(normal);
	// const bVel_t = bVel.clone().projectN(tangent);

	// aVel = aVel_n.add(aVel_t);
	// bVel = bVel_n.add(bVel_t);
	// // this will save memory
	aVel = bVel.clone().projectN(normal).add(aVel.clone().projectN(tangent));
	bVel = temp.clone().projectN(normal).add(bVel.clone().projectN(tangent));

	const aRestitution = aEntity.body.fixtures[0].restitution;
	const bRestitution = bEntity.body.fixtures[0].restitution;

	aEntity._velocity.x = aVel.x * aRestitution;
	aEntity._velocity.y = aVel.y * aRestitution;

	bEntity._velocity.x = bVel.x * bRestitution;
	bEntity._velocity.y = bVel.y * bRestitution;
};

const dyn_static_exitVelocity = function (aEntity, overlapN) {
	let aVel = new taro.physics.simulation.crash.Vector(aEntity._velocity.x, aEntity._velocity.y);

	// aVelVec = aVelVec.sub(res.overlapN.clone().scale((aVelVec.dot(res.overlapN))));
	aVel = aVel.clone().sub(aVel.projectN(overlapN).scale(2));

	const aRestitution = aEntity.body.fixtures[0].restitution;

	aEntity._velocity.x = aVel.x * aRestitution;
	aEntity._velocity.y = aVel.y * aRestitution;
};

const listener = function (a, b, res, cancel) {
	if (a.data.entity._category != 'unit' && a.data.entity._category != 'projectile') return;
	if (b.data.entity._category != 'item' && b.data.entity._category != 'region' && b.data.entity._category != 'sensor') {
		//
		if (b.data.entity.body.type == 'static') {
			a.pos = a.sat.pos = a.sat.pos.sub(res.overlapV);
			a.data.entity._translate.x = a.pos.x;
			a.data.entity._translate.y = a.pos.y;
			/*if (a.data.entity._category == 'unit') {
    a.data.entity._velocity.x = 0;
    a.data.entity._velocity.y = 0;
   }
   else if (a.data.entity._category == 'projectile') {
    a.data.entity._velocity.x = -a.data.entity._velocity.x;
    a.data.entity._velocity.y = -a.data.entity._velocity.y;
   }*/
			dyn_static_exitVelocity(a.data.entity, res.overlapN);
		} /*if (b.data.entity._category == 'unit' || b.data.entity._category == 'projectile')*/ else {
			//
			// new consideration, if we are going to use entity._velocity,
			// let's convert it to a SAT.Vector
			// aVelVec = new taro.physics.simulation.crash.Vector(a.data.entity._velocity.x, a.data.entity._velocity.y);
			// bVelVec = new taro.physics.simulation.crash.Vector(b.data.entity._velocity.x, b.data.entity._velocity.y);
			// scale the vector to 1/2
			// console.log(res);
			// console.log('overlap', res.overlapV);
			// console.log('a_Vi: ', aVelVec);
			// console.log('b_Vi: ', bVelVec);
			// console.log('b', b)
			const halfOverlapVB = res.overlapV.clone().scale(0.5);
			const halfOverlapVA = halfOverlapVB.clone().reverse();

			// console.log(a.data.taroId, b.data.taroId);
			// remember this overlapV is defined as if 'a' is the acting body
			// so we subtract from 'a' and add to 'b'
			// added 'moveByVec' to crash. It adds a vector to Collider.pos

			// communicate this translation to the entities
			// a.data.entity._translate.x = a.pos.x;
			// a.data.entity._translate.y = a.pos.y;
			// b.data.entity._translate.x = b.pos.x;
			// b.data.entity._translate.y = b.pos.y;

			// console.log('Overlap normal from A: ', res.overlapN);

			b.data.entity._hasMoved = true;
			a.data.entity.translateTo(a.pos.x + halfOverlapVA.x, a.pos.y + halfOverlapVA.y);
			b.data.entity.translateTo(b.pos.x + halfOverlapVB.x, b.pos.y + halfOverlapVB.y);
			// cancel();
			// const appliedAngle = Math.atan2(res.overlapN.y, res.overlapN.x);
			// console.log('appliedAngle: ', appliedAngle);
			// console.log('Math.PI % Math.abs(appliedAngle): ', round((Math.PI * 2) % Math.abs(appliedAngle)));
			// Math.abs(appliedAngle) >= ANGLE_MINIMUM &&
			// if ((Math.PI * 2) % Math.abs(appliedAngle) !== 0) {

			//  b.data.entity.rotateTo(0, 0, -(Math.atan2(res.overlapN.y, res.overlapN.x) + (Math.PI / 2)));
			//  // console.log('Applying angle to... ', b.data.taroId, round(Math.atan2(res.overlapN.y, res.overlapN.x) + (Math.PI / 2)), '\n');
			// } else {
			//  // console.log('Not applying this angle to b... ', round(Math.atan2(res.overlapN.y, res.overlapN.x) + (Math.PI / 2)), '\n');
			// }

			// zero the velocities for now
			// this will change when we add mass/force
			/*a.data.entity._velocity.x = 0;
   a.data.entity._velocity.y = 0;*/

			//if (!b.disable) {
			//const vRelativeVelocity = {x: a.data.entity._velocity.x - b.data.entity._velocity.x, y: a.data.entity._velocity.y - b.data.entity._velocity.y};
			//const speed = vRelativeVelocity.x * res.overlapN.x + vRelativeVelocity.y * res.overlapN.y;
			//a.data.entity._velocity.x -= (speed * res.overlapN.x) * 2;
			//a.data.entity._velocity.y -= (speed * res.overlapN.y) * 2;
			//b.data.entity._velocity.x += (speed * res.overlapN.x) * 2;
			//b.data.entity._velocity.y += (speed * res.overlapN.y) * 2;

			/* a.disable = true;
    b.disable = true;
   }*/

			//b.data.entity._velocity.x += a.data.entity._velocity.x/2;
			//b.data.entity._velocity.y += a.data.entity._velocity.y/2;
			dyn_dyn_exitVelocities(a.data.entity, b.data.entity, res.overlapN);
		}

		//a.data.entity._velocity.x -= a.data.entity._velocity.x * 2;
		//a.data.entity._velocity.y -= a.data.entity._velocity.y * 2;
	}
};

/*else if (b.data.entity._category == 'sensor') {
    console.log('sensor');
}*/
/*else {
    console.log('enter region player pos', a.pos.x, a.pos.y)
} */
```
