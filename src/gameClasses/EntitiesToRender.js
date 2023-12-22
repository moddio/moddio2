var EntitiesToRender = /** @class */ (function () {
    function EntitiesToRender() {
        this.trackEntityById = {};
        taro.client.on('tick', this.frameTick, this);
    }
    EntitiesToRender.prototype.updateAllEntities = function ( /*timeStamp*/) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        for (var entityId in this.trackEntityById) {
            // var timeStart = performance.now();
            // var entity = taro.$(entityId);
            var entity = this.trackEntityById[entityId];
            // taro.profiler.logTimeElapsed('findEntity', timeStart);
            if (entity) {
                (_a = entity.script) === null || _a === void 0 ? void 0 : _a.trigger("renderTick");
                // handle entity behaviour and transformation offsets
                // var timeStart = performance.now();
                var phaserGameObject = (_b = entity.phaserEntity) === null || _b === void 0 ? void 0 : _b.gameObject;
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
                    entity._rotate.z = entity.nextKeyFrame[1][2];
                }
                if (entity._translate) {
                    var x = entity._translate.x;
                    var y = entity._translate.y;
                    var rotate = entity._rotate.z;
                }
                // if item is being carried by a unit
                if (ownerUnit) {
                    // if the ownerUnit is not visible, then hide the item
                    if (((_d = (_c = ownerUnit.phaserEntity) === null || _c === void 0 ? void 0 : _c.gameObject) === null || _d === void 0 ? void 0 : _d.visible) == false) {
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
                    }
                    else if (ownerUnit == taro.client.selectedUnit && ((_f = (_e = entity._stats.controls) === null || _e === void 0 ? void 0 : _e.mouseBehaviour) === null || _f === void 0 ? void 0 : _f.rotateToFaceMouseCursor)) {
                        rotate = ownerUnit.angleToTarget; // angleToTarget is updated at 60fps
                    }
                    entity._rotate.z = rotate; // update the item's rotation immediately for more accurate aiming (instead of 20fps)
                    entity.anchoredOffset = entity.getAnchoredOffset(rotate);
                    if (entity.anchoredOffset) {
                        x = ownerUnit._translate.x + entity.anchoredOffset.x;
                        y = ownerUnit._translate.y + entity.anchoredOffset.y;
                        rotate = entity.anchoredOffset.rotate;
                    }
                    //if (entity._stats.name === 'potato gun small') console.log('owner unit translate',ownerUnit._translate.x, ownerUnit._translate.y, '\nphaser unit pos', ownerUnit.phaserEntity.gameObject.x, ownerUnit.phaserEntity.gameObject.y, '\nitem translate', x, y, '\nphaser item pos', entity.phaserEntity.gameObject.x, entity.phaserEntity.gameObject.y)
                }
                if (((_g = entity.tween) === null || _g === void 0 ? void 0 : _g.isTweening) && (phaserGameObject === null || phaserGameObject === void 0 ? void 0 : phaserGameObject.visible)) {
                    entity.tween.update();
                    x += entity.tween.offset.x;
                    y += entity.tween.offset.y;
                    rotate += entity.tween.offset.rotate;
                }
                if (((_h = entity.tween) === null || _h === void 0 ? void 0 : _h.isTweening) ||
                    entity.isTransforming() ||
                    entity == taro.client.selectedUnit ||
                    entity._category == 'item') {
                    // var timeStart = performance.now();
                    entity.transformTexture(x, y, rotate);
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
                var trigger = taro.triggersQueued.shift();
                taro.script.trigger(trigger.name, trigger.params);
            }
        }
    };
    EntitiesToRender.prototype.frameTick = function () {
        var _a;
        (_a = taro.script) === null || _a === void 0 ? void 0 : _a.trigger("renderTick");
        taro.input.processInputOnEveryFps();
        taro.engineStep(Date.now(), 1000 / 60);
        taro._renderFrames++;
        this.updateAllEntities();
    };
    return EntitiesToRender;
}());
//# sourceMappingURL=EntitiesToRender.js.map