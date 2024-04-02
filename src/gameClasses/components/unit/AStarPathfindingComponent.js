class AStarPathfindingComponent extends TaroEntity {
	classId = 'AStarPathfindingComponent';
	componentId = 'aStar';
	constructor(unit) {
		super();
		this._entity = unit._entity;

		// A* algorithm variables
		this.path = []; // AI unit will keep going to highest index until there is no more node to go
		// everytime when path generate failure, path should set to empty array (this.path = aStarResult.path automatically done for it)
		this.previousTargetPosition = undefined;
	}
	/*
	 * @param x
	 * @param y
	 * @return .path = {Array}, .ok = {bool}
	 * Use .path to get return array with tiled x and y coordinates of the path (Start node exclusive)
	 * if target position is not reachable (no road to go / inside wall) path will include tiled x and y passed only
	 * if the unit already at the target location, .path return empty array
	 *
	 * Use .ok to check if path correctly generated
	 * .ok return true if .path is found or the unit already at the target location
	 * .ok return false if the target location is inside a wall, not reachable
	 * if there is no wall between the start position and the end position, it will return the end position in .path, and return true in .ok
	 */
	getAStarPath(x, y) {
		const unit = this._entity;

		const map = taro.map; // cache the map data for rapid use
		const mapData = map.data;
		const tileWidth = taro.scaleMapDetails.tileWidth;

		const unitTilePosition = {
			x: Math.floor(unit._translate.x / tileWidth),
			y: Math.floor(unit._translate.y / tileWidth),
		};
		unitTilePosition.x = Math.clamp(unitTilePosition.x, 0, mapData.width - 1); // confine with map boundary
		unitTilePosition.y = Math.clamp(unitTilePosition.y, 0, mapData.height - 1);
		const targetTilePosition = { x: Math.floor(x / tileWidth), y: Math.floor(y / tileWidth) };
		targetTilePosition.x = Math.clamp(targetTilePosition.x, 0, mapData.width - 1); // confine with map boundary
		targetTilePosition.y = Math.clamp(targetTilePosition.y, 0, mapData.height - 1);

		let returnValue = { path: [{ ...targetTilePosition }], ok: false };

		if (!this.aStarIsPositionBlocked(x, y)) {
			// if there is no blocked, directly set the target to the end position
			returnValue.ok = true;
			return returnValue;
		}

		if (map.tileIsWall(targetTilePosition.x, targetTilePosition.y)) {
			// teminate if the target position is wall
			return returnValue;
		}

		let openList = []; // store grid nodes that is under evaluation
		let closeList = []; // store grid nodes that finished evaluation
		let tempPath = []; // store path to return (smaller index: closer to target, larger index: closer to start)
		openList.push({ current: { ...unitTilePosition }, parent: { x: -1, y: -1 }, totalHeuristic: 0 }); // push start node to open List

		// for dropping nodes that overlap with unit body at that new position
		const unitTileWidthShift = Math.max(0, Math.floor((unit.getBounds().width + tileWidth) / 2 / tileWidth));
		const unitTileHeightShift = Math.max(0, Math.floor((unit.getBounds().height + tileWidth) / 2 / tileWidth));
		const averageTileShift = Math.sqrt(
			unitTileWidthShift * unitTileWidthShift + unitTileHeightShift * unitTileHeightShift
		);

		while (openList.length > 0) {
			let minNode = { ...openList[0] }; // initialize for iteration
			let minNodeIndex = 0;
			for (let i = 1; i < openList.length; i++) {
				if (openList[i].totalHeuristic < minNode.totalHeuristic) {
					// only update the minNode if the totalHeuristic is smaller
					minNodeIndex = i;
					minNode = { ...openList[i] };
				}
			}
			openList.splice(minNodeIndex, 1); // remove node with smallest distance from openList and add it to close list
			closeList.push({ ...minNode });
			if (minNode.current.x == targetTilePosition.x && minNode.current.y == targetTilePosition.y) {
				// break when the goal is found, push it to tempPath for return
				tempPath.push({ ...targetTilePosition });
				break;
			}
			for (let i = 0; i < 4; i++) {
				let newPosition = { ...minNode.current };
				switch (i) {
					case 0: // right
						newPosition.x += 1;
						if (newPosition.x >= mapData.width) {
							continue;
						}
						break;
					case 1: // left
						newPosition.x -= 1;
						if (newPosition.x < 0) {
							continue;
						}
						break;
					case 2: // top
						newPosition.y -= 1;
						if (newPosition.y < 0) {
							continue;
						}
						break;
					case 3: // bottom
						newPosition.y += 1;
						if (newPosition.y >= mapData.height) {
							continue;
						}
						break;
				}

				if (map.tileIsWall(newPosition.x, newPosition.y)) continue; // node inside wall, discard
				// if new position is not goal, prune it if wall overlaps
				let shouldPrune = false;
				for (let i = 1; i <= averageTileShift; i++) {
					// check 8 direction of average tile shift to see will unit overlap with wall at that node
					let cornersHaveWallCurrent =
						map.tileIsWall(minNode.current.x + i, minNode.current.y) ||
						map.tileIsWall(minNode.current.x - i, minNode.current.y) ||
						map.tileIsWall(minNode.current.x, minNode.current.y + i) ||
						map.tileIsWall(minNode.current.x, minNode.current.y - i);
					let sidesHaveWallCurrent =
						map.tileIsWall(minNode.current.x + i, minNode.current.y + i) ||
						map.tileIsWall(minNode.current.x - i, minNode.current.y - i) ||
						map.tileIsWall(minNode.current.x - i, minNode.current.y + i) ||
						map.tileIsWall(minNode.current.x + i, minNode.current.y - i);
					let cornersHaveWallNew =
						map.tileIsWall(newPosition.x + i, newPosition.y) ||
						map.tileIsWall(newPosition.x - i, newPosition.y) ||
						map.tileIsWall(newPosition.x, newPosition.y + i) ||
						map.tileIsWall(newPosition.x, newPosition.y - i);
					let sidesHaveWallNew =
						map.tileIsWall(newPosition.x + i, newPosition.y + i) ||
						map.tileIsWall(newPosition.x - i, newPosition.y - i) ||
						map.tileIsWall(newPosition.x - i, newPosition.y + i) ||
						map.tileIsWall(newPosition.x + i, newPosition.y - i);

					// Idea: avoid hitting outer corners of wall(dodge by going outer), and allow unit to walk next to walls
					shouldPrune =
						(cornersHaveWallNew || sidesHaveWallNew) &&
						(cornersHaveWallCurrent || sidesHaveWallCurrent) &&
						!(cornersHaveWallNew && sidesHaveWallNew && cornersHaveWallCurrent && sidesHaveWallCurrent);
					if (shouldPrune) break;
				}
				if (shouldPrune) continue;

				if (!isNaN(parseInt(this.maxTravelDistance))) {
					// new Position is way too far from current position (> maxTravelDistance * 5 of unit, total diameter: 10 maxTravelDistance), hence A Star skip this possible node
					let distanceFromUnitToTarget = Math.distance(
						unit._translate.x,
						unit._translate.y,
						newPosition.x,
						newPosition.y
					);
					if (distanceFromUnitToTarget > this.maxTravelDistance * 5) {
						continue;
					}
				}

				// valid node, continue operation!!!

				// 10 to 1 A* heuristic for node with distance that closer to the goal
				const distToTargetFromNewPosition = Math.distance(
					newPosition.x,
					newPosition.y,
					targetTilePosition.x,
					targetTilePosition.y
				);
				const distToTargetFromCurrentPosition = Math.distance(
					minNode.current.x,
					minNode.current.y,
					targetTilePosition.x,
					targetTilePosition.y
				);
				const heuristic =
					distToTargetFromNewPosition < distToTargetFromCurrentPosition
						? 1 // euclidean distance to targetTilePosition from the newPosition is smaller than the minNodePosition, reduce the heuristic value (so it tend to choose this node)
						: 10; // euclidean distance to targetTilePosition from the newPosition is larger than the minNodePosition, increase the heuristic value (so it tend not to choose this node)
				let nodeFound = false; // initialize nodeFound for looping (checking the existance of a node)

				for (let k = 0; k < 3; k++) {
					if (!nodeFound) {
						// Idea: In open list already ? Update it : In close list already ? Neglect, already reviewed : put it inside openList for evaluation
						switch (k) {
							case 0: // first check if the node exist in open list (if true, update it)
								for (let j = 0; j < openList.length; j++) {
									if (newPosition.x == openList[j].current.x && newPosition.y == openList[j].current.y) {
										if (minNode.totalHeuristic + heuristic < openList[j].totalHeuristic) {
											openList[j] = {
												current: { ...newPosition },
												parent: { ...minNode.current },
												totalHeuristic: minNode.totalHeuristic + heuristic,
											};
										}
										nodeFound = true;
										break;
									}
								}
								break;
							case 1: // then check if the node exist in the close list (if true, neglect)
								for (let j = 0; j < closeList.length; j++) {
									if (newPosition.x == closeList[j].current.x && newPosition.y == closeList[j].current.y) {
										nodeFound = true;
										break;
									}
								}
								break;
							case 2: // finally push it to open list if it does not exist
								openList.push({
									current: { ...newPosition },
									parent: { ...minNode.current },
									totalHeuristic: minNode.totalHeuristic + heuristic,
								});
								break;
						}
					} else break;
				}
			}
		}
		if (tempPath.length == 0) {
			// goal is unreachable
			return returnValue;
		} else {
			while (
				tempPath[tempPath.length - 1].x != unitTilePosition.x ||
				tempPath[tempPath.length - 1].y != unitTilePosition.y
			) {
				// retrieve the path
				for (let i = 0; i < closeList.length; i++) {
					if (
						tempPath[tempPath.length - 1].x == closeList[i].current.x &&
						tempPath[tempPath.length - 1].y == closeList[i].current.y
					) {
						tempPath.push({ ...closeList[i].parent }); // keep pushing the parent node of the node, until it reach the start node from goal node
						break;
					}
				}
			}
			tempPath.pop(); // omit start tile, no need to step on it again as we are on it already
			returnValue.path = tempPath;
			returnValue.ok = true;
			return returnValue;
		}
	}

	onAStarFailedTrigger() {
		const triggerParam = { unitId: this._entity.id() };
		taro.script.trigger('unitAStarPathFindingFailed', triggerParam);
		this._entity.script.trigger('entityAStarPathFindingFailed', triggerParam);
	}

	aStarIsPositionBlocked(targetX, targetY) {
		let unit = this._entity;
		const tileWidth = taro.scaleMapDetails.tileWidth;
		const xTune = [0, -1, 1, -1, 1];
		const yTune = [0, -1, -1, 1, 1];
		// center, top-left, top-right, bottom-left, bottom-right
		const unitWidth = unit.getBounds().width;
		const unitHeight = unit.getBounds().height;
		const maxBodySizeShift = Math.sqrt(((unitWidth / 2) * unitWidth) / 2 + ((unitHeight / 2) * unitHeight) / 2);
		for (let i = 0; i < 5; i++) {
			taro.raycaster.raycastLine(
				{
					x: (unit._translate.x + maxBodySizeShift * xTune[i]) / taro.physics._scaleRatio,
					y: (unit._translate.y + maxBodySizeShift * yTune[i]) / taro.physics._scaleRatio,
				},
				{
					x: (targetX + (tileWidth / 2) * Math.sqrt(2) * xTune[i]) / taro.physics._scaleRatio,
					y: (targetY + (tileWidth / 2) * Math.sqrt(2) * yTune[i]) / taro.physics._scaleRatio,
				}
			);
			for (let i = 0; i < taro.game.entitiesCollidingWithLastRaycast.length; i++) {
				if (
					taro.game.entitiesCollidingWithLastRaycast[i]._category &&
					taro.game.entitiesCollidingWithLastRaycast[i]._category == 'wall'
				) {
					return true;
				}
			}
		}
		return false;
	}

	aStarPathIsBlocked() {
		for (let i = 0; i < this.path.length; i++) {
			if (taro.map.tileIsWall(this.path[i].x, this.path[i].y)) {
				return true;
			}
		}

		return false;
	}

	getClosestAStarNode() {
		return this.path[this.path.length - 1];
	}

	getDistanceToClosestAStarNode() {
		let distance = 0;
		const tileWidth = taro.scaleMapDetails.tileWidth;
		const unit = this._entity;
		const closestNode = this.getClosestAStarNode();
		if (closestNode) {
			// closestAStarNode exist
			distance = Math.distance(
				(closestNode.x + 0.5) * tileWidth,
				(closestNode.y + 0.5) * tileWidth,
				unit._translate.x,
				unit._translate.y
			);
		}
		return distance;
	}

	aStarTargetUnitMoved() {
		const targetUnit = this._entity.ai.getTargetUnit();
		const tileWidth = taro.scaleMapDetails.tileWidth;
		const targetMovedDistance = Math.distance(
			targetUnit._translate.x,
			targetUnit._translate.y,
			this.previousTargetPosition.x,
			this.previousTargetPosition.y
		);
		if (targetMovedDistance > tileWidth / 2) {
			// update previous target position after unit is treated as moved
			this.previousTargetPosition = { x: targetUnit._translate.x, y: targetUnit._translate.y };
			return true;
		}
		return false;
	}

	setTargetPosition(x, y) {
		const aStarResult = this.getAStarPath(x, y);
		this.path = aStarResult.path;
		const closestNode = this.getClosestAStarNode();
		if (closestNode) {
			// assign target position to ai no matter aStar failed or not as long as something inside path
			const tileWidth = taro.scaleMapDetails.tileWidth;
			this._entity.ai.setTargetPosition((closestNode.x + 0.5) * tileWidth, (closestNode.y + 0.5) * tileWidth);
		}
		if (!aStarResult.ok) {
			this.onAStarFailedTrigger();
		}
	}
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = AStarPathfindingComponent;
}
