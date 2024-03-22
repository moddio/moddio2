var AIComponent = TaroEntity.extend({
	classId: 'AIComponent',
	componentId: 'ai',

	init: function (unit) {
		var self = this;
		self._entity = unit;
		self.targetUnitId = undefined;
		self.targetPosition = undefined;
		self.unitsTargetingMe = []; // unit IDs of units attacking/fleeing away from this unit
		self.debugEnabled = true;
		self.addComponent(AStarPathfindingComponent);

		// AI settings

		// sensor needs to be enabled regardless of AI to process sensor collision triggers
		// for example, in cell-eater, items are consumed via sensors
		if (unit._stats.ai) {

			if (unit._stats.ai.sensorRadius > 0 && unit.sensor == undefined) {
				unit.sensor = new Sensor(unit, unit._stats.ai.sensorRadius);
			}

			unit._stats.aiEnabled = unit._stats.ai.enabled;
			if (unit._stats.aiEnabled) {
				self.enable();
			}
		}
	},

	enable: function () {
		var self = this;
		var unit = self._entity;
		unit._stats.aiEnabled = true;
		if (taro.isServer) {
			unit.streamUpdateData([{ aiEnabled: true }]);
		}

		self.pathFindingMethod = unit._stats.ai.pathFindingMethod; // options: simple/a*
		self.idleBehaviour = unit._stats.ai.idleBehaviour; // options: wander/stay
		self.sensorResponse = unit._stats.ai.sensorResponse; // options: none/flee/none (default)
		self.attackResponse = unit._stats.ai.attackResponse; // options: fight/flee/none (default)
		self.maxTravelDistance = unit._stats.ai.maxTravelDistance; // how far unit's willing to flee/chase target until returning to its spawn position - options: undefined value for infinite distance
		self.letGoDistance = unit._stats.ai.letGoDistance; // options: undefined value for infinite distance
		self.maxAttackRange = unit._stats.ai.maxAttackRange;
		self.previousPosition = { x: unit._translate.x, y: unit._translate.y }; // last position recorded before fleeing
		self.nextMoveAt = taro._currentTime;
		self.goIdle();

		// if (unit._stats.ai.sensorRadius > 0 && unit.sensor == undefined) {
		// 	unit.sensor = new Sensor(unit, unit._stats.ai.sensorRadius);
		// }
	},

	disable: function () {
		var unit = this._entity;
		unit._stats.aiEnabled = false;

		if (taro.isServer) {
			unit.streamUpdateData([{ aiEnabled: false }]);
		}

		if (unit.sensor) {
			// unit.sensor.remove();
		}
		unit.ability.stopUsingItem();
		unit.stopMoving();
		this.targetUnitId = undefined;
		this.targetPosition = undefined;
		this.currentAction = undefined;
		this.nextMoveAt = undefined;
	},

	registerAttack: function (unit) {
		var self = this;
		// only response to hostile/neutral units
		var ownerPlayer = self._entity.getOwner();
		if (unit) {
			var ownerPlayerOfTargetUnit = unit.getOwner();
			if (ownerPlayer && ownerPlayer.isHostileTo(ownerPlayerOfTargetUnit) && ownerPlayer != ownerPlayerOfTargetUnit) { // AI should only attack hostile and non self-controlled unit
				// if I already have a target, re-target if new target unit is closer
				var targetUnit = this.getTargetUnit();
				if (targetUnit == undefined || (targetUnit && self.getDistanceToUnit(unit)) < self.getDistanceToUnit(targetUnit)) {
					switch (self.attackResponse) {
						case 'fight':
							self.attackUnit(unit);
							break;
						case 'flee':
							self.fleeFromUnit(unit);
							break;
					}
				}
			}
		}
	},

	registerSensorDetection: function (unit) {
		var self = this;
		// only response to hostile/neutral units
		var ownerPlayer = self._entity.getOwner();
		if (unit) {
			var ownerPlayerOfTargetUnit = taro.$(unit._stats.ownerId);
			if (ownerPlayer && ownerPlayer.isHostileTo(ownerPlayerOfTargetUnit) && ownerPlayer != ownerPlayerOfTargetUnit && unit._stats.isUnTargetable != true) {
				// if I already have a target, re-target if new target unit is closer
				var targetUnit = this.getTargetUnit();
				if (targetUnit == undefined || (self.maxAttackRange < this.getDistanceToTarget())) {
					switch (self.sensorResponse) {
						case 'fight':
							// if (self.currentAction != 'fight') {
							self.attackUnit(unit);
							// }
							break;
						case 'flee':
							self.fleeFromUnit(unit);
							break;
					}
				}
			}
		}
	},

	// all units that were targeting this unit will no longer target this unit
	announceDeath: function () {
		var unitIds = this.unitsTargetingMe;
		for (var i = 0; i < unitIds.length; i++) {
			var attackingUnit = taro.$(unitIds[i]);
			if (attackingUnit && attackingUnit.ai.getTargetUnit() == this._entity && attackingUnit.sensor && attackingUnit._stats.ai && attackingUnit._stats.aiEnabled) {
				attackingUnit.ai.goIdle();
				attackingUnit.sensor.updateBody(); // re-detect nearby units
			}
		}
		this.targetUnitId = undefined;
		this.targetPosition = undefined;
		this.unitsTargetingMe = [];
	},

	getTargetUnit: function () {
		if (this.targetUnitId)
			return taro.$(this.targetUnitId);

		return undefined;
	},

	getAngleToTarget: function () {
		var unit = this._entity;
		var targetPosition = this.getTargetPosition();
		if (targetPosition) {
			return Math.atan2(targetPosition.y - unit._translate.y, targetPosition.x - unit._translate.x) + Math.radians(90);
		}

		return undefined;
	},

	// return distance to target position or target unit (if this.targetUnit is set)
	getDistanceToTarget: function () {
		const unit = this._entity;
		let distance = 99999999999; // set distance as infinite by default

		// if target is a unit, then consider the radius of the both this unit and target unit
		const targetUnit = this.getTargetUnit();
		if (targetUnit) {
			distance = this.getDistanceToUnit(targetUnit);
		} else {
			const targetPosition = this.getTargetPosition();
			if (targetPosition) {
				distance = Math.distance(unit._translate.x, unit._translate.y, targetPosition.x, targetPosition.y);
			}
		}

		return distance;
	},

	// return distance with consideration of both units body radius
	getDistanceToUnit: function (targetUnit) {
		var myUnit = this._entity;
		if (targetUnit) {
			var a = Math.abs(myUnit._translate.x - targetUnit._translate.x);
			var b = Math.abs(myUnit._translate.y - targetUnit._translate.y);
			var distanceFromCenter = Math.sqrt(a * a + b * b);
		}

		var myUnitReach = myUnit.height() / 2;
		var targetUnitRadius = targetUnit.width() / 2;

		return distanceFromCenter - targetUnitRadius - myUnitReach;
	},

	// return target position whether it's a unit or a position.
	getTargetPosition: function () {
		var targetUnit = this.getTargetUnit();
		if (targetUnit && this.pathFindingMethod == 'simple') { // only set target position for simple pathfinding
			return { x: targetUnit._translate.x, y: targetUnit._translate.y };
		}
		if (this.targetPosition) {
			return this.targetPosition;
		}
		return undefined;
	},

	goIdle: function () {
		var unit = this._entity;
		unit.ability.stopUsingItem();
		unit.stopMoving();
		this.targetUnitId = undefined;
		this.targetPosition = undefined;
		this.currentAction = 'idle';
		this.nextMoveAt = taro._currentTime + 2000 + Math.floor(Math.random() * 2000);
		if (this.pathFindingMethod == "a*") {
			this.aStar.path = []; // clear the A* path
		}
	},

	fleeFromUnit: function (unit) {
		this.setTargetUnit(unit);
		switch (this.pathFindingMethod) {
			case 'simple':
				this.targetPosition = undefined;
				break;
			case 'a*':
				this.aStar.setTargetPosition(
					this._entity._translate.x - (unit._translate.x - this._entity._translate.x),
					this._entity._translate.y - (unit._translate.y - this._entity._translate.y)
				);
				break;
		}
		// only update its return position if unit was provked while in idle state
		if (this.currentAction == 'idle') {
			this.previousPosition = { x: this._entity._translate.x, y: this._entity._translate.y };
		}
		this.currentAction = 'flee';
		this._entity.startMoving();
		this.nextMoveAt = taro._currentTime + 5000 + Math.floor(Math.random() * 5000);
	},

	attackUnit: function (unit) {
		if (this.getTargetUnit() == unit && this.currentAction == 'fight') { // the target unit is the same and the ai is already fighting it
			return;
		}
		this.setTargetUnit(unit);
		// only update its return position if unit was provked while in idle state
		if (this.currentAction == 'idle') {
			this.previousPosition = { x: this._entity._translate.x, y: this._entity._translate.y };
		}
		if (this.pathFindingMethod == 'a*') {
			this.aStar.setTargetPosition(unit._translate.x, unit._translate.y);
		}
		this.currentAction = 'fight';
		if (this.maxAttackRange < this.getDistanceToTarget()) { // only need to move if the maxAttackRange is not enough to reach the target
			this._entity.startMoving();
		}
		// let targetAngle = this.getAngleToTarget(); // rotating here cause inaccurate rotation on AI unit
		// if (targetAngle && !this._entity._stats.currentBody?.fixedRotation) {
		// 	this._entity.streamUpdateData([{rotate: targetAngle}]);
		// }
	},

	moveToTargetPosition: function (x, y) {
		switch (this.pathFindingMethod) {
			case 'simple':
				this.setTargetPosition(x, y);
				break;
			case 'a*':
				this.aStar.setTargetPosition(x, y);
		}
		this.currentAction = 'move';
		this._entity.startMoving();
		this.targetUnitId = undefined;
	},

	setTargetUnit: function (unit) {
		// can't target self!
		if (unit == this._entity)
			return;

		var previousTargetUnit = this.getTargetUnit();

		// remove this unit from currently targeted unit's unitsTargetingMe array.
		if (previousTargetUnit && unit != previousTargetUnit) {
			for (var i = 0; i < previousTargetUnit.ai.unitsTargetingMe.length; i++) {
				if (previousTargetUnit.ai.unitsTargetingMe[i] == this._entity.id()) {
					previousTargetUnit.ai.unitsTargetingMe.splice(i, 1);
				}
			}
		}

		if (unit) {
			// register this unit into new target unit's unitsTargetingMe array.
			if (!unit.ai.unitsTargetingMe.includes(this._entity.id())) {
				unit.ai.unitsTargetingMe.push(this._entity.id());
			}
			this.targetUnitId = unit.id();
		}

		if (this.pathFindingMethod == "a*") {
			this.aStar.previousTargetPosition = { x: unit._translate.x, y: unit._translate.y };
		}
	},

	setTargetPosition: function (x, y) {
		this.targetPosition = { x: x, y: y };
	},

	setPathFindingMethod: function (pathFindingMethod) {
		// currently we have two pathfinding method, use this to avoid invalid method
		// if the given method is not valid, change it to simple (default)
		this.pathFindingMethod = (pathFindingMethod == "a*") ? "a*" : "simple";
		if (this.pathFindingMethod == "a*") { // reset
			this.aStar.resetAStar();
		}
	},

	update: function () {

		var self = this;
		var unit = self._entity;

		if (!unit._stats.aiEnabled)
			return;

		const tileWidth = taro.scaleMapDetails.tileWidth; // both pathfinding method need it to check

		var targetUnit = this.getTargetUnit();

		// update unit's direction toward its target
		var targetPosition = self.getTargetPosition();
		// wandering units should move in straight direction. no need to re-assign angleToTarget
		if (targetPosition && self.currentAction != 'wander') {
			unit.angleToTarget = self.getAngleToTarget();
		}

		switch (self.currentAction) {
			case 'idle':
				// wandering unit will repeat between moving to a random position every 2~4 seconds, then stop for 2~4 seconds
				if (self.idleBehaviour == 'wander' && taro._currentTime > self.nextMoveAt) {
					// assign a random destination within 25px radius
					if (!unit.isMoving) {
						unit.angleToTarget = Math.random() * Math.PI * 2;
						unit.startMoving();
						self.nextMoveAt = taro._currentTime + 1500 + Math.floor(Math.random() * 1500);
					} else {
						unit.stopMoving();
						self.nextMoveAt = taro._currentTime + 2000 + Math.floor(Math.random() * 2000);
					}
				}
				break;

			case 'move':
				switch (this.pathFindingMethod) {
					case 'simple':
						if (this.getDistanceToTarget() < tileWidth / 2) { // map with smaller tile size requires a more precise stop, vice versa
							self.goIdle();
						}
						break;
					case 'a*':
						if (this.aStar.getDistanceToClosestAStarNode() < tileWidth / 2) { // reduced chances of shaky move
							this.aStar.path.pop(); // after moved to the closest A* node, pop the array and let ai move to next A* node
						}
						const closestNode = this.aStar.getClosestAStarNode();
						if (closestNode) { // Move to the highest index of path saved (closest node to start node)
							if (!this.aStar.aStarPathIsBlocked()) { // only keep going if the path is still non blocked
								this.setTargetPosition(
									(closestNode.x + 0.5) * tileWidth,
									(closestNode.y + 0.5) * tileWidth
								);
							} else {
								this.aStar.setTargetPosition( // recalculate whole path once the next move is blocked
									(this.aStar.path[0].x + 0.5) * tileWidth,
									(this.aStar.path[0].y + 0.5) * tileWidth
								);
							}
						} else {
							self.goIdle();
						}
						break;
				}
				break;

			case 'fight':
				if (targetUnit && unit) {
					var distanceTravelled = Math.distance(self.previousPosition.x, self.previousPosition.y, unit._translate.x, unit._translate.y);
					if (!isNaN(parseInt(self.maxTravelDistance)) && distanceTravelled > self.maxTravelDistance) {
						// we've chased far enough. stop fighting and return to where i was before
						self.moveToTargetPosition(self.previousPosition.x, self.previousPosition.y);
					} else if (!isNaN(parseInt(self.letGoDistance)) && this.getDistanceToTarget() > self.letGoDistance) {
						// if the target is far away from the unit, stop the chase
						self.goIdle();
					} else {
						// stop moving, start attacking if my attack can reach the target
						if (self.maxAttackRange > this.getDistanceToTarget()) {
							unit.isMoving = false;
							unit.ability.startUsingItem();
							if (this.pathFindingMethod == 'a*') {
								this.setTargetPosition(targetUnit._translate.x, targetUnit._translate.y); // ai should target targetUnit when stop moving and fight
							}
						} else if (!unit.isMoving) {
							// target's too far. stop firing, and start chasing
							unit.ability.stopUsingItem();
							unit.startMoving();
							if (this.pathFindingMethod == 'a*') {
								this.aStar.setTargetPosition(targetUnit._translate.x, targetUnit._translate.y); // recalculate the moving path to chase
							}
							if (unit.sensor) {
								unit.sensor.updateBody(); // re-detect nearby units
							}
						} else {
							if (this.pathFindingMethod == 'a*') {
								if (this.aStar.getDistanceToClosestAStarNode() < tileWidth / 2) { // reduced chances of shaky move
									this.aStar.path.pop(); // after moved to the closest A* node, pop the array and let ai move to next A* node
								}
								const closestNode = this.aStar.getClosestAStarNode();
								if (closestNode && !this.aStar.aStarPathIsBlocked() && !this.aStar.aStarTargetUnitMoved()) {
									// Move to the highest index of path saved (closest node to start node) 
									// only keep follow the old path if the path is still non blocked AND targetUnit is not closer than end node of the path
									this.setTargetPosition(
										(closestNode.x + 0.5) * tileWidth,
										(closestNode.y + 0.5) * tileWidth
									);
								} else {
									// recalculate whole path
									this.aStar.setTargetPosition(targetUnit._translate.x, targetUnit._translate.y);
								}
							}
						}
					}
				} else { // target unit doesn't exist. go back to what I was doing before
					// if I previously had a destination I was heading, then continue the journey
					if (self.targetPosition) {
						self.moveToTargetPosition(self.targetPosition.x, self.targetPosition.y);
					} else { // otherwise go idle
						self.goIdle();
					}
				}
				break;

			case 'flee':
				// if fleeing, then move to opposite direction from its target
				if (unit.angleToTarget && this.pathFindingMethod == "simple") unit.angleToTarget += Math.PI;
				if (targetUnit) {
					var distanceTravelled = Math.distance(
						self.previousPosition.x, self.previousPosition.y,
						targetUnit._translate.x, targetUnit._translate.y
					);
					if (this.pathFindingMethod == "a*") {
						if (this.aStar.getDistanceToClosestAStarNode() < tileWidth / 2) { // reduced chances of shaky move
							this.aStar.path.pop(); // after moved to the closest A* node, pop the array and let ai move to next A* node
						}
						const closestNode = this.aStar.getClosestAStarNode();
						if (closestNode && !this.aStar.aStarPathIsBlocked() && !this.aStar.aStarTargetUnitMoved()) { // Move to the highest index of path saved (closest node to start node)
							this.setTargetPosition( // only keep going if the path is still non blocked
								(closestNode.x + 0.5) * tileWidth,
								(closestNode.y + 0.5) * tileWidth
							);
						} else {
							this.aStar.setTargetPosition( // recalculate flee path
								this._entity._translate.x - (targetUnit._translate.x - this._entity._translate.x),
								this._entity._translate.y - (targetUnit._translate.y - this._entity._translate.y)
							);
						}
					}
					// we've ran far enough OR we've been running for long enough (5-10s) let's stop running
					if ((self.maxTravelDistance && distanceTravelled > self.maxTravelDistance) || taro._currentTime > self.nextMoveAt) {
						self.goIdle();
					}
				} else { // target unit doesn't exist. stop fleeing.
					self.goIdle();
				}
				break;
		}
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = AIComponent;
}
