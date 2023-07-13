var EntityEditor = /** @class */ (function () {
    function EntityEditor(gameScene, devModeScene, devModeTools) {
        var _this = this;
        this.gameScene = gameScene;
        this.devModeTools = devModeTools;
        var COLOR_ANGLE = this.COLOR_ANGLE = 0xD1D5DB;
        var COLOR_SCALE = this.COLOR_SCALE = 0x00fffb;
        this.preview = gameScene.add.image(0, 0, null, 0);
        this.preview.setAlpha(0.75).setVisible(false);
        this.outline = gameScene.add.graphics();
        this.outline.depth = 1000;
        var selectionContainer = this.selectionContainer = new Phaser.GameObjects.Container(gameScene);
        var dragPoints = this.dragPoints = {};
        dragPoints['topLeft'] = gameScene.add.rectangle(0, 0, 10, 10, COLOR_ANGLE);
        dragPoints['topLeft'].functionality = 'angle';
        dragPoints['top'] = gameScene.add.rectangle(0, 0, 10, 10, COLOR_SCALE);
        dragPoints['top'].functionality = 'scale';
        dragPoints['topRight'] = gameScene.add.rectangle(0, 0, 10, 10, COLOR_ANGLE);
        dragPoints['topRight'].functionality = 'angle';
        dragPoints['right'] = gameScene.add.rectangle(0, 0, 10, 10, COLOR_SCALE);
        dragPoints['right'].functionality = 'scale';
        dragPoints['bottomRight'] = gameScene.add.rectangle(0, 0, 10, 10, COLOR_ANGLE);
        dragPoints['bottomRight'].functionality = 'angle';
        dragPoints['bottom'] = gameScene.add.rectangle(0, 0, 10, 10, COLOR_SCALE);
        dragPoints['bottom'].functionality = 'scale';
        dragPoints['bottomLeft'] = gameScene.add.rectangle(0, 0, 10, 10, COLOR_ANGLE);
        dragPoints['bottomLeft'].functionality = 'angle';
        dragPoints['left'] = gameScene.add.rectangle(0, 0, 10, 10, COLOR_SCALE);
        dragPoints['left'].functionality = 'scale';
        Object.values(dragPoints).forEach(function (point) { return selectionContainer.add(point); });
        selectionContainer.setPosition(10, 10).setAngle(0).setVisible(false);
        gameScene.add.existing(selectionContainer);
        Object.values(this.dragPoints).forEach(function (point) {
            if (point.functionality === 'angle') {
                point.setInteractive({ draggable: true, cursor: 'url(assets/cursors/rotate.cur), pointer' });
            }
            else {
                point.setInteractive({ draggable: true /* , cursor: 'url(assets/cursors/resize.cur), pointer'*/ });
            }
            point.on('pointerover', function () {
                point.setScale(1.5);
                point.fillColor = devModeTools.COLOR_LIGHT;
            });
            point.on('pointerout', function () {
                point.setScale(1);
                if (point.functionality === 'angle') {
                    point.fillColor = COLOR_ANGLE;
                }
                else {
                    point.fillColor = COLOR_SCALE;
                }
            });
            point.on('pointerdown', function (pointer) {
                var selectedEntityImage = _this.selectedEntityImage;
                if (!devModeTools.cursorButton.active || !selectedEntityImage)
                    return;
                _this.activeDragPoint = true;
                var worldPoint = _this.gameScene.cameras.main.getWorldPoint(pointer.x, pointer.y);
                selectedEntityImage.startDragX = worldPoint.x;
                selectedEntityImage.startDragY = worldPoint.y;
                selectedEntityImage.rotation = selectedEntityImage.image.rotation;
                selectedEntityImage.scale = selectedEntityImage.image.scale;
            });
            gameScene.input.on('drag', function (pointer, gameObject, dragX, dragY) {
                var worldPoint = _this.gameScene.cameras.main.getWorldPoint(pointer.x, pointer.y);
                var selectedEntityImage = _this.selectedEntityImage;
                if (!devModeTools.cursorButton.active || gameObject !== point || !selectedEntityImage)
                    return;
                var action = selectedEntityImage.action;
                var editedAction = selectedEntityImage.editedAction;
                if (!isNaN(action.angle) && gameObject.functionality === 'angle') {
                    var startingAngle = Phaser.Math.Angle.BetweenPoints(selectedEntityImage.image, { x: selectedEntityImage.startDragX, y: selectedEntityImage.startDragY });
                    var lastAngle = Phaser.Math.Angle.BetweenPoints(selectedEntityImage.image, worldPoint);
                    var targetAngle = lastAngle - startingAngle;
                    selectedEntityImage.image.rotation = selectedEntityImage.rotation + targetAngle;
                    editedAction.angle = selectedEntityImage.image.angle;
                }
                else if (gameObject.functionality === 'scale' && !isNaN(action.width) && !isNaN(action.height)) {
                    var distanceToStart = Phaser.Math.Distance.Between(selectedEntityImage.image.x, selectedEntityImage.image.y, selectedEntityImage.startDragX, selectedEntityImage.startDragY);
                    var distanceToCurrent = Phaser.Math.Distance.Between(selectedEntityImage.image.x, selectedEntityImage.image.y, worldPoint.x, worldPoint.y);
                    selectedEntityImage.image.scale = selectedEntityImage.scale * (distanceToCurrent / distanceToStart);
                    editedAction.width = selectedEntityImage.image.displayWidth;
                    editedAction.height = selectedEntityImage.image.displayHeight;
                }
                selectedEntityImage.updateOutline();
            });
            gameScene.input.on('dragend', function (pointer, gameObject) {
                var selectedEntityImage = _this.selectedEntityImage;
                if (gameObject !== point || !selectedEntityImage)
                    return;
                _this.activeDragPoint = false;
                selectedEntityImage.dragMode = null;
                selectedEntityImage.edit(selectedEntityImage.editedAction);
                selectedEntityImage.editedAction = { actionId: selectedEntityImage.action.actionId };
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
                        x: worldPoint.x,
                        y: worldPoint.y
                    },
                    width: width,
                    height: height,
                    angle: 0,
                    actionId: taro.newIdHex()
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
        this.selectedEntityImage = null;
    }
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
        if (this.selectedEntityImage)
            this.selectedEntityImage.updateOutline();
        this.selectedEntityImage = entityImage;
        entityImage.updateOutline();
    };
    EntityEditor.prototype.deleteInitEntity = function () {
        if (this.selectedEntityImage) {
            this.selectedEntityImage.delete();
            this.selectedEntityImage = null;
        }
    };
    return EntityEditor;
}());
//# sourceMappingURL=EntityEditor.js.map