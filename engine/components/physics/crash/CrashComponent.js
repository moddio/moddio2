/*
 * The engine's crash component class.
 */

const PhysicsComponent = TaroEventingClass.extend({
	classId: 'PhysicsComponent',
	componentId: 'physics',

	init: function (entity, options) {
		this._entity = entity;
		// Check that the engine has not already started
		// as this will mess everything up if it has
		this.engine = 'CRASH';
		if (taro._state !== 0) {
			console.log('Cannot add box2d physics component to the taro instance once the engine has started!', 'error');
		}

		this.crash = new Crash();
		this.crash.rbush.toBBox = function (item) {
			item.minX = item.aabb.x1;
			item.minY = item.aabb.y1;
			item.maxX = item.aabb.x2;
			item.maxY = item.aabb.y2;

			return item;
		};

		this.crash.SAT = Crash.SAT;
		this.crash.Vector = Crash.SAT.Vector;
		this.crash.Response = Crash.SAT.Response;
		this.crash.cancel = function () {
			this.BREAK = true;
			return false;
		};

		this.totalBodiesCreated = 0;
		this.physicsTickDuration = 0;
		this.lastSecondAt = Date.now();
		this.totalDisplacement = 0;
		this.totalTimeElapsed = 0;
		this.avgPhysicsTickDuration = 0;

		// we should consider moving all of our collision listeners outside of the Component
		const contactDetails = function (a, b, res, cancel) {
			// since I removed triggerComponent, you'll have to move contact callback function inside crashComponent.
			// taro.trigger._beginContactCallback({
			// 	m_fixtureA: {
			// 		m_body: {
			// 			_entity: a.data.entity,
			// 		}
			// 	},
			// 	m_fixtureB: {
			// 		m_body: {
			// 			_entity: b.data.entity,
			// 		}
			// 	}
			// });
		};

		this.crash.onCollision(CollisionController);
		this.crash.onCollision(contactDetails);
	},

	createWorld: function () {
		console.log('create world');
		this._world = {};
		this._world.m_stack = [];
		this._world.m_bodies = [];
		this._world.m_contacts = [];
		this._world.m_joints = [];
		this._world.isLocked = function () {
			return false;
		};

		//console.log('map boundaries', taro.map.data.width, taro.map.data.height)
	},

	addBorders: function () {
		// console.log('map boundaries', taro.map.data.width, taro.map.data.height);
		const borderWidth = 100;
		const mapWidth = taro.map.data.width * 64;
		const mapHeight = taro.map.data.height * 64;
		this.addBorder(borderWidth, 1, 0, 0, -borderWidth);
		this.addBorder(borderWidth, 0, 1, mapWidth, 0);
		this.addBorder(borderWidth, 1, 0, -borderWidth, mapHeight);
		this.addBorder(borderWidth, 0, 1, -borderWidth, -borderWidth);
	},

	addBorder: function (borderWidth, w, h, x, y) {
		const wallEntity = {
			_category: 'wall',
			_stats: true,
			_velocity: {
				x: 0,
				y: 0,
			},
			body: {
				type: 'static',
				fixtures: [
					{
						filter: {
							// i am
							filterCategoryBits: 0x0001,
							// i collide with everything except other walls
							filterMaskBits: 0x0002 /*| 0x0004*/ | 0x0008 | 0x0010 | 0x0020,
						},
					},
				],
			},
			id: function () {
				return 'border';
			},
		};

		const width = taro.map.data.width * 64 * w + borderWidth;
		const height = taro.map.data.height * 64 * h + borderWidth;
		const pos = new this.crash.Vector(x, y);
		crashBody = new this.crash.Box(pos, width, height, false, { entity: wallEntity });
		this.crash.insert(crashBody);
	},

	sleep: function () {
		return this._entity;
	},

	tilesizeRatio: function (foo) {
		return this._entity;
	},

	/**
	 * Creates a Box2d body and attaches it to an taro entity
	 * based on the supplied body definition.
	 * @param {TaroEntity} entity
	 * @param {Object} body the body definition
	 * @return {Collider}
	 */
	createBody: function (entity, bodyDef) {
		if (entity.crashBody) return;

		this.totalBodiesCreated++;
		const shapeType = bodyDef.fixtures[0].shape.type;

		let crashBody;
		const x = entity._translate.x;
		const y = entity._translate.y;
		//console.log('creating body', x, y);
		if (shapeType === 'circle') {
			const radius = entity._bounds2d.x / 2;
			crashBody = new this.crash.Circle(new this.crash.Vector(x, y), radius, false, { entity: entity });
			// later check if added to .__moved()
		} else if (entity._category == 'wall' || entity._category == 'region') {
			const width = entity._bounds2d.x;
			const height = entity._bounds2d.y;
			const pos = new this.crash.Vector(x, y);
			crashBody = new this.crash.Box(pos, width, height, false, { entity: entity });
		} else if (shapeType === 'rectangle') {
			const width = entity._bounds2d.x;
			const height = entity._bounds2d.y;

			// console.log('width and height', width, height, x, y, entity)
			// var points = [
			// 	new this.crash.Vector(0,0),
			// 	new this.crash.Vector(width, 0),
			// 	new this.crash.Vector(width, height),
			// 	new this.crash.Vector(0, height)
			// ];
			// crashBody = new this.crash.Polygon(new this.crash.Vector(x - (width / 2) , y - (height / 2)), points, false, { taroId: taroId, entity: entity, uid: Math.floor(Math.random() * 100) });
			// crashBody.sat.setAngle(entity._rotate.z);
			const points = [
				new this.crash.Vector(width / 2, 0 - height / 2),
				new this.crash.Vector(width / 2, height / 2),
				new this.crash.Vector(0 - width / 2, height / 2),
				new this.crash.Vector(0 - width / 2, 0 - height / 2),
			];
			crashBody = new this.crash.Polygon(new this.crash.Vector(x, y), points, false, { entity: entity });
			crashBody.sat.setAngle(entity._rotate.z);
		} else {
			console.log('body shape is wrong');
			return;
		}

		entity.body = bodyDef;
		// Add the body to the world with the passed fixture
		// entity.body.fixtures[0].shape.data = crashBody;
		entity.crashBody = crashBody;

		this.crash.insert(crashBody);

		// temporary movement logic, we should add functions like setLinearVelocity for our crash bodies somewhere
		// entity.body._velocity = {x: 0, y: 0};
		entity.body.setLinearVelocity = function (info) {
			entity._velocity.x = info.x;
			entity._velocity.y = info.y;
		};
		if (bodyDef.type != 'static') entity.addBehaviour('crash behaviour', entity._behaviourCrash, false);

		return crashBody;
	},

	destroyBody: function (collider) {
		// I think we need this in case we're destroying a body not linked to an entity
		if (collider) {
			this.crash.remove(collider);
		} else {
			console.log("failed to destroy body - body doesn't exist.");
		}
	},

	gravity: function (x, y) {
		// for now let's just set to 0,0
		console.log('Gravity temporarily unavailable...');
	},

	contactListener: function (cb1, cb2) {
		return;
	},

	start: function () {
		this.crash.checkAll();
		console.log('CrashComponent.start()');

		if (!this._active) {
			this._active = true;
		}
	},

	update: function () {
		let timeStart = taro.now;
		this.crash.check();
		taro._physicsFrames++;

		// Get stats for dev panel;
		const timeEnd = Date.now();
		this.physicsTickDuration += timeEnd - timeStart;

		if (timeEnd - this.lastSecondAt > 1000) {
			this.lastSecondAt = timeEnd;
			this.avgPhysicsTickDuration = this.physicsTickDuration / taro._fpsRate;
			this.totalDisplacement = 0;
			this.totalTimeElapsed = 0;
			this.physicsTickDuration = 0;
		}
	},

	staticsFromMap: function (mapLayer, callback) {
		if (mapLayer.map) {
			const tileWidth = taro.scaleMapDetails.tileWidth || mapLayer.tileWidth();
			const tileHeight = taro.scaleMapDetails.tileHeight || mapLayer.tileHeight();
			let rectArray;
			let rectCount;
			let rect;

			// Get the array of rectangle bounds based on the map's data
			rectArray = mapLayer.scanRects(callback);
			rectCount = rectArray.length;

			while (rectCount--) {
				rect = rectArray[rectCount];

				const defaultData = {
					translate: {
						x: rect.x * tileWidth,
						y: rect.y * tileHeight,
					},
				};

				// we can chain these methods because they return the entity
				const wall = new TaroEntityPhysics(defaultData)
					.width(rect.width * tileWidth)
					.height(rect.height * tileHeight)
					.drawBounds(false)
					.drawBoundsData(false)
					.category('wall');

				// {copied comment}
				// walls must be created immediately because there isn't an actionQueue for walls

				taro.physics.createBody(wall, {
					type: 'static',
					linearDamping: 0,
					angularDamping: 0,
					allowSleep: true,
					fixtures: [
						{
							friction: 0.5,
							restitution: 0,
							shape: {
								type: 'rectangle',
							},
							filter: {
								// i am
								filterCategoryBits: 0x0001,
								// i collide with everything except other walls
								filterMaskBits: 0x0002 /*| 0x0004*/ | 0x0008 | 0x0010 | 0x0020,
							},
							taroId: wall.id(),
						},
					],
				});

				if (taro.isServer) {
					taro.server.totalWallsCreated++;
				}
			}
		} else {
			PhysicsComponent.prototype.log(
				'Cannot extract static bodies from map data because passed map does not have a .map property.',
				'error'
			);
		}
	},

	// // temprorary for testing crash engine
	// getInfo: function () {
	// 	console.log('TOTAL in rbush.all(): ', this.crash.rbush.all().length);
	// 	// console.log('TOTAL in crash.__moved: ', this.crash.__moved.length);
	// },

	/**
	 * Gets / sets the current engine to box2d scaling ratio.
	 * @param val
	 * @return {*}
	 */
	scaleRatio: function (val) {
		// we need this method for Item.js to work so
		// keeping it as get/set but always 1 for get.
		// leaving set functionality for testing
		this._scaleRatio = 1;

		if (val !== undefined) {
			this._scaleRatio = val;
			return this._entity;
		}

		return this._scaleRatio;
	},

	getBodiesInRegion: function (region) {
		let regionCollider;
		if (!region.crashBody) {
			// this is a bad hack to not crash server on melee swing.
			regionCollider = new this.crash.Circle(new this.crash.Vector(region.x, region.y), region.width);
		} else {
			regionCollider = region.entity.crashBody;
		}

		const entities = [];
		const foundColliders = this.crash.search(regionCollider);
		let collider;

		for (collider of foundColliders) {
			const entity = collider.data.entity;
			// taro.$(collider.data.taroId);
			if (entity) {
				entities.push(entity);
			}
		}

		return entities;
	},

	/*queueAction: function (action) {
		this._actionQueue.push(action);
	}*/
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = PhysicsComponent;
}
