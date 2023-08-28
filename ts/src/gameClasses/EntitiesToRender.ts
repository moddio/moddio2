class EntitiesToRender {
	trackEntityById: {[key: string]: TaroEntity};
	timeStamp: number;

	constructor() {
		this.trackEntityById = {};
		taro.client.on('tick', this.frameTick, this);
	}

	updateAllEntities (/*timeStamp*/): void {

		for (var entityId in this.trackEntityById) {
			// var timeStart = performance.now();

			// var entity = taro.$(entityId);	
			var entity = this.trackEntityById[entityId];

			// taro.profiler.logTimeElapsed('findEntity', timeStart);
			if (entity) {
				// handle entity behaviour and transformation offsets
				// var timeStart = performance.now();
				
				var phaserEntity = entity.phaserEntity?.gameObject
				
				if (taro.gameLoopTickHasExecuted) {
					if (entity._deathTime !== undefined && entity._deathTime <= taro._tickStart) {
						// Check if the deathCallBack was set
						if (entity._deathCallBack) {
							entity._deathCallBack.apply(entity);
							delete entity._deathCallBack;
						}

						entity.destroy();
					}

					// if (typeof entity._behaviour == 'function')
					entity._behaviour();
				}
				
				var ownerUnit = undefined;
				if (entity._category == 'item') {
					ownerUnit = entity.getOwnerUnit();

					// dont render item carried by invisible unit
					if (!ownerUnit?.phaserEntity?.gameObject?.visible) {
						continue;
					}
				}

				if (entity.isTransforming()) {

					// update transformation using incoming network stream
					// var timeStart = performance.now();
					entity._processTransform();
				}

				if (entity._translate) {
						
					var x = entity._translate.x;
					var y = entity._translate.y;
					var rotate = entity._rotate.z;
				}

				// if item is being carried by a unit
				if (ownerUnit) {

					// update ownerUnit's transform, so the item can be positioned relative to the ownerUnit's transform
					ownerUnit._processTransform();

					// var timeStart = performance.now();
					// rotate weldjoint items to the owner unit's rotation
					if (entity._stats.currentBody && entity._stats.currentBody.jointType == 'weldJoint') {
						rotate = ownerUnit._rotate.z;
					// immediately rotate my unit's items to the angleToTarget
					} else if (ownerUnit == taro.client.selectedUnit && entity._stats.controls?.mouseBehaviour?.rotateToFaceMouseCursor) {
						rotate = ownerUnit.angleToTarget; // angleToTarget is updated at 60fps								
					}
					entity._rotate.z = rotate // update the item's rotation immediately for more accurate aiming (instead of 20fps)

					entity.anchoredOffset = entity.getAnchoredOffset(rotate);

					if (entity.anchoredOffset) {
						x = ownerUnit._translate.x + entity.anchoredOffset.x;
						y = ownerUnit._translate.y + entity.anchoredOffset.y;
						rotate = entity.anchoredOffset.rotate;
					}
				}

				if (entity.tween?.isTweening && phaserEntity?.visible) {
					entity.tween.update();
					x += entity.tween.offset.x;
					y += entity.tween.offset.y;
					rotate += entity.tween.offset.rotate;
				}

				if (entity.tween?.isTweening || 
					entity.isTransforming() || 
					entity == taro.client.selectedUnit || 
					ownerUnit
				) {
					// var timeStart = performance.now();
					entity.transformTexture(x, y, rotate);
					// taro.profiler.logTimeElapsed('transformTexture', timeStart);
				}
			}
		}

		// taro.triggersQueued = [];
		if (taro.gameLoopTickHasExecuted) {
			taro.gameLoopTickHasExecuted = false;
		}
	}

	frameTick(): void {
		taro.engineStep(Date.now(), 1000/60);
		taro.input.processInputOnEveryFps();

		taro._renderFrames++;

		this.updateAllEntities();

			
	}
}
