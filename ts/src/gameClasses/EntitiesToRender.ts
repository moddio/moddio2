class EntitiesToRender {
	trackEntityById: {[key: string]: TaroEntity};
	timeStamp: number;
    //updateCount: number;

	constructor() {
		this.trackEntityById = {};
		taro.client.on('tick', this.frameTick, this);
	}

	updateAllEntities (/*timeStamp*/): void {
		var currentTime = Date.now();

		//taro.transformCount = 0;
		//this.updateCount = 0;

		for (var entityId in this.trackEntityById) {
			// var timeStart = performance.now();

			// var entity = taro.$(entityId);	
			var entity = this.trackEntityById[entityId];

			// taro.profiler.logTimeElapsed('findEntity', timeStart);
			if (entity) {
				//this.updateCount++;
				// handle entity behaviour and transformation offsets
				// var timeStart = performance.now();

				if (taro.gameLoopTickHasExecuted) {
					if (entity._deathTime !== undefined && entity._deathTime <= taro._tickStart) {
						// Check if the deathCallBack was set
						if (entity._deathCallBack) {
							entity._deathCallBack.apply(entity);
							delete entity._deathCallBack;
						}

						entity.destroy();
					}

					if (entity._behaviour && !entity.isHidden()) {
						entity._behaviour();
					}

					// handle streamUpdateData
					if (taro.client.myPlayer) {
						var updateQueue = taro.client.entityUpdateQueue[entityId];
						var processedUpdates = [];

						while (updateQueue && updateQueue.length > 0) {
							var nextUpdate = updateQueue[0];

							if (
                                // Don't run if we're updating item's state/owner unit, but its owner doesn't exist yet
                                entity._category == 'item' &&
                                (   // updating item's owner unit, but the owner hasn't been created yet
                                    (nextUpdate.ownerUnitId && taro.$(nextUpdate.ownerUnitId) == undefined) || 
                                    (   // changing item's state to selected/unselected, but owner doesn't exist yet
                                        (nextUpdate.stateId == 'selected' || nextUpdate.stateId == 'unselected') &&
                                        entity.getOwnerUnit() == undefined
                                    )
                                )
                            ) {
                                break;
                            }
                            else {
                                processedUpdates.push(taro.client.entityUpdateQueue[entityId].shift());
                            }
						}

						if (processedUpdates.length > 0) {
							entity.streamUpdateData(processedUpdates);
							// processedUpdates.forEach((value) => {
							// 	console.log(value);
							// });
						}
					}
				}

                // handle entity culling
                if (entity.isCulled) {
                    if (entity._category === 'item') {
                        var ownerUnit = entity.getOwnerUnit();  
                        if (ownerUnit) {
                            entity.emit('transform', {
                                x: ownerUnit.nextKeyFrame[1][0],
                                y: ownerUnit.nextKeyFrame[1][1],
                                rotation: ownerUnit.nextKeyFrame[1][2],
                            });
                        }   
                    }
                    continue;
                }

                entity.emit('cull');

				// update transformation using incoming network stream
				if (entity.isTransforming() || entity.tween?.isTweening) {
					// var timeStart = performance.now();
					entity._processTransform();
					// taro.profiler.logTimeElapsed('first _processTransform', timeStart);
				
					if (entity._translate && !entity.isHidden()) {
						
						var x = entity._translate.x;
						var y = entity._translate.y;
						var rotate = entity._rotate.z;

						if (entity._category == 'item') {
							var ownerUnit = entity.getOwnerUnit();

							if (ownerUnit) {
								// var timeStart = performance.now();
								// if ownerUnit's transformation hasn't been processed yet, then it'll cause item to drag behind. so we're running it now
								ownerUnit._processTransform();

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
								// taro.profiler.logTimeElapsed('second _processTransform', timeStart);
						
							}
						}
					}
					
					if (entity.tween?.isTweening) {
						entity.tween.update();
						x += entity.tween.offset.x;
						y += entity.tween.offset.y;
						rotate += entity.tween.offset.rotate;
					}

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

		//console.log(taro._currentTime, "processTransform count", taro.transformCount, "updateAllEntities count", this.updateCount);
	}

	frameTick(): void {
		taro.engineStep(Date.now(), 1000/60);
		taro.input.processInputOnEveryFps();

		taro._renderFrames++;

		this.updateAllEntities();

			
	}
}
