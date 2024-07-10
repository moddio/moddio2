class EntitiesToRender {
	trackEntityById: { [key: string]: TaroEntity };
	timeStamp: number;

	constructor() {
		this.trackEntityById = {};
		taro.client.on('tick', this.frameTick, this);
	}

	updateAllEntities(/*timeStamp*/): void {
		for (var entityId in this.trackEntityById) {
			// var timeStart = performance.now();

			// var entity = taro.$(entityId);
			var entity = this.trackEntityById[entityId];

			// taro.profiler.logTimeElapsed('findEntity', timeStart);
			if (entity) {
				entity.script?.trigger('renderTick');

				// handle entity behaviour and transformation offsets
				// var timeStart = performance.now();

				var phaserGameObject = entity.phaserEntity?.gameObject;

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
				}

				if (entity.isTransforming()) {
					entity._processTransform();
				}
				// sometimes, entities' _translate & _rotate aren't updated, because processTransform doesn't run when tab isn't focused
				// hence, we're forcing the update here
				else if (entity != taro.client.selectedUnit) {
					entity._translate.x = entity.nextKeyFrame[1][0];
					entity._translate.y = entity.nextKeyFrame[1][1];
					entity._translate.z = entity.nextKeyFrame[1][2];
					entity._rotate.z = entity.nextKeyFrame[1][3];
				}

				if (entity._translate) {
					var x = entity._translate.x;
					var y = entity._translate.y;
					var z = entity._translate.z;
					var rotate = entity._rotate.z;
				}

				const is3D = taro.game.data.defaultData.defaultRenderer === '3d';

				// if item is being carried by a unit
				if (ownerUnit) {
					// if the ownerUnit is not visible, then hide the item
					if (ownerUnit.phaserEntity?.gameObject?.visible == false) {
						phaserGameObject.setVisible(false);
						continue;
					}

					// update ownerUnit's transform, so the item can be positioned relative to the ownerUnit's transform
					ownerUnit._processTransform();

					// var timeStart = performance.now();
					// rotate weldjoint items to the owner unit's rotation
					if (entity._stats.currentBody && entity._stats.currentBody.jointType == 'weldJoint') {
						rotate = ownerUnit._rotate.z;
						// immediately rotate my unit's items to the angleToTarget
					} else if (
						ownerUnit == taro.client.selectedUnit &&
						entity._stats.controls?.mouseBehaviour?.rotateToFaceMouseCursor
					) {
						rotate = ownerUnit.angleToTarget; // angleToTarget is updated at 60fps
					}
					entity._rotate.z = rotate; // update the item's rotation immediately for more accurate aiming (instead of 20fps)

					entity.anchoredOffset = entity.getAnchoredOffset(rotate);

					if (entity.anchoredOffset) {
						x = ownerUnit._translate.x;
						y = ownerUnit._translate.y;
						rotate = entity.anchoredOffset.rotate;
						if (!is3D) {
							x += entity.anchoredOffset.x;
							y += entity.anchoredOffset.y;
						}
					}
				}

				if ((!is3D && entity.tween?.isTweening && phaserGameObject?.visible) || (is3D && entity.tween?.isTweening)) {
					entity.tween.update();
					x += entity.tween.offset.x;
					y += entity.tween.offset.y;
					rotate += entity.tween.offset.rotate;
				}

				if (
					entity.tween?.isTweening ||
					entity.isTransforming() ||
					entity == taro.client.selectedUnit ||
					entity._category == 'item'
				) {
					// var timeStart = performance.now();
					entity.transformTexture(x, y, z, rotate); // uses absolute position without anchorOffset for items. That info is later retrieved in the render function

					// entity isn't moving anymore. prevent rendering to conserve cpu
					if (
						entity.isTransforming() &&
						entity.nextKeyFrame[1][0] == x &&
						entity.nextKeyFrame[1][1] == y &&
						entity.nextKeyFrame[1][2] == z &&
						entity.nextKeyFrame[1][3] == rotate
					) {
						// if (entity != taro.client.selectedUnit) console.log(entity._category, "not moving)")
						entity.isTransforming(false);
					}

					// taro.profiler.logTimeElapsed('transformTexture', timeStart);
				}
			}
		}

		// taro.triggersQueued = [];
		if (taro.gameLoopTickHasExecuted) {
			taro.gameLoopTickHasExecuted = false;

			// triggersQueued must run for entity-scripts first then run for the world script.
			// hence, this runs after the above's entity._behaviour() is executed.
			// this is for client-only. for server, it runs in taroEngine.engineStep
			// because we run entity._behaviour in EntitiesToRender.ts for client, and taroEngine for server.
			while (taro.script && taro.triggersQueued.length > 0) {
				const trigger = taro.triggersQueued.shift();
				taro.script.trigger(trigger.name, trigger.params);
			}
		}
	}

	frameTick(): void {
		taro.script?.trigger('renderTick');
		taro.input.processInputOnEveryFps();

		taro.engineStep(Date.now(), 1000 / 60);
		taro._renderFrames++;

		this.updateAllEntities();
	}
}
