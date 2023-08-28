var EntityImage = /** @class */ (function () {
    function EntityImage(scene, devModeTools, entityImages, action, type) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        this.scene = scene;
        this.devModeTools = devModeTools;
        var entityEditor = this.entityEditor = devModeTools.entityEditor;
        this.action = action;
        var key;
        var entityTypeData;
        if (action.entityType === 'unitTypes') {
            entityTypeData = taro.game.data[action.entityType] && taro.game.data[action.entityType][action.entity];
            if (!entityTypeData)
                return;
            key = "unit/".concat(entityTypeData.cellSheet.url);
        }
        else if (type === 'unit') {
            entityTypeData = taro.game.data['unitTypes'] && taro.game.data['unitTypes'][action.unitType];
            if (!entityTypeData)
                return;
            key = "unit/".concat(entityTypeData.cellSheet.url);
        }
        else if (action.entityType === 'itemTypes') {
            entityTypeData = taro.game.data[action.entityType] && taro.game.data[action.entityType][action.entity];
            if (!entityTypeData)
                return;
            key = "item/".concat(entityTypeData.cellSheet.url);
        }
        else if (type === 'item') {
            entityTypeData = taro.game.data['itemTypes'] && taro.game.data['itemTypes'][action.itemType];
            if (!entityTypeData)
                return;
            key = "item/".concat(entityTypeData.cellSheet.url);
        }
        else if (action.entityType === 'projectileTypes') {
            entityTypeData = taro.game.data[action.entityType] && taro.game.data[action.entityType][action.entity];
            if (!entityTypeData)
                return;
            key = "projectile/".concat(entityTypeData.cellSheet.url);
        }
        else if (type === 'projectile') {
            entityTypeData = taro.game.data['projectileTypes'] && taro.game.data['projectileTypes'][action.projectileType];
            if (!entityTypeData)
                return;
            key = "projectile/".concat(entityTypeData.cellSheet.url);
        }
        this.defaultWidth = (_b = (_a = entityTypeData.bodies) === null || _a === void 0 ? void 0 : _a.default) === null || _b === void 0 ? void 0 : _b.width;
        this.defaultHeight = (_d = (_c = entityTypeData.bodies) === null || _c === void 0 ? void 0 : _c.default) === null || _d === void 0 ? void 0 : _d.height;
        var image = this.image = scene.add.image((_e = action.position) === null || _e === void 0 ? void 0 : _e.x, (_f = action.position) === null || _f === void 0 ? void 0 : _f.y, key);
        if (!isNaN(action.angle))
            image.angle = action.angle;
        if (!isNaN(action.width) && !isNaN(action.height))
            image.setDisplaySize(action.width, action.height);
        if (taro.developerMode.active && taro.developerMode.activeTab === 'map') {
            image.setVisible(true);
        }
        else {
            image.setVisible(false);
        }
        image.setInteractive({ draggable: true });
        image.entity = this;
        entityImages.push(image);
        var lastTime = 0;
        var editedAction = this.editedAction = { actionId: action.actionId };
        image.on('pointerdown', function () {
            if (!devModeTools.cursorButton.active)
                return;
            if (entityEditor.selectedEntityImage !== _this) {
                entityEditor.selectEntityImage(_this);
            }
            //double click
            var clickDelay = taro._currentTime - lastTime;
            lastTime = taro._currentTime;
            if (clickDelay < 350) {
                if (inGameEditor && inGameEditor.showScriptForEntity) {
                    inGameEditor.showScriptForEntity(action.actionId);
                }
            }
            _this.startDragX = image.x;
            _this.startDragY = image.y;
            _this.scale = image.scale;
            if (!devModeTools.altKey.isDown && !devModeTools.shiftKey.isDown) {
                _this.dragMode = 'position';
            }
            else if (devModeTools.altKey.isDown) {
                _this.dragMode = 'angle';
                image.rotation = 0;
                editedAction.angle = image.angle;
            }
            else if (devModeTools.shiftKey.isDown) {
                _this.dragMode = 'scale';
                if (!isNaN(_this.defaultWidth) && !isNaN(_this.defaultHeight)) {
                    image.setDisplaySize(_this.defaultWidth, _this.defaultHeight);
                    editedAction.width = _this.defaultWidth;
                    editedAction.height = _this.defaultHeight;
                }
            }
            _this.updateOutline();
        });
        var outlineHover = entityEditor.outlineHover;
        image.on('pointerover', function () {
            scene.input.setTopOnly(true);
            if (!devModeTools.cursorButton.active || entityEditor.activeHandler)
                return;
            _this.updateOutline();
        });
        image.on('pointerout', function () {
            if (entityEditor.selectedEntityImage === _this)
                return;
            outlineHover.clear();
        });
    }
    EntityImage.prototype.edit = function (action) {
        if (!this.action.wasEdited || !action.wasEdited) {
            this.action.wasEdited = true;
            action.wasEdited = true;
        }
        taro.network.send('editInitEntity', action);
    };
    EntityImage.prototype.updateOutline = function (hide) {
        var outline = this.entityEditor.outline;
        var outlineHover = this.entityEditor.outlineHover;
        var selectionContainer = this.entityEditor.selectionContainer;
        if (hide) {
            outline.clear();
            outlineHover.clear();
            selectionContainer.setVisible(false);
            return;
        }
        var handlers = this.entityEditor.handlers;
        var image = this.image;
        if (this.devModeTools.entityEditor.selectedEntityImage === this) {
            outline.clear();
            outlineHover.clear();
            outline.lineStyle(6, 0x036ffc, 1);
            selectionContainer.setVisible(true);
            selectionContainer.x = image.x;
            selectionContainer.y = image.y;
            selectionContainer.angle = image.angle;
            var smallDistance = 20 / this.scene.cameras.main.zoom;
            var largeDistance = 25 / this.scene.cameras.main.zoom;
            handlers.topLeft.setPosition(-image.displayWidth / 2 - smallDistance, -image.displayHeight / 2 - smallDistance);
            handlers.topLeftRotate.setPosition(-image.displayWidth / 2 - largeDistance, -image.displayHeight / 2 - largeDistance);
            handlers.top.setPosition(0, -image.displayHeight / 2 - smallDistance);
            handlers.topRight.setPosition(image.displayWidth / 2 + smallDistance, -image.displayHeight / 2 - smallDistance);
            handlers.topRightRotate.setPosition(image.displayWidth / 2 + largeDistance, -image.displayHeight / 2 - largeDistance);
            handlers.right.setPosition(image.displayWidth / 2 + smallDistance, 0);
            handlers.bottomRight.setPosition(image.displayWidth / 2 + smallDistance, image.displayHeight / 2 + smallDistance);
            handlers.bottomRightRotate.setPosition(image.displayWidth / 2 + largeDistance, image.displayHeight / 2 + largeDistance);
            handlers.bottom.setPosition(0, image.displayHeight / 2 + smallDistance);
            handlers.bottomLeft.setPosition(-image.displayWidth / 2 - smallDistance, image.displayHeight / 2 + smallDistance);
            handlers.bottomLeftRotate.setPosition(-image.displayWidth / 2 - largeDistance, image.displayHeight / 2 + largeDistance);
            handlers.left.setPosition(-image.displayWidth / 2 - smallDistance, 0);
            outline.strokeRect(-image.displayWidth / 2, -image.displayHeight / 2, image.displayWidth, image.displayHeight);
            outline.x = image.x;
            outline.y = image.y;
            outline.angle = image.angle;
        }
        else {
            outlineHover.clear();
            outlineHover.lineStyle(2, 0x036ffc, 1);
            outlineHover.strokeRect(-image.displayWidth / 2, -image.displayHeight / 2, image.displayWidth, image.displayHeight);
            outlineHover.x = image.x;
            outlineHover.y = image.y;
            outlineHover.angle = image.angle;
        }
    };
    EntityImage.prototype.update = function (action) {
        //update action in editor
        if (inGameEditor && inGameEditor.updateAction) {
            inGameEditor.updateAction(action);
        }
        if (action.wasEdited)
            this.action.wasEdited = true;
        if (this.action.position && !isNaN(this.action.position.x) && !isNaN(this.action.position.y) &&
            action.position && !isNaN(action.position.x) && !isNaN(action.position.y)) {
            this.action.position = action.position;
            this.image.x = action.position.x;
            this.image.y = action.position.y;
        }
        if (!isNaN(this.action.angle) && !isNaN(action.angle)) {
            this.action.angle = action.angle;
            this.image.angle = action.angle;
        }
        if (!isNaN(this.action.width) && !isNaN(action.width)) {
            this.action.width = action.width;
            this.image.setDisplaySize(action.width, this.image.displayHeight);
        }
        if (!isNaN(this.action.height) && !isNaN(action.height)) {
            this.action.height = action.height;
            this.image.setDisplaySize(this.image.displayWidth, action.height);
        }
        if (action.wasDeleted) {
            this.hide();
            this.action.wasDeleted = true;
        }
        if (this === this.entityEditor.selectedEntityImage)
            this.updateOutline();
    };
    EntityImage.prototype.hide = function () {
        this.image.alpha = 0;
        this.image.setInteractive(false);
        this.updateOutline(true);
    };
    EntityImage.prototype.delete = function () {
        this.hide();
        var editedAction = { actionId: this.action.actionId, wasDeleted: true };
        this.edit(editedAction);
    };
    return EntityImage;
}());
//# sourceMappingURL=EntityImage.js.map