type bulletReturn = {
	start: {
		x: number,
		y: number
	},

	point: {
		x: number,
		y: number
	},

	fraction: number,
	obstructed: boolean
}

class Raycaster {
	engine = taro.physics.engine;
	world = taro.physics.world();
	scaleRatio = taro.physics._scaleRatio;

	data: any = {};
	closest = RayCastClosest();
	multiple = RayCastMultiple();
	any = RaycastAny();

	forwardHit = false;
	reverseHit = false;

	raycastLine(
		start: {
			x: number,
			y: number,
		},
		end: {
			x: number,
			y: number
		},
	): void {
		// reverse
		const raycast = this.multiple;
		raycast.reset();
		this.world.rayCast(
			taro.physics.box2D ? new taro.physics.box2D.b2Vec2(end.x, end.y) : end,
			taro.physics.box2D ? new taro.physics.box2D.b2Vec2(start.x, start.y) : start,
			raycast.callback
		);

		taro.game.entitiesCollidingWithLastRaycast = _.clone(raycast.entities);

		// forward
		raycast.reset();
		this.world.rayCast(
			taro.physics.box2D ? new taro.physics.box2D.b2Vec2(start.x, start.y) : start,
			taro.physics.box2D ? new taro.physics.box2D.b2Vec2(end.x, end.y) : end,
			raycast.callback
		);

		const missedEntities = _.difference(taro.game.entitiesCollidingWithLastRaycast, raycast.entities);
		missedEntities.forEach(x => x.raycastFraction = 1 - x.raycastFraction);

		taro.game.entitiesCollidingWithLastRaycast = [...raycast.entities, ...missedEntities];

		taro.game.entitiesCollidingWithLastRaycast = this.sortHits(taro.game.entitiesCollidingWithLastRaycast);

		//debug
		// console.log(taro.game.entitiesCollidingWithLastRaycast.map(x=> `${x.id()} ${x._category} ${x.raycastFraction}`));
	}

	raycastBullet(
		start: {
			x: number,
			y: number,
		},
		end: {
			x: number,
			y: number
		}
	): bulletReturn {
		// forward
		const forwardRaycast = this.closest;
		forwardRaycast.reset();
		this.world.rayCast(
			taro.physics.box2D ? new taro.physics.box2D.b2Vec2(start.x , start.y) : start,
			taro.physics.box2D ? new taro.physics.box2D.b2Vec2(end.x, end.y) : end,
			forwardRaycast.callback // though it is currently hard-coded for 'Closest'
		);
		taro.game.entitiesCollidingWithLastRaycast = forwardRaycast.entity ? [forwardRaycast.entity] : [];
		this.forwardHit = true;

		const point = forwardRaycast.point ?? end;
		const fraction = forwardRaycast.fraction;

		// reverse
		const reverseRaycast = this.any;

		reverseRaycast.reset();
		this.world.rayCast(
			taro.physics.box2D ? new taro.physics.box2D.b2Vec2(point.x, point.y) : point,
			taro.physics.box2D ? new taro.physics.box2D.b2Vec2(start.x, start.y) : start,
			reverseRaycast.callback
		);

		if (reverseRaycast.hit) {
			// we were obstructed when shooting
			this.reverseHit = true;
			taro.game.entitiesCollidingWithLastRaycast = [];
		}

		const bulletReturn = {
			start,
			point,
			fraction,
			obstructed: this.forwardHit === this.reverseHit
		};

		this.forwardHit = false;
		this.reverseHit = false;

		return bulletReturn;
	}

	sortHits(array: TaroEntity[]): TaroEntity[] {
		return array = _.orderBy(array, ['raycastFraction'], ['asc']);
	}

	renderBullet(
		start: { x: number, y: number },
		end: { x: number, y: number },
		config: { color: number, projType: string, fraction: number, rotation: number }

	): void {
		taro.client.emit('create-ray', {
			start: {
				x: start.x * this.scaleRatio,
				y: start.y * this.scaleRatio
			},
			end: {
				x: end.x * this.scaleRatio,
				y: end.y * this.scaleRatio
			},
			config
		});
	}
}

const RayCastClosest = (function () {
	let def: any;
	def = {};
	def.reset = function () {
		def.hit = false;
		def.point = null;
		def.normal = null;
		def.entity = null;
		def.fraction = 1;
	};
	switch (taro.physics.engine) {
		case 'BOX2DWASM':
			const box2D = taro.physics.box2D;
			const { b2Fixture, b2Vec2, JSRayCastCallback, wrapPointer } = box2D;
			def.callback = Object.assign(new JSRayCastCallback(), {
				/**
				 * @param {number} fixture_p pointer to {@link Box2D.b2Fixture}
				 * @param {number} point_p pointer to {@link Box2D.b2Vec2}
				 * @param {number} normal_p pointer to {@link Box2D.b2Vec2}
				 * @param {number} fraction
				 * @returns {number} -1 to filter, 0 to terminate, fraction to clip the ray for closest hit, 1 to continue
				 */
				ReportFixture: (fixture_p, point_p, normal_p, fraction) => {
					const fixture = wrapPointer(fixture_p, b2Fixture);
					const point = wrapPointer(point_p, b2Vec2);
					const normal = wrapPointer(normal_p, b2Vec2);
					const fixtureList: Box2D.b2Fixture & { taroId?: number } = fixture.GetBody().GetFixtureList();
					const entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
					if (
						entity &&
						(
							entity._category === 'unit' ||
							entity._category === 'wall'
						)
					) {
						entity.lastRaycastCollisionPosition = {
							x: point.x * taro.physics._scaleRatio,
							y: point.y * taro.physics._scaleRatio
						};

						entity.raycastFraction = fraction;
						def.entity = entity;

						def.hit = true;
						def.point = point;
						def.normal = normal;
						def.fraction = fraction;

						return fraction;

					} else if (entity) {
						return -1.0;
					}

					return fraction;
				}
			});

			break;
		default:
			def.callback = function (fixture, point, normal, fraction) {
				var fixtureList = fixture.m_body.m_fixtureList;
				var entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
				if (
					entity &&
					(
						entity._category === 'unit' ||
						entity._category === 'wall'
					)
				) {
					entity.lastRaycastCollisionPosition = {
						x: point.x * taro.physics._scaleRatio,
						y: point.y * taro.physics._scaleRatio
					};

					entity.raycastFraction = fraction;
					def.entity = entity;

					def.hit = true;
					def.point = point;
					def.normal = normal;
					def.fraction = fraction;

					return fraction;

				} else if (entity) {
					return -1.0;
				}

				return fraction;

				// By returning the current fraction, we instruct the calling code to clip the ray and
				// continue the ray-cast to the next fixture. WARNING: do not assume that fixtures
				// are reported in order. However, by clipping, we can always get the closest fixture.

			};
			break;
	}


	return def;
});

const RayCastMultiple = (function () {
	let def: any;
	def = {};

	// var raycastCollidesWith = self._stats.raycastCollidesWith; // outdated?
	def.points = [];
	def.normals = [];
	def.entities = [];

	def.reset = function () {
		def.points = [];
		def.normals = [];
		def.entities = [];
	};

	switch (taro.physics.engine) {
		case 'BOX2DWASM':
			const box2D = taro.physics.box2D;
			const { b2Fixture, b2Vec2, JSRayCastCallback, wrapPointer } = box2D;
			def.callback = Object.assign(new JSRayCastCallback(), {
				/**
				 * @param {number} fixture_p pointer to {@link Box2D.b2Fixture}
				 * @param {number} point_p pointer to {@link Box2D.b2Vec2}
				 * @param {number} normal_p pointer to {@link Box2D.b2Vec2}
				 * @param {number} fraction
				 * @returns {number} -1 to filter, 0 to terminate, fraction to clip the ray for closest hit, 1 to continue
				 */
				ReportFixture: (fixture_p, point_p, normal_p, fraction) => {
					const fixture = wrapPointer(fixture_p, b2Fixture);
					const point = wrapPointer(point_p, b2Vec2);
					const normal = wrapPointer(normal_p, b2Vec2);
					const fixtureList: Box2D.b2Fixture & { taroId?: number } = fixture.GetBody().GetFixtureList();
					const entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
					if (
						entity &&
						(
							entity._category === 'unit' ||
							entity._category === 'wall'
						)
					) {
						entity.lastRaycastCollisionPosition = {
							x: point.x * taro.physics._scaleRatio,
							y: point.y * taro.physics._scaleRatio
						};

						entity.raycastFraction = fraction;
						def.entities.push(entity);
					}

					def.points.push(point);
					def.normals.push(normal);
					// By returning 1, we instruct the caller to continue without clipping the
					// ray.
					return 1.0;
				}
			});

			break;
		default:
			def.callback = function (fixture, point, normal, fraction) {

				var fixtureList = fixture.m_body.m_fixtureList;
				var entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
				if (
					entity &&
					(
						entity._category === 'unit' ||
						entity._category === 'wall'
					)
				) {
					entity.lastRaycastCollisionPosition = {
						x: point.x * taro.physics._scaleRatio,
						y: point.y * taro.physics._scaleRatio
					};

					entity.raycastFraction = fraction;
					def.entities.push(entity);
				}

				def.points.push(point);
				def.normals.push(normal);
				// By returning 1, we instruct the caller to continue without clipping the
				// ray.
				return 1.0;
			};
			break;
	}

	return def;
});

const RaycastAny = (function () {
	let def: any;
	def = {};

	def.reset = function () {
		def.hit = false;
		def.point = null;
		def.normal = null;
	};

	switch (taro.physics.engine) {
		case 'BOX2DWASM':
			const box2D = taro.physics.box2D;
			const { b2Fixture, b2Vec2, JSRayCastCallback, wrapPointer } = box2D;
			def.callback = Object.assign(new JSRayCastCallback(), {
				/**
				 * @param {number} fixture_p pointer to {@link Box2D.b2Fixture}
				 * @param {number} point_p pointer to {@link Box2D.b2Vec2}
				 * @param {number} normal_p pointer to {@link Box2D.b2Vec2}
				 * @param {number} fraction
				 * @returns {number} -1 to filter, 0 to terminate, fraction to clip the ray for closest hit, 1 to continue
				 */
				ReportFixture: (fixture_p, point_p, normal_p, fraction) => {
					const fixture = wrapPointer(fixture_p, b2Fixture);
					const point = wrapPointer(point_p, b2Vec2);
					const normal = wrapPointer(normal_p, b2Vec2);
					const fixtureList: Box2D.b2Fixture & { taroId?: number } = fixture.GetBody().GetFixtureList();
					const entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
					if (
						entity &&
						(
							entity._category === 'unit' ||
							entity._category === 'wall'
						)
					) {

						def.hit = true;
						def.point = point;
						def.normal = normal;

						return 0.0;

					} else if (entity) {
						return -1.0;
					}
				}
			});

			break;
		default:
			def.callback = function (fixture, point, normal) {

				var fixtureList = fixture.m_body.m_fixtureList;
				var entity = fixtureList && fixtureList.taroId && taro.$(fixtureList.taroId);
				if (
					entity &&
					(
						entity._category === 'unit' ||
						entity._category === 'wall'
					)
				) {

					def.hit = true;
					def.point = point;
					def.normal = normal;

					return 0.0;

				} else if (entity) {
					return -1.0;
				}

			};
			break;
	}

	return def;
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = Raycaster;
}
