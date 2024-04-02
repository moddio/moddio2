class EntityEditor {
	activeEntityPlacement: boolean;
	preview: Phaser.GameObjects.Image;

	outline: Phaser.GameObjects.Graphics;
	outlineHover: Phaser.GameObjects.Graphics;
	selectionContainer: Phaser.GameObjects.Container;
	handlers: Record<string, Phaser.GameObjects.Rectangle & { orientation?: HandlerType }>;
	activeHandler: boolean;

	activeEntity: { id: string; player: string; entityType: string };
	selectedEntityImage: EntityImage;

	COLOR_HANDLER: number;

	constructor(
		private gameScene: GameScene,
		devModeScene: DevModeScene,
		private devModeTools: DevModeTools
	) {
		const COLOR_HANDLER = (this.COLOR_HANDLER = 0x00fffb);

		this.preview = gameScene.add.image(0, 0, null, 0).setDepth(1000);
		this.preview.setAlpha(0.75).setVisible(false);

		this.outline = gameScene.add.graphics().setDepth(1000);
		this.outlineHover = gameScene.add.graphics().setDepth(1000);
		const selectionContainer = (this.selectionContainer = new Phaser.GameObjects.Container(gameScene));

		const scaleArray = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft', 'left', 'right', 'top', 'bottom'];
		const angleArray = ['topLeftRotate', 'topRightRotate', 'bottomRightRotate', 'bottomLeftRotate'];

		const handlers = (this.handlers = {});
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

		Object.values(handlers).forEach((handler: Phaser.GameObjects.Rectangle) => selectionContainer.add(handler));
		selectionContainer.setPosition(10, 10).setAngle(0).setDepth(1000).setVisible(false);
		gameScene.add.existing(selectionContainer);

		taro.client.on('scale', (data: { ratio: number }) => {
			Object.values(this.handlers).forEach((handler: Phaser.GameObjects.Rectangle) => handler.setScale(1 / data.ratio));
			if (this.selectedEntityImage) this.selectedEntityImage.updateOutline();
		});

		gameScene.input.on('drag', (pointer, gameObject, dragX, dragY) => {
			Object.values(this.handlers).forEach((handler) => {
				const worldPoint = this.gameScene.cameras.main.getWorldPoint(pointer.x, pointer.y);
				const selectedEntityImage = this.selectedEntityImage;
				if (devModeTools.activeButton !== 'cursor' || gameObject !== handler || !selectedEntityImage) return;
				const action = selectedEntityImage.action;
				const editedAction = selectedEntityImage.editedAction;

				if (angleArray.includes(handler.orientation) && !isNaN(action.angle)) {
					const startingAngle = Phaser.Math.Angle.BetweenPoints(selectedEntityImage.image, {
						x: selectedEntityImage.startDragX,
						y: selectedEntityImage.startDragY,
					});
					const lastAngle = Phaser.Math.Angle.BetweenPoints(selectedEntityImage.image, worldPoint);
					const targetAngle = lastAngle - startingAngle;
					selectedEntityImage.image.rotation = selectedEntityImage.rotation + targetAngle;
					editedAction.angle = selectedEntityImage.image.angle;
				} else {
					if (scaleArray.includes(handler.orientation) && !isNaN(action.width) && !isNaN(action.height)) {
						let targetPoint;
						switch (handler.orientation) {
							case 'topLeft':
								this.rescaleInitEntity(
									true,
									true,
									worldPoint,
									selectedEntityImage.image.getBottomRight(),
									selectedEntityImage,
									editedAction
								);
								targetPoint = new Phaser.Math.Vector2(
									(selectedEntityImage.displayWidth - selectedEntityImage.image.displayWidth) / 2,
									(selectedEntityImage.displayHeight - selectedEntityImage.image.displayHeight) / 2
								);
								break;
							case 'topRight':
								this.rescaleInitEntity(
									true,
									true,
									worldPoint,
									selectedEntityImage.image.getBottomLeft(),
									selectedEntityImage,
									editedAction
								);
								targetPoint = new Phaser.Math.Vector2(
									(selectedEntityImage.image.displayWidth - selectedEntityImage.displayWidth) / 2,
									(selectedEntityImage.displayHeight - selectedEntityImage.image.displayHeight) / 2
								);
								break;
							case 'bottomRight':
								this.rescaleInitEntity(
									true,
									true,
									worldPoint,
									selectedEntityImage.image.getTopLeft(),
									selectedEntityImage,
									editedAction
								);
								targetPoint = new Phaser.Math.Vector2(
									(selectedEntityImage.image.displayWidth - selectedEntityImage.displayWidth) / 2,
									(selectedEntityImage.image.displayHeight - selectedEntityImage.displayHeight) / 2
								);
								break;
							case 'bottomLeft':
								this.rescaleInitEntity(
									true,
									true,
									worldPoint,
									selectedEntityImage.image.getTopRight(),
									selectedEntityImage,
									editedAction
								);
								targetPoint = new Phaser.Math.Vector2(
									(selectedEntityImage.displayWidth - selectedEntityImage.image.displayWidth) / 2,
									(selectedEntityImage.image.displayHeight - selectedEntityImage.displayHeight) / 2
								);
								break;
							case 'left':
								this.rescaleInitEntity(
									true,
									false,
									worldPoint,
									selectedEntityImage.image.getRightCenter(),
									selectedEntityImage,
									editedAction
								);
								targetPoint = new Phaser.Math.Vector2(
									(selectedEntityImage.displayWidth - selectedEntityImage.image.displayWidth) / 2,
									0
								);
								break;
							case 'right':
								this.rescaleInitEntity(
									true,
									false,
									worldPoint,
									selectedEntityImage.image.getLeftCenter(),
									selectedEntityImage,
									editedAction
								);
								targetPoint = new Phaser.Math.Vector2(
									(selectedEntityImage.image.displayWidth - selectedEntityImage.displayWidth) / 2,
									0
								);
								break;
							case 'top':
								this.rescaleInitEntity(
									false,
									true,
									worldPoint,
									selectedEntityImage.image.getBottomCenter(),
									selectedEntityImage,
									editedAction
								);
								targetPoint = new Phaser.Math.Vector2(
									0,
									(selectedEntityImage.displayHeight - selectedEntityImage.image.displayHeight) / 2
								);
								break;
							case 'bottom':
								this.rescaleInitEntity(
									false,
									true,
									worldPoint,
									selectedEntityImage.image.getTopCenter(),
									selectedEntityImage,
									editedAction
								);
								targetPoint = new Phaser.Math.Vector2(
									0,
									(selectedEntityImage.image.displayHeight - selectedEntityImage.displayHeight) / 2
								);
								break;
							default:
								break;
						}
						targetPoint.rotate(selectedEntityImage.image.rotation);
						const x = Math.floor(Number(selectedEntityImage.x) + Number(targetPoint.x));
						const y = Math.floor(Number(selectedEntityImage.y) + Number(targetPoint.y));
						selectedEntityImage.image.x = x;
						selectedEntityImage.image.y = y;
						editedAction.position = { x: x, y: y };
					}
				}
				selectedEntityImage.updateOutline();
			});

			devModeScene.entityImages.forEach((entityImage: Phaser.GameObjects.Image & { entity: EntityImage }) => {
				if (devModeTools.activeButton !== 'cursor' || gameObject !== entityImage) return;
				const entity = entityImage.entity;
				if (entity.dragMode === 'position') {
					const x = Math.floor(dragX);
					const y = Math.floor(dragY);
					gameObject.x = x;
					gameObject.y = y;
					entity.editedAction.position = { x: x, y: y };
				} else if (entity.dragMode === 'angle' && !isNaN(entity.action.angle)) {
					const target = Phaser.Math.Angle.BetweenPoints(gameObject, { x: dragX, y: dragY });
					gameObject.rotation = target;
					entity.editedAction.angle = gameObject.angle;
				} else if (entity.dragMode === 'scale' && !isNaN(entity.action.width) && !isNaN(entity.action.height)) {
					const dragScale = Math.min(500, Math.max(-250, entity.startDragY - dragY));
					gameObject.scale = entity.scale + (entity.scale * dragScale) / 500;
					entity.editedAction.width = Math.floor(entityImage.displayWidth);
					entity.editedAction.height = Math.floor(entityImage.displayHeight);
				}
				entity.updateOutline();
			});
		});

		gameScene.input.on('dragend', (pointer, gameObject) => {
			Object.values(this.handlers).forEach((handler) => {
				const selectedEntityImage = this.selectedEntityImage;
				if (gameObject !== handler || !selectedEntityImage) return;
				this.activeHandler = false;
				selectedEntityImage.dragMode = null;
				selectedEntityImage.edit(selectedEntityImage.editedAction);
				selectedEntityImage.editedAction = { actionId: selectedEntityImage.action.actionId };
			});
			devModeScene.entityImages.forEach((entityImage: Phaser.GameObjects.Image & { entity: EntityImage }) => {
				if (gameObject !== entityImage) return;
				const entity = entityImage.entity;
				entity.dragMode = null;
				entity.edit(entity.editedAction);
				entity.editedAction = { actionId: entity.action.actionId };
			});
		});

		Object.values(this.handlers).forEach((handler) => {
			if (angleArray.includes(handler.orientation)) {
				handler.setInteractive({ draggable: true, cursor: 'url(/assets/cursors/rotate.cur), pointer' });
			} else {
				selectionContainer.bringToTop(handler);
				handler.setInteractive({ draggable: true /* , cursor: 'url(assets/cursors/resize.cur), pointer'*/ });
			}

			handler.on('pointerover', () => {
				gameScene.input.setTopOnly(true);
				handler.fillColor = devModeTools.COLOR_LIGHT;
			});

			handler.on('pointerout', () => {
				if (angleArray.includes(handler.orientation)) {
					handler.fillColor = COLOR_HANDLER;
				} else {
					handler.fillColor = COLOR_HANDLER;
				}
			});

			handler.on('pointerdown', (pointer) => {
				const selectedEntityImage = this.selectedEntityImage;
				if (devModeTools.activeButton !== 'cursor' || !selectedEntityImage) return;

				this.activeHandler = true;
				const worldPoint = this.gameScene.cameras.main.getWorldPoint(pointer.x, pointer.y);
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

		taro.client.on('updateActiveEntity', () => {
			this.activeEntity = inGameEditor.getActiveEntity && inGameEditor.getActiveEntity();
			this.updatePreview();
		});

		gameScene.input.on('pointerdown', (p) => {
			if (!p.leftButtonDown()) return;
			const entityData = this.activeEntity;
			if (this.activeEntityPlacement && entityData) {
				const worldPoint = gameScene.cameras.main.getWorldPoint(
					this.gameScene.input.activePointer.x,
					this.gameScene.input.activePointer.y
				);
				const entity = taro.game.data[entityData.entityType] && taro.game.data[entityData.entityType][entityData.id];
				let actionType;
				let height;
				let width;
				if (entityData.entityType === 'unitTypes') {
					actionType = 'createEntityForPlayerAtPositionWithDimensions';
					if (entity.bodies?.default) {
						height = entity.bodies.default.height;
						width = entity.bodies.default.width;
					} else {
						console.log('no default body for unit', entityData.id);
						return;
					}
				} else if (entityData.entityType === 'itemTypes') {
					actionType = 'createEntityAtPositionWithDimensions';
					if (entity.bodies?.dropped) {
						height = entity.bodies.dropped.height;
						width = entity.bodies.dropped.width;
					} else {
						console.log('no dropped body for item', entityData.id);
						return;
					}
				} else if (entityData.entityType === 'projectileTypes') {
					actionType = 'createEntityAtPositionWithDimensions';
					if (entity.bodies?.default) {
						height = entity.bodies.default.height;
						width = entity.bodies.default.width;
					} else {
						console.log('no default body for projectile', entityData.id);
						return;
					}
				}

				const action: ActionData = {
					type: actionType,
					entity: entityData.id,
					entityType: entityData.entityType,
					position: {
						function: 'xyCoordinate',
						x: Math.floor(worldPoint.x),
						y: Math.floor(worldPoint.y),
					},
					width: width,
					height: height,
					angle: 0,
					actionId: taro.newIdHex(),
					wasCreated: true,
				};
				if (entityData.entityType === 'unitTypes') {
					action.player = {
						variableName: entityData.player,
						function: 'getVariable',
					};
				}
				devModeScene.createEntityImage(action);
				taro.network.send<any>('editInitEntity', action);
			}
		});

		gameScene.input.on('pointerdown', (pointer, gameObjects) => {
			if (!pointer.leftButtonDown() || !this.selectedEntityImage) return;
			if (gameObjects.includes(this.selectedEntityImage.image)) return;
			let outside = false;
			if (gameObjects.length === 0) {
				outside = true;
			}
			gameObjects.forEach((gameObject) => {
				if (!gameObject.entity && !gameObject.orientation) {
					outside = true;
				}
			});
			if (outside) {
				this.devModeTools.entityEditor.selectEntityImage(null);
			}
		});

		devModeScene.input.on('pointerdown', (pointer, gameObjects) => {
			if (!this.selectedEntityImage) return;
			if (gameObjects.includes(this.selectedEntityImage.image)) return;
			if (gameObjects.length > 0) {
				this.devModeTools.entityEditor.selectEntityImage(null);
			}
		});

		this.selectEntityImage(null);
	}

	createHandler(orientation: HandlerType, size: number, alpha: number): void {
		this.handlers[orientation] = this.gameScene.add.rectangle(0, 0, size, size, this.COLOR_HANDLER, alpha);
		this.handlers[orientation].orientation = orientation;
	}

	activatePlacement(active: boolean): void {
		if (active) {
			//show entities list
			this.activeEntityPlacement = true;
			inGameEditor.toggleEntityPlacementWindow && inGameEditor.toggleEntityPlacementWindow(true);

			/*if (!this.devModeTools.paletteButton.hidden) {
                this.devModeTools.palette.toggle();
            }*/
		} else {
			//hide entities list
			this.activeEntityPlacement = false;
			inGameEditor.toggleEntityPlacementWindow && inGameEditor.toggleEntityPlacementWindow(false);

			/*if (this.devModeTools.paletteButton.hidden) {
                this.devModeTools.palette.toggle();
            }*/
		}
	}

	updatePreview(): void {
		const entityData = this.activeEntity;
		if (!entityData) {
			this.preview.setVisible(false);
			return;
		}

		const entity = taro.game.data[entityData.entityType] && taro.game.data[entityData.entityType][entityData.id];
		let height;
		let width;
		let key;

		if (entityData.entityType === 'unitTypes') {
			key = `unit/${entity.cellSheet.url}`;
			if (entity.bodies?.default) {
				height = entity.bodies.default.height;
				width = entity.bodies.default.width;
			} else {
				console.log('no default body for unit', entityData.id);
				return;
			}
		} else if (entityData.entityType === 'itemTypes') {
			key = `item/${entity.cellSheet.url}`;
			if (entity.bodies?.dropped) {
				height = entity.bodies.dropped.height;
				width = entity.bodies.dropped.width;
			} else {
				console.log('no dropped body for item', entityData.id);
				return;
			}
		} else if (entityData.entityType === 'projectileTypes') {
			key = `projectile/${entity.cellSheet.url}`;
			if (entity.bodies?.default) {
				height = entity.bodies.default.height;
				width = entity.bodies.default.width;
			} else {
				console.log('no default body for projectile', entityData.id);
				return;
			}
		}
		this.preview.setTexture(key, 0).setDisplaySize(width, height).setVisible(true);
	}

	update(): void {
		if (this.activeEntityPlacement && this.preview) {
			const worldPoint = this.gameScene.cameras.main.getWorldPoint(
				this.gameScene.input.activePointer.x,
				this.gameScene.input.activePointer.y
			);
			this.preview.x = worldPoint.x;
			this.preview.y = worldPoint.y;
		}
	}

	selectEntityImage(entityImage: EntityImage): void {
		if (entityImage === null) {
			if (this.selectedEntityImage) this.selectedEntityImage.updateOutline(true);
			this.selectedEntityImage = null;
			return;
		}
		this.selectedEntityImage = entityImage;
		entityImage.updateOutline();
	}

	rescaleInitEntity(
		width: boolean,
		height: boolean,
		worldPoint: Phaser.Math.Vector2,
		imagePoint: Phaser.Types.Math.Vector2Like,
		selectedEntityImage: EntityImage,
		editedAction: ActionData
	): void {
		const distanceToStart = Phaser.Math.Distance.Between(
			imagePoint.x,
			imagePoint.y,
			selectedEntityImage.startDragX,
			selectedEntityImage.startDragY
		);
		const distanceToCurrent = Phaser.Math.Distance.Between(imagePoint.x, imagePoint.y, worldPoint.x, worldPoint.y);
		if (width) {
			selectedEntityImage.image.scaleX = selectedEntityImage.scaleX * (distanceToCurrent / distanceToStart);
			editedAction.width = Math.floor(selectedEntityImage.image.displayWidth);
		}
		if (height) {
			selectedEntityImage.image.scaleY = selectedEntityImage.scaleY * (distanceToCurrent / distanceToStart);
			editedAction.height = Math.floor(selectedEntityImage.image.displayHeight);
		}
	}

	deleteInitEntity(): void {
		if (this.selectedEntityImage) {
			this.selectedEntityImage.delete();
			this.selectEntityImage(null);
		}
	}
}

type HandlerType =
	| 'topLeft'
	| 'topRight'
	| 'bottomRight'
	| 'bottomLeft'
	| 'left'
	| 'right'
	| 'top'
	| 'bottom'
	| 'topLeftRotate'
	| 'topRightRotate'
	| 'bottomRightRotate'
	| 'bottomLeftRotate';
