var EntityEditor = /** @class */ (function () {
    function EntityEditor(gameScene, devModeScene, devModeTools) {
        var _this = this;
        this.gameScene = gameScene;
        this.devModeTools = devModeTools;
        var COLOR_HANDLER = this.COLOR_HANDLER = 0x00fffb;
        this.preview = gameScene.add.image(0, 0, null, 0).setDepth(1000);
        this.preview.setAlpha(0.75).setVisible(false);
        this.outline = gameScene.add.graphics().setDepth(1000);
        this.outlineHover = gameScene.add.graphics().setDepth(1000);
        var selectionContainer = this.selectionContainer = new Phaser.GameObjects.Container(gameScene);
        var scaleArray = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft', 'left', 'right', 'top', 'bottom'];
        var angleArray = ['topLeftRotate', 'topRightRotate', 'bottomRightRotate', 'bottomLeftRotate'];
        var handlers = this.handlers = {};
        this.createHandler('topLeft', 10, 1);
        this.createHandler('topRight', 10, 1);
        this.createHandler('bottomRight', 10, 1);
        this.createHandler('bottomLeft', 10, 1);
        this.createHandler('left', 8, 1);
        this.createHandler('right', 8, 1);
        this.createHandler('top', 8, 1);
        this.createHandler('bottom', 8, 1);
        this.createHandler('topLeftRotate', 20, 0);
        this.createHandler('topRightRotate', 20, 0);
        this.createHandler('bottomRightRotate', 20, 0);
        this.createHandler('bottomLeftRotate', 20, 0);
        Object.values(handlers).forEach(function (handler) { return selectionContainer.add(handler); });
        selectionContainer.setPosition(10, 10).setAngle(0).setDepth(1000).setVisible(false);
        gameScene.add.existing(selectionContainer);
        taro.client.on('scale', function (data) {
            Object.values(_this.handlers).forEach(function (handler) { return handler.setScale(1 / data.ratio); });
            if (_this.selectedEntityImage)
                _this.selectedEntityImage.updateOutline();
        });
        gameScene.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            Object.values(_this.handlers).forEach(function (handler) {
                var worldPoint = _this.gameScene.cameras.main.getWorldPoint(pointer.x, pointer.y);
                var selectedEntityImage = _this.selectedEntityImage;
                if (!devModeTools.cursorButton.active || gameObject !== handler || !selectedEntityImage)
                    return;
                var action = selectedEntityImage.action;
                var editedAction = selectedEntityImage.editedAction;
                if (angleArray.includes(handler.orientation) && !isNaN(action.angle)) {
                    var startingAngle = Phaser.Math.Angle.BetweenPoints(selectedEntityImage.image, { x: selectedEntityImage.startDragX, y: selectedEntityImage.startDragY });
                    var lastAngle = Phaser.Math.Angle.BetweenPoints(selectedEntityImage.image, worldPoint);
                    var targetAngle = lastAngle - startingAngle;
                    selectedEntityImage.image.rotation = selectedEntityImage.rotation + targetAngle;
                    editedAction.angle = selectedEntityImage.image.angle;
                }
                else {
                    if (scaleArray.includes(handler.orientation) && !isNaN(action.width) && !isNaN(action.height)) {
                        var targetPoint = void 0;
                        switch (handler.orientation) {
                            case 'topLeft':
                                _this.rescaleInitEntity(true, true, worldPoint, selectedEntityImage.image.getBottomRight(), selectedEntityImage, editedAction);
                                targetPoint = new Phaser.Math.Vector2((selectedEntityImage.displayWidth - selectedEntityImage.image.displayWidth) / 2, (selectedEntityImage.displayHeight - selectedEntityImage.image.displayHeight) / 2);
                                break;
                            case 'topRight':
                                _this.rescaleInitEntity(true, true, worldPoint, selectedEntityImage.image.getBottomLeft(), selectedEntityImage, editedAction);
                                targetPoint = new Phaser.Math.Vector2((selectedEntityImage.image.displayWidth - selectedEntityImage.displayWidth) / 2, (selectedEntityImage.displayHeight - selectedEntityImage.image.displayHeight) / 2);
                                break;
                            case 'bottomRight':
                                _this.rescaleInitEntity(true, true, worldPoint, selectedEntityImage.image.getTopLeft(), selectedEntityImage, editedAction);
                                targetPoint = new Phaser.Math.Vector2((selectedEntityImage.image.displayWidth - selectedEntityImage.displayWidth) / 2, (selectedEntityImage.image.displayHeight - selectedEntityImage.displayHeight) / 2);
                                break;
                            case 'bottomLeft':
                                _this.rescaleInitEntity(true, true, worldPoint, selectedEntityImage.image.getTopRight(), selectedEntityImage, editedAction);
                                targetPoint = new Phaser.Math.Vector2((selectedEntityImage.displayWidth - selectedEntityImage.image.displayWidth) / 2, (selectedEntityImage.image.displayHeight - selectedEntityImage.displayHeight) / 2);
                                break;
                            case 'left':
                                _this.rescaleInitEntity(true, false, worldPoint, selectedEntityImage.image.getRightCenter(), selectedEntityImage, editedAction);
                                targetPoint = new Phaser.Math.Vector2((selectedEntityImage.displayWidth - selectedEntityImage.image.displayWidth) / 2, 0);
                                break;
                            case 'right':
                                _this.rescaleInitEntity(true, false, worldPoint, selectedEntityImage.image.getLeftCenter(), selectedEntityImage, editedAction);
                                targetPoint = new Phaser.Math.Vector2((selectedEntityImage.image.displayWidth - selectedEntityImage.displayWidth) / 2, 0);
                                break;
                            case 'top':
                                _this.rescaleInitEntity(false, true, worldPoint, selectedEntityImage.image.getBottomCenter(), selectedEntityImage, editedAction);
                                targetPoint = new Phaser.Math.Vector2(0, (selectedEntityImage.displayHeight - selectedEntityImage.image.displayHeight) / 2);
                                break;
                            case 'bottom':
                                _this.rescaleInitEntity(false, true, worldPoint, selectedEntityImage.image.getTopCenter(), selectedEntityImage, editedAction);
                                targetPoint = new Phaser.Math.Vector2(0, (selectedEntityImage.image.displayHeight - selectedEntityImage.displayHeight) / 2);
                                break;
                            default:
                                break;
                        }
                        targetPoint.rotate(selectedEntityImage.image.rotation);
                        var x = Math.floor(selectedEntityImage.x + targetPoint.x);
                        var y = Math.floor(selectedEntityImage.y + targetPoint.y);
                        selectedEntityImage.image.x = x;
                        selectedEntityImage.image.y = y;
                        editedAction.position = { x: x, y: y };
                    }
                }
                selectedEntityImage.updateOutline();
            });
            devModeScene.entityImages.forEach(function (entityImage) {
                if (!devModeTools.cursorButton.active || gameObject !== entityImage)
                    return;
                var entity = entityImage.entity;
                if (entity.dragMode === 'position') {
                    var x = Math.floor(dragX);
                    var y = Math.floor(dragY);
                    gameObject.x = x;
                    gameObject.y = y;
                    entity.editedAction.position = { x: x, y: y };
                }
                else if (entity.dragMode === 'angle' && !isNaN(entity.action.angle)) {
                    var target = Phaser.Math.Angle.BetweenPoints(gameObject, { x: dragX, y: dragY });
                    gameObject.rotation = target;
                    entity.editedAction.angle = gameObject.angle;
                }
                else if (entity.dragMode === 'scale' && !isNaN(entity.action.width) && !isNaN(entity.action.height)) {
                    var dragScale = Math.min(500, Math.max(-250, (entity.startDragY - dragY)));
                    gameObject.scale = entity.scale + entity.scale * dragScale / 500;
                    entity.editedAction.width = Math.floor(entityImage.displayWidth);
                    entity.editedAction.height = Math.floor(entityImage.displayHeight);
                }
                entity.updateOutline();
            });
        });
        gameScene.input.on('dragend', function (pointer, gameObject) {
            Object.values(_this.handlers).forEach(function (handler) {
                var selectedEntityImage = _this.selectedEntityImage;
                if (gameObject !== handler || !selectedEntityImage)
                    return;
                _this.activeHandler = false;
                selectedEntityImage.dragMode = null;
                selectedEntityImage.edit(selectedEntityImage.editedAction);
                selectedEntityImage.editedAction = { actionId: selectedEntityImage.action.actionId };
            });
            devModeScene.entityImages.forEach(function (entityImage) {
                if (gameObject !== entityImage)
                    return;
                var entity = entityImage.entity;
                entity.dragMode = null;
                entity.edit(entity.editedAction);
                entity.editedAction = { actionId: entity.action.actionId };
            });
        });
        Object.values(this.handlers).forEach(function (handler) {
            if (angleArray.includes(handler.orientation)) {
                handler.setInteractive({ draggable: true, cursor: 'url(/assets/cursors/rotate.cur), pointer' });
            }
            else {
                selectionContainer.bringToTop(handler);
                handler.setInteractive({ draggable: true /* , cursor: 'url(assets/cursors/resize.cur), pointer'*/ });
            }
            handler.on('pointerover', function () {
                gameScene.input.setTopOnly(true);
                handler.fillColor = devModeTools.COLOR_LIGHT;
            });
            handler.on('pointerout', function () {
                if (angleArray.includes(handler.orientation)) {
                    handler.fillColor = COLOR_HANDLER;
                }
                else {
                    handler.fillColor = COLOR_HANDLER;
                }
            });
            handler.on('pointerdown', function (pointer) {
                var selectedEntityImage = _this.selectedEntityImage;
                if (!devModeTools.cursorButton.active || !selectedEntityImage)
                    return;
                _this.activeHandler = true;
                var worldPoint = _this.gameScene.cameras.main.getWorldPoint(pointer.x, pointer.y);
                selectedEntityImage.startDragX = worldPoint.x;
                selectedEntityImage.startDragY = worldPoint.y;
                selectedEntityImage.rotation = selectedEntityImage.image.rotation;
                selectedEntityImage.scale = selectedEntityImage.image.scale;
                selectedEntityImage.scaleX = selectedEntityImage.image.scaleX;
                selectedEntityImage.scaleY = selectedEntityImage.image.scaleY;
                selectedEntityImage.displayWidth = selectedEntityImage.image.displayWidth;
                selectedEntityImage.displayHeight = selectedEntityImage.image.displayHeight;
                selectedEntityImage.x = selectedEntityImage.image.x;
                selectedEntityImage.y = selectedEntityImage.image.y;
            });
        });
        taro.client.on('updateActiveEntity', function () {
            _this.activeEntity = inGameEditor.getActiveEntity && inGameEditor.getActiveEntity();
            _this.updatePreview();
        });
        gameScene.input.on('pointerdown', function (p) {
            var _a, _b, _c;
            if (!p.leftButtonDown())
                return;
            var entityData = _this.activeEntity;
            if (_this.activeEntityPlacement && entityData) {
                var worldPoint = gameScene.cameras.main.getWorldPoint(_this.gameScene.input.activePointer.x, _this.gameScene.input.activePointer.y);
                var entity = taro.game.data[entityData.entityType] && taro.game.data[entityData.entityType][entityData.id];
                var actionType = void 0;
                var height = void 0;
                var width = void 0;
                if (entityData.entityType === 'unitTypes') {
                    actionType = 'createEntityForPlayerAtPositionWithDimensions';
                    if ((_a = entity.bodies) === null || _a === void 0 ? void 0 : _a.default) {
                        height = entity.bodies.default.height;
                        width = entity.bodies.default.width;
                    }
                    else {
                        console.log('no default body for unit', entityData.id);
                        return;
                    }
                }
                else if (entityData.entityType === 'itemTypes') {
                    actionType = 'createEntityAtPositionWithDimensions';
                    if ((_b = entity.bodies) === null || _b === void 0 ? void 0 : _b.dropped) {
                        height = entity.bodies.dropped.height;
                        width = entity.bodies.dropped.width;
                    }
                    else {
                        console.log('no dropped body for item', entityData.id);
                        return;
                    }
                }
                else if (entityData.entityType === 'projectileTypes') {
                    actionType = 'createEntityAtPositionWithDimensions';
                    if ((_c = entity.bodies) === null || _c === void 0 ? void 0 : _c.default) {
                        height = entity.bodies.default.height;
                        width = entity.bodies.default.width;
                    }
                    else {
                        console.log('no default body for projectile', entityData.id);
                        return;
                    }
                }
                var action = {
                    type: actionType,
                    entity: entityData.id,
                    entityType: entityData.entityType,
                    position: {
                        function: 'xyCoordinate',
                        x: Math.floor(worldPoint.x),
                        y: Math.floor(worldPoint.y)
                    },
                    width: width,
                    height: height,
                    angle: 0,
                    actionId: taro.newIdHex(),
                    wasCreated: true
                };
                if (entityData.entityType === 'unitTypes') {
                    action.player = {
                        variableName: entityData.player,
                        function: 'getVariable'
                    };
                }
                devModeScene.createEntityImage(action);
                taro.network.send('editInitEntity', action);
            }
        });
        gameScene.input.on('pointerdown', function (pointer, gameObjects) {
            if (!pointer.leftButtonDown() || !_this.selectedEntityImage)
                return;
            if (gameObjects.includes(_this.selectedEntityImage.image))
                return;
            var outside = false;
            if (gameObjects.length === 0) {
                outside = true;
            }
            gameObjects.forEach(function (gameObject) {
                if (!gameObject.entity && !gameObject.orientation) {
                    outside = true;
                }
            });
            if (outside) {
                _this.devModeTools.entityEditor.selectEntityImage(null);
            }
        });
        devModeScene.input.on('pointerdown', function (pointer, gameObjects) {
            if (!_this.selectedEntityImage)
                return;
            if (gameObjects.includes(_this.selectedEntityImage.image))
                return;
            if (gameObjects.length > 0) {
                _this.devModeTools.entityEditor.selectEntityImage(null);
            }
        });
        this.selectEntityImage(null);
    }
    EntityEditor.prototype.createHandler = function (orientation, size, alpha) {
        this.handlers[orientation] = this.gameScene.add.rectangle(0, 0, size, size, this.COLOR_HANDLER, alpha);
        this.handlers[orientation].orientation = orientation;
    };
    EntityEditor.prototype.activatePlacement = function (active) {
        if (active) {
            //show entities list
            this.activeEntityPlacement = true;
            inGameEditor.toggleEntityPlacementWindow && inGameEditor.toggleEntityPlacementWindow(true);
            if (!this.devModeTools.paletteButton.hidden) {
                this.devModeTools.palette.toggle();
            }
        }
        else {
            //hide entities list
            this.activeEntityPlacement = false;
            inGameEditor.toggleEntityPlacementWindow && inGameEditor.toggleEntityPlacementWindow(false);
            if (this.devModeTools.paletteButton.hidden) {
                this.devModeTools.palette.toggle();
            }
        }
    };
    EntityEditor.prototype.updatePreview = function () {
        var _a, _b, _c;
        var entityData = this.activeEntity;
        if (!entityData) {
            this.preview.setVisible(false);
            return;
        }
        var entity = taro.game.data[entityData.entityType] && taro.game.data[entityData.entityType][entityData.id];
        var height;
        var width;
        var key;
        if (entityData.entityType === 'unitTypes') {
            key = "unit/".concat(entity.cellSheet.url);
            if ((_a = entity.bodies) === null || _a === void 0 ? void 0 : _a.default) {
                height = entity.bodies.default.height;
                width = entity.bodies.default.width;
            }
            else {
                console.log('no default body for unit', entityData.id);
                return;
            }
        }
        else if (entityData.entityType === 'itemTypes') {
            key = "item/".concat(entity.cellSheet.url);
            if ((_b = entity.bodies) === null || _b === void 0 ? void 0 : _b.dropped) {
                height = entity.bodies.dropped.height;
                width = entity.bodies.dropped.width;
            }
            else {
                console.log('no dropped body for item', entityData.id);
                return;
            }
        }
        else if (entityData.entityType === 'projectileTypes') {
            key = "projectile/".concat(entity.cellSheet.url);
            if ((_c = entity.bodies) === null || _c === void 0 ? void 0 : _c.default) {
                height = entity.bodies.default.height;
                width = entity.bodies.default.width;
            }
            else {
                console.log('no default body for projectile', entityData.id);
                return;
            }
        }
        this.preview.setTexture(key, 0).setDisplaySize(width, height).setVisible(true);
    };
    EntityEditor.prototype.update = function () {
        if (this.activeEntityPlacement && this.preview) {
            var worldPoint = this.gameScene.cameras.main.getWorldPoint(this.gameScene.input.activePointer.x, this.gameScene.input.activePointer.y);
            this.preview.x = worldPoint.x;
            this.preview.y = worldPoint.y;
        }
    };
    EntityEditor.prototype.selectEntityImage = function (entityImage) {
        if (entityImage === null) {
            if (this.selectedEntityImage)
                this.selectedEntityImage.updateOutline(true);
            this.selectedEntityImage = null;
            return;
        }
        this.selectedEntityImage = entityImage;
        entityImage.updateOutline();
    };
    EntityEditor.prototype.rescaleInitEntity = function (width, height, worldPoint, imagePoint, selectedEntityImage, editedAction) {
        var distanceToStart = Phaser.Math.Distance.Between(imagePoint.x, imagePoint.y, selectedEntityImage.startDragX, selectedEntityImage.startDragY);
        var distanceToCurrent = Phaser.Math.Distance.Between(imagePoint.x, imagePoint.y, worldPoint.x, worldPoint.y);
        if (width) {
            selectedEntityImage.image.scaleX = selectedEntityImage.scaleX * (distanceToCurrent / distanceToStart);
            editedAction.width = Math.floor(selectedEntityImage.image.displayWidth);
        }
        if (height) {
            selectedEntityImage.image.scaleY = selectedEntityImage.scaleY * (distanceToCurrent / distanceToStart);
            editedAction.height = Math.floor(selectedEntityImage.image.displayHeight);
        }
    };
    EntityEditor.prototype.deleteInitEntity = function () {
        if (this.selectedEntityImage) {
            this.selectedEntityImage.delete();
            this.selectEntityImage(null);
        }
    };
    return EntityEditor;
}());
//# sourceMappingURL=EntityEditor.js.map