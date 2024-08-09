/**
 * Creates an entity and handles the entity's life cycle and
 * all related entity actions / methods.
 */
var TaroEntity = TaroObject.extend({
	classId: 'TaroEntity',

	init: function (defaultData = {}) {
		TaroObject.prototype.init.call(this);

		// Register the TaroEntity special properties handler for
		// serialise and de-serialise support
		var translateX = defaultData.translate && defaultData.translate.x ? defaultData.translate.x : 0;
		var translateY = defaultData.translate && defaultData.translate.y ? defaultData.translate.y : 0;
		var rotate = defaultData.rotate || 0;
		this._specialProp.push('_texture');
		this._specialProp.push('_eventListeners');
		this._specialProp.push('_aabb');

		this._anchor = new TaroPoint2d(0, 0);
		this._renderPos = { x: 0, y: 0 };

		this._computedOpacity = 1;
		this._opacity = 1;
		this._cell = 1;

		this._flip = 0; // texture flip code 1=horiz 2=vert 3=both

		this._deathTime = undefined;
		this._bornTime = taro._currentTime;

		this._translate = new TaroPoint3d(translateX, translateY, rotate);
		this._oldTranform = [];
		this._hasMoved = true;

		this._rotate = new TaroPoint3d(0, 0, rotate);

		this._scale = new TaroPoint3d(1, 1, 1);
		this._origin = new TaroPoint3d(0.5, 0.5, 0.5);

		this._bounds2d = new TaroPoint2d(40, 40);
		this._bounds3d = new TaroPoint3d(0, 0, 0);

		this._oldBounds2d = new TaroPoint2d(40, 40);
		this._oldBounds3d = new TaroPoint3d(0, 0, 0);

		this._highlight = false;
		this._mouseEventsActive = false;

		this._velocity = new TaroPoint3d(0, 0, 0);

		this._localMatrix = new TaroMatrix2d();
		this._worldMatrix = new TaroMatrix2d();
		this._oldWorldMatrix = new TaroMatrix2d();

		this._lastSeenBy = {};

		this._inView = true;

		this._stats = {};
		this._streamDataQueued = {};
		this.lastUpdatedData = {};
		this._isBeingRemoved = false;
		// this ensures entity is spawning at a correct position initially. particularily useful for projectiles

		this._keyFrames = [];
		this.nextKeyFrame = [taro._currentTime + 50, [this._translate.x, this._translate.y, this._rotate.z]];
		this.clientStreamedKeyFrame = this.nextKeyFrame;
		this._isTransforming = true;
		this.lastTransformedAt = 0;
		this.latestTimeStamp = 0;
		this.isTeleporting = false;
		this.teleportCamera = false;
		this.teleportDestination = this.nextKeyFrame[1];

		this.queuedTriggers = [];

		if (taro.isClient) {
			this.anchorOffset = { x: 0, y: 0, rotate: 0 };
			this.addComponent(TweenComponent);
		}

		// this.compositeCache(true);

		/* CEXCLUDE */
		if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
			// Set the stream floating point precision to 2 as default
			this.streamFloatPrecision(0);
		}
		/* CEXCLUDE */

		// Set the default stream sections as just the transform data
		this.streamSections(['transform']);
	},

	isRendering() {
		return taro.isClient && !!taro.entitiesToRender.trackEntityById[this.id()];
	},

	/**
	 * Sets the entity as visible and able to be interacted with. Note that streaming of visibility state changes is not handled here.
	 * This is because the streaming is managed by the specific entity type (unit/item/projectile) classes themselves to save bandwidth.
	 * For instance, when a unit goes into hiding, all of its items will also hide. To avoid unnecessary streaming of each item's visibility
	 * state to clients, we can assume that all items of a hiding unit will also be hidden.
	 * @example #Show a hidden entity
	 *     entity.show();
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	_show: function () {
		this._stats.isHidden = false;
		if (taro.isClient) {
			this.emit('show');
		}
		return this;
	},

	/**
	 * Sets the entity as hidden and cannot be interacted with.
	 * @example #Hide a visible entity
	 *     entity.hide();
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	_hide: function () {
		this._stats.isHidden = true;
		if (taro.isClient) {
			this.emit('hide');
		}
		return this;
	},

	// update item's body & texture based on stateId given
	setState: function (stateId, defaultData) {
		var self = this;

		// if invalid stateId is given, set state to default state
		if (stateId == undefined || self._stats.states == undefined || self._stats.states[stateId] == undefined) {
			stateId = this.getDefaultStateId();
		}

		var newState = (self._stats.states && self._stats.states[stateId]) || {};
		if (newState && newState.body) {
			/*
			* if state is 'unselected' newState.body = 'none'
				will evaluate to currentBody = undefined

			*/
			self._stats.currentBody = self._stats.bodies[newState.body];
		}

		if (taro.isServer) {
			self.streamUpdateData([{ stateId: stateId }]);
		} else if (taro.isClient) {
			self._stats.stateId = stateId;

			if (newState.sound) {
				for (var soundId in newState.sound) {
					var sound = newState.sound[soundId];
					taro.sound.playSound(sound, this._translate, soundId);
				}
			}
			// height-based-z code
			if (taro.game.data.defaultData.heightBasedZIndex) {
				// code for height-based-zindex
				if (this._category === 'unit') {
					this.emit('dynamic', this._stats.currentBody.type === 'dynamic');
				} else if (this._category === 'item') {
					this.emit('dynamic', true);
				}
			}
		}

		this.script?.trigger('entityStateChanged');

		if (self.previousState === newState) {
			return;
		}
		self.previousState = newState;
		self.updateBody(defaultData);
	},

	/* Checks if entity should be invisible depending on diplomacy status of the owner player of this entity */
	shouldBeInvisible: function (playerA, playerB) {
		return (
			playerA &&
			playerB &&
			((playerA.isHostileTo(playerB) && this._stats.isInvisible == true) ||
				(playerA.isFriendlyTo(playerB) && this._stats.isInvisibleToFriendly == true) ||
				(playerA.isNeutralTo(playerB) && this._stats.isInvisibleToNeutral == true))
		);
	},

	imageUrlToHash: function (url) {
		var hash = 0;
		if (url.length == 0) {
			return hash;
		}
		for (var i = 0; i < url.length; i++) {
			var char = url.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	},

	updateLayer: function () {
		var self = this;
		var defaultLayer = {
			depth: 0,
			layer: 0,
		};
		// parseFloat(Math.random().toFixed(4))
		if (self._category == 'unit') {
			defaultLayer.layer = 3;
			defaultLayer.depth = 3;
		} else if (self._category == 'item') {
			if (self.getOwnerUnit()) {
				defaultLayer.layer = 3;
				defaultLayer.depth = 3;
			} else {
				// doesn't have owner. show it above floor2
				defaultLayer.layer = 2;
				defaultLayer.depth = 5;
			}
		} else if (self._category == 'projectile') {
			defaultLayer.layer = 3;
			defaultLayer.depth = 3;
		}

		var body = self._stats.currentBody;
		if (body) {
			if (!body['z-index']) {
				body['z-index'] = defaultLayer;
			}

			if (isNaN(body['z-index'].depth)) {
				body['z-index'].depth = defaultLayer.depth;
			}
			if (isNaN(body['z-index'].layer)) {
				body['z-index'].layer = defaultLayer.layer;
			}
			self
				.layer(body['z-index'].layer) // above "floor 2 layer", but under "trees layer"
				.depth(body['z-index'].depth);

			if (!isNaN(body['z-index'].offset) || body['z-index'].offset === undefined) {
				self.zOffset(body['z-index'].offset ?? 0);
			}

			self.billboard(!!body['isBillboard']);

			if (!body.rotate) body.rotate = { x: 0, y: 0, z: 0 };
			body.rotate.x ||= 0;
			body.rotate.y ||= 0;
			body.rotate.z ||= 0;
			self.rotate3d(body.rotate.x, body.rotate.y, body.rotate.z);
		}
	},

	applyAnimationById: function (animationId) {
		var animation = null;

		if (
			this._stats.stateId &&
			this._stats.states &&
			this._stats.states[this._stats.stateId] &&
			this._stats.animations[animationId]
		) {
			this._stats.animationId = animationId;
			animation = this._stats.animations[animationId];
		}

		var cellSheet = null;
		cellSheet = this._stats.cellSheet;

		if (animation && cellSheet) {
			this.emit('play-animation', animationId);
		}

		if (taro.isServer) {
			this.streamUpdateData([{ anim: animationId }]);
		}
	},

	applyAnimationForState: function (stateId) {
		var self = this;

		// players can purchase unit skins
		// these custom cellsheets override the default unit cellsheet
		// they should also therefore be geometrically compatible
		var state = taro.game.data.states[stateId];

		// unit or item state config (overrides if present)
		if (self._stats && self._stats.states && self._stats.states[stateId]) {
			state = self._stats.states[stateId];
		}

		if (state) {
			var animationId = state.animation;
			if (animationId) {
				self.applyAnimationById(animationId);
			}
		}
	},

	updateTexture: function () {
		var stateId = this._stats.stateId;
		// if state not explicitly set, use default state
		if (stateId === null) {
			stateId = this.getDefaultStateId();
		}

		if (stateId) {
			this.applyAnimationForState(stateId);
		}
	},

	getDefaultStateId: function () {
		var defaultStateId = null;

		var states = this._stats.states;
		for (i in states) {
			var state = states[i];
			if (!state) {
				continue;
			}
			if (this._category === 'item') {
				if (state.name == 'dropped') {
					defaultStateId = i;
				}
			} else {
				if (state.name == 'default') {
					defaultStateId = i;
				}
			}
		}

		return defaultStateId;
	},

	/**
	 * Gets / sets the cache flag that determines if the entity's
	 * texture rendering output should be stored on an off-screen
	 * canvas instead of calling the texture.render() method each
	 * tick. Useful for expensive texture calls such as rendering
	 * fonts etc. If enabled, this will automatically disable advanced
	 * composite caching on this entity with a call to
	 * compositeCache(false).
	 * @param {Boolean=} val True to enable caching, false to
	 * disable caching.
	 * @example #Enable entity caching
	 *     entity.cache(true);
	 * @example #Disable entity caching
	 *     entity.cache(false);
	 * @example #Get caching flag value
	 *     var val = entity.cache();
	 * @return {*}
	 */
	cache: function (val) {
		if (val !== undefined) {
			this._cache = val;

			if (val) {
				// Create the off-screen canvas
				if (taro.isClient) {
					// Use a real canvas
					this._cacheCanvas = document.createElement('canvas');
				} else {
					// Use dummy objects for canvas and context
					this._cacheCanvas = new TaroDummyCanvas();
				}

				this._cacheCtx = this._cacheCanvas.getContext('2d');
				this._cacheDirty = true;

				// Set smoothing mode
				var smoothing = this._cacheSmoothing !== undefined ? this._cacheSmoothing : taro._globalSmoothing;
				if (!smoothing) {
					this._cacheCtx.imageSmoothingEnabled = false;
					// this._cacheCtx.webkitImageSmoothingEnabled = false;
					this._cacheCtx.mozImageSmoothingEnabled = false;
				} else {
					this._cacheCtx.imageSmoothingEnabled = true;
					// this._cacheCtx.webkitImageSmoothingEnabled = true;
					this._cacheCtx.mozImageSmoothingEnabled = true;
				}

				// Switch off composite caching
				if (this.compositeCache()) {
					this.compositeCache(false);
				}
			} else {
				// Remove the off-screen canvas
				delete this._cacheCanvas;
			}

			return this;
		}

		return this._cache;
	},

	/**
	 * When using the caching system, this boolean determines if the
	 * cache canvas should have image smoothing enabled or not. If
	 * not set, the taro global smoothing setting will be used instead.
	 * @param {Boolean=} val True to enable smoothing, false to disable.
	 * @returns {*}
	 */
	cacheSmoothing: function (val) {
		if (val !== undefined) {
			this._cacheSmoothing = val;
			return this;
		}

		return this._cacheSmoothing;
	},

	/**
	 * Gets / sets composite caching. Composite caching draws this entity
	 * and all of it's children (and their children etc) to a single off
	 * screen canvas so that the entity does not need to be redrawn with
	 * all it's children every tick. For composite entities where little
	 * change occurs this will massively increase rendering performance.
	 * If enabled, this will automatically disable simple caching on this
	 * entity with a call to cache(false).
	 * @param {Boolean=} val
	 * @example #Enable entity composite caching
	 *     entity.compositeCache(true);
	 * @example #Disable entity composite caching
	 *     entity.compositeCache(false);
	 * @example #Get composite caching flag value
	 *     var val = entity.cache();
	 * @return {*}
	 */
	compositeCache: function (val) {
		if (taro.isClient) {
			if (val !== undefined) {
				if (val) {
					// Switch off normal caching
					this.cache(false);

					// Create the off-screen canvas
					this._cacheCanvas = document.createElement('canvas');
					this._cacheCtx = this._cacheCanvas.getContext('2d');
					this._cacheDirty = true;

					// Set smoothing mode
					var smoothing = this._cacheSmoothing !== undefined ? this._cacheSmoothing : taro._globalSmoothing;
					if (!smoothing) {
						this._cacheCtx.imageSmoothingEnabled = false;
						this._cacheCtx.webkitImageSmoothingEnabled = false;
						this._cacheCtx.mozImageSmoothingEnabled = false;
					} else {
						this._cacheCtx.imageSmoothingEnabled = true;
						this._cacheCtx.webkitImageSmoothingEnabled = true;
						this._cacheCtx.mozImageSmoothingEnabled = true;
					}
				}

				// Loop children and set _compositeParent to the correct value
				this._children.each(function () {
					if (val) {
						this._compositeParent = true;
					} else {
						delete this._compositeParent;
					}
				});

				this._compositeCache = val;
				return this;
			}

			return this._compositeCache;
		} else {
			return this;
		}
	},

	/**
	 * Gets / sets the cache dirty flag. If set to true this will
	 * instruct the entity to re-draw it's cached image from the
	 * assigned texture. Once that occurs the flag will automatically
	 * be set back to false. This works in either standard cache mode
	 * or composite cache mode.
	 * @param {Boolean=} val True to force a cache update.
	 * @example #Get cache dirty flag value
	 *     var val = entity.cacheDirty();
	 * @example #Set cache dirty flag value
	 *     entity.cacheDirty(true);
	 * @return {*}
	 */
	cacheDirty: function (val) {
		if (val !== undefined) {
			this._cacheDirty = val;

			// Check if the entity is a child of a composite or composite
			// entity chain and propagate the dirty cache up the chain
			if (val && this._compositeParent && this._parent) {
				this._parent.cacheDirty(val);

				if (!this._cache && !this._compositeCache) {
					// Set clean immediately as no caching is enabled on this child
					this._cacheDirty = false;
				}
			}

			return this;
		}

		return this._cacheDirty;
	},

	/**
	 * Gets the position of the mouse relative to this entity's
	 * center point.
	 * @param {TaroViewport=} viewport The viewport to use as the
	 * base from which the mouse position is determined. If no
	 * viewport is specified then the current viewport the engine
	 * is rendering to is used instead.
	 * @example #Get the mouse position relative to the entity
	 *     // The returned value is an object with properties x, y, z
	 *     var mousePos = entity.mousePos();
	 * @return {TaroPoint3d} The mouse point relative to the entity
	 * center.
	 */
	mousePos: function (viewport) {
		viewport = viewport || taro._currentViewport;
		if (viewport) {
			var mp = viewport._mousePos.clone();
			var cam;

			if (this._ignoreCamera) {
				/* cam = taro._currentCamera;
				mp.thisMultiply(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
				//mp.thisRotate(-cam._rotate.z);
				mp.thisAddPoint(cam._translate); */
			}

			mp.x += viewport._translate.x;
			mp.y += viewport._translate.y;
			this._transformPoint(mp);
			return mp;
		} else {
			return new TaroPoint3d(0, 0, 0);
		}
	},

	/**
	 * Gets the position of the mouse relative to this entity not
	 * taking into account viewport translation.
	 * @param {TaroViewport=} viewport The viewport to use as the
	 * base from which the mouse position is determined. If no
	 * viewport is specified then the current viewport the engine
	 * is rendering to is used instead.
	 * @example #Get absolute mouse position
	 *     var mousePosAbs = entity.mousePosAbsolute();
	 * @return {TaroPoint3d} The mouse point relative to the entity
	 * center.
	 */
	mousePosAbsolute: function (viewport) {
		viewport = viewport || taro._currentViewport;
		if (viewport) {
			var mp = viewport._mousePos.clone();
			this._transformPoint(mp);
			return mp;
		}

		return new TaroPoint3d(0, 0, 0);
	},

	/**
	 * Gets the position of the mouse in world co-ordinates.
	 * @param {TaroViewport=} viewport The viewport to use as the
	 * base from which the mouse position is determined. If no
	 * viewport is specified then the current viewport the engine
	 * is rendering to is used instead.
	 * @example #Get mouse position in world co-ordinates
	 *     var mousePosWorld = entity.mousePosWorld();
	 * @return {TaroPoint3d} The mouse point relative to the world
	 * center.
	 */
	mousePosWorld: function (viewport) {
		viewport = viewport || taro._currentViewport;
		var mp = this.mousePos(viewport);
		this.localToWorldPoint(mp, viewport);

		if (this._ignoreCamera) {
			// viewport.camera._worldMatrix.getInverse().transform([mp]);
		}

		return mp;
	},

	/**
	 * Rotates the entity to point at the target point around the z axis.
	 * @param {TaroPoint3d} point The point in world co-ordinates to
	 * point the entity at.
	 * @example #Point the entity at another entity
	 *     entity.rotateToPoint(otherEntity.worldPosition());
	 * @example #Point the entity at mouse
	 *     entity.rotateToPoint(taro._currentViewport.mousePos());
	 * @example #Point the entity at an arbitrary point x, y
	 *     entity.rotateToPoint(new TaroPoint3d(x, y, 0));
	 * @return {*}
	 */
	rotateToPoint: function (point) {
		var worldPos = this.worldPosition();
		this.rotateTo(
			this._rotate.x,
			this._rotate.y,
			this._rotate.z
			// (Math.atan2(worldPos.y - point.y, worldPos.x - point.x) - this._parent._rotate.z) + Math.radians(270)
		);

		return this;
	},

	/**
	 * Gets / sets the texture to use as the background
	 * pattern for this entity.
	 * @param {TaroTexture} texture The texture to use as
	 * the background.
	 * @param {String=} repeat The type of repeat mode either: "repeat",
	 * "repeat-x", "repeat-y" or "none".
	 * @param {Boolean=} trackCamera If set to true, will track the camera
	 * translation and "move" the background with the camera.
	 * @param {Boolean=} isoTile If true the tiles of the background will
	 * be treated as isometric and will therefore be drawn so that they are
	 * layered seamlessly in isometric view.
	 * @example #Set a background pattern for this entity with 2d tiling
	 *     var texture = new TaroTexture('path/to/my/texture.png');
	 *     entity.backgroundPattern(texture, 'repeat', true, false);
	 * @example #Set a background pattern for this entity with isometric tiling
	 *     var texture = new TaroTexture('path/to/my/texture.png');
	 *     entity.backgroundPattern(texture, 'repeat', true, true);
	 * @return {*}
	 */
	backgroundPattern: function (texture, repeat, trackCamera, isoTile) {
		if (texture !== undefined) {
			this._backgroundPattern = texture;
			this._backgroundPatternRepeat = repeat || 'repeat';
			this._backgroundPatternTrackCamera = trackCamera;
			this._backgroundPatternIsoTile = isoTile;
			this._backgroundPatternFill = null;
			return this;
		}

		return this._backgroundPattern;
	},
	addToRenderer: function (defaultSprite = 0, defaultData) {
		taro.entitiesToRender.trackEntityById[this.id()] = this;
	},

	/**
	 * Set the object's width to the number of tile width's specified.
	 * @param {Number} val Number of tiles.
	 * @param {Boolean=} lockAspect If true, sets the height according
	 * to the texture aspect ratio and the new width.
	 * @example #Set the width of the entity based on the tile width of the map the entity is mounted to
	 *     // Set the entity width to the size of 1 tile with
	 *     // lock aspect enabled which will automatically size
	 *     // the height as well so as to maintain the aspect
	 *     // ratio of the entity
	 *     entity.widthByTile(1, true);
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	widthByTile: function (val, lockAspect) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			var tileSize = this._mode === 0 ? this._parent._tileWidth : this._parent._tileWidth * 2;
			var ratio;

			this.width(val * tileSize);

			if (lockAspect) {
				if (this._texture) {
					// Calculate the height based on the new width
					ratio = this._texture._sizeX / this._bounds2d.x;
					this.height(this._texture._sizeY / ratio);
				} else {
					TaroEntity.prototype.log(
						'Cannot set height based on texture aspect ratio and new width because no texture is currently assigned to the entity!',
						'error'
					);
				}
			}
		} else {
			TaroEntity.prototype.log(
				'Cannot set width by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.',
				'warning'
			);
		}

		return this;
	},

	/**
	 * Set the object's height to the number of tile height's specified.
	 * @param {Number} val Number of tiles.
	 * @param {Boolean=} lockAspect If true, sets the width according
	 * to the texture aspect ratio and the new height.
	 * @example #Set the height of the entity based on the tile height of the map the entity is mounted to
	 *     // Set the entity height to the size of 1 tile with
	 *     // lock aspect enabled which will automatically size
	 *     // the width as well so as to maintain the aspect
	 *     // ratio of the entity
	 *     entity.heightByTile(1, true);
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	heightByTile: function (val, lockAspect) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			var tileSize = this._mode === 0 ? this._parent._tileHeight : this._parent._tileHeight * 2;
			var ratio;

			this.height(val * tileSize);

			if (lockAspect) {
				if (this._texture) {
					// Calculate the width based on the new height
					ratio = this._texture._sizeY / this._bounds2d.y;
					this.width(this._texture._sizeX / ratio);
				} else {
					TaroEntity.prototype.log(
						'Cannot set width based on texture aspect ratio and new height because no texture is currently assigned to the entity!',
						'error'
					);
				}
			}
		} else {
			TaroEntity.prototype.log(
				'Cannot set height by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.',
				'warning'
			);
		}

		return this;
	},

	/**
	 * Adds the object to the tile map at the passed tile co-ordinates. If
	 * no tile co-ordinates are passed, will use the current tile position
	 * and the tileWidth() and tileHeight() values.
	 * @param {Number=} x X co-ordinate of the tile to occupy.
	 * @param {Number=} y Y co-ordinate of the tile to occupy.
	 * @param {Number=} width Number of tiles along the x-axis to occupy.
	 * @param {Number=} height Number of tiles along the y-axis to occupy.
	 */
	occupyTile: function (x, y, width, height) {
		// Check that the entity is mounted to a tile map
		if (this._parent && this._parent.TaroTileMap2d) {
			if (x !== undefined && y !== undefined) {
				this._parent.occupyTile(x, y, width, height, this);
			} else {
				// Occupy tiles based upon tile point and tile width/height
				var trPoint = new TaroPoint3d(
					this._translate.x - (this._tileWidth / 2 - 0.5) * this._parent._tileWidth,
					this._translate.y - (this._tileHeight / 2 - 0.5) * this._parent._tileHeight,
					0
				);
				var tilePoint = this._parent.pointToTile(trPoint);

				if (this._parent._mountMode === 1) {
					tilePoint.thisToIso();
				}

				this._parent.occupyTile(tilePoint.x, tilePoint.y, this._tileWidth, this._tileHeight, this);
			}
		}
		return this;
	},

	/**
	 * Removes the object from the tile map at the passed tile co-ordinates.
	 * If no tile co-ordinates are passed, will use the current tile position
	 * and the tileWidth() and tileHeight() values.
	 * @param {Number=} x X co-ordinate of the tile to un-occupy.
	 * @param {Number=} y Y co-ordinate of the tile to un-occupy.
	 * @param {Number=} width Number of tiles along the x-axis to un-occupy.
	 * @param {Number=} height Number of tiles along the y-axis to un-occupy.
	 * @private
	 */
	unOccupyTile: function (x, y, width, height) {
		// Check that the entity is mounted to a tile map
		if (this._parent && this._parent.TaroTileMap2d) {
			if (x !== undefined && y !== undefined) {
				this._parent.unOccupyTile(x, y, width, height);
			} else {
				// Un-occupy tiles based upon tile point and tile width/height
				var trPoint = new TaroPoint3d(
					this._translate.x - (this._tileWidth / 2 - 0.5) * this._parent._tileWidth,
					this._translate.y - (this._tileHeight / 2 - 0.5) * this._parent._tileHeight,
					0
				);
				var tilePoint = this._parent.pointToTile(trPoint);

				if (this._parent._mountMode === 1) {
					tilePoint.thisToIso();
				}

				this._parent.unOccupyTile(tilePoint.x, tilePoint.y, this._tileWidth, this._tileHeight);
			}
		}
		return this;
	},

	/**
	 * Returns an array of tile co-ordinates that the object is currently
	 * over, calculated using the current world co-ordinates of the object
	 * as well as it's 3d geometry.
	 * @private
	 * @return {Array} The array of tile co-ordinates as TaroPoint3d instances.
	 */
	overTiles: function () {
		// Check that the entity is mounted to a tile map
		if (this._parent && this._parent.TaroTileMap2d) {
			var x;
			var y;
			var tileWidth = this._tileWidth || 1;
			var tileHeight = this._tileHeight || 1;
			var tile = this._parent.pointToTile(this._translate);
			var tileArr = [];

			for (x = 0; x < tileWidth; x++) {
				for (y = 0; y < tileHeight; y++) {
					tileArr.push(new TaroPoint3d(tile.x + x, tile.y + y, 0));
				}
			}

			return tileArr;
		}
	},

	/**
	 * Gets / sets the anchor position that this entity's texture
	 * will be adjusted by.
	 * @param {Number=} x The x anchor value.
	 * @param {Number=} y The y anchor value.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	anchor: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._anchor = new TaroPoint2d(x, y);
			return this;
		}

		return this._anchor;
	},

	/**
	 * Gets / sets the geometry x value.
	 * @param {Number=} px The new x value in pixels.
	 * @example #Set the width of the entity
	 *     entity.width(40);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	width: function (px, lockAspect) {
		if (px !== undefined) {
			if (lockAspect) {
				// Calculate the height from the change in width
				var ratio = px / this._bounds2d.x;
				this.height(this._bounds2d.y * ratio);
			}

			this._bounds2d.x = px;
			this._bounds2d.x2 = px / 2;

			if (taro.isClient) {
				this.emit('size', {
					width: this._bounds2d.x,
					height: this._bounds2d.y,
				});
			}

			return this;
		}

		return this._bounds2d.x;
	},

	/**
	 * Gets / sets the geometry y value.
	 * @param {Number=} px The new y value in pixels.
	 * @example #Set the height of the entity
	 *     entity.height(40);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	height: function (px, lockAspect) {
		if (px !== undefined) {
			if (lockAspect) {
				// Calculate the width from the change in height
				var ratio = px / this._bounds2d.y;
				this.width(this._bounds2d.x * ratio);
			}

			this._bounds2d.y = px;
			this._bounds2d.y2 = px / 2;

			if (taro.isClient) {
				this.emit('size', {
					width: this._bounds2d.x,
					height: this._bounds2d.y,
				});
			}

			return this;
		}

		return this._bounds2d.y;
	},

	/**
	 * Gets / sets the 2d geometry of the entity. The x and y values are
	 * relative to the center of the entity. This geometry is used when
	 * rendering textures for the entity and positioning in world space as
	 * well as UI positioning calculations. It holds no bearing on isometric
	 * positioning.
	 * @param {Number=} x The new x value in pixels.
	 * @param {Number=} y The new y value in pixels.
	 * @example #Set the dimensions of the entity (width and height)
	 *     entity.bounds2d(40, 40);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	bounds2d: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._bounds2d = new TaroPoint2d(x, y, 0);
			return this;
		}

		if (x !== undefined && y === undefined) {
			// x is considered an TaroPoint2d instance
			this._bounds2d = new TaroPoint2d(x.x, x.y);
		}

		return this._bounds2d;
	},

	getBounds: function () {
		// for entities with bodies like unit/item/projectile/etc
		var bounds = {
			x: this._translate.x - this.width() / 2,
			y: this._translate.y - this.height() / 2,
			width: this.width(),
			height: this.height(),
		};

		// get bounds of spriteOnly item carried by unit
		if (this._category == 'item') {
			var ownerUnit = this.getOwnerUnit();
			if (ownerUnit && this._stats && this._stats.currentBody.type == 'spriteOnly' && !this.body) {
				bounds = {
					x: ownerUnit._translate.x + this.anchorOffset.x - this._stats.currentBody.width / 2,
					y: ownerUnit._translate.y + this.anchorOffset.y - this._stats.currentBody.height / 2,
					width: this._stats.currentBody.width,
					height: this._stats.currentBody.height,
				};
			}
		}

		return bounds;
	},

	/**
	 * Gets / sets the 3d geometry of the entity. The x and y values are
	 * relative to the center of the entity and the z value is wholly
	 * positive from the "floor". Used to define a 3d bounding cuboid for
	 * the entity used in isometric depth sorting and hit testing.
	 * @param {Number=} x The new x value in pixels.
	 * @param {Number=} y The new y value in pixels.
	 * @param {Number=} z The new z value in pixels.
	 * @example #Set the dimensions of the entity (width, height and length)
	 *     entity.bounds3d(40, 40, 20);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	bounds3d: function (x, y, z) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._bounds3d = new TaroPoint3d(x, y, z);
			return this;
		}

		return this._bounds3d;
	},

	/**
	 * @deprecated Use bounds3d instead
	 * @param x
	 * @param y
	 * @param z
	 */
	size3d: function (x, y, z) {
		TaroEntity.prototype.log(
			'size3d has been renamed to bounds3d but is exactly the same so please search/replace your code to update calls.',
			'warning'
		);
	},

	/**
	 * Gets / sets the life span of the object in milliseconds. The life
	 * span is how long the object will exist for before being automatically
	 * destroyed.
	 * @param {Number=} milliseconds The number of milliseconds the entity
	 * will live for from the current time.
	 * @param {Function=} deathCallback Optional callback method to call when
	 * the entity is destroyed from end of lifespan.
	 * @example #Set the lifespan of the entity to 2 seconds after which it will automatically be destroyed
	 *     entity.lifeSpan(2000);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	lifeSpan: function (milliseconds, deathCallback) {
		if (milliseconds != undefined) {
			this.deathTime(taro._currentTime + milliseconds, deathCallback);
			return this;
		}

		return this.deathTime() - taro._currentTime;
	},

	/**
	 * Gets / sets the timestamp in milliseconds that denotes the time
	 * that the entity will be destroyed. The object checks it's own death
	 * time during each tick and if the current time is greater than the
	 * death time, the object will be destroyed.
	 * @param {Number=} val The death time timestamp. This is a time relative
	 * to the engine's start time of zero rather than the current time that
	 * would be retrieved from new Date().getTime(). It is usually easier
	 * to call lifeSpan() rather than setting the deathTime directly.
	 * @param {Function=} deathCallback Optional callback method to call when
	 * the entity is destroyed from end of lifespan.
	 * @example #Set the death time of the entity to 60 seconds after engine start
	 *     entity.deathTime(60000);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	deathTime: function (val, deathCallback) {
		this._deathTime = val;

		if (val !== undefined) {
			if (deathCallback !== undefined) {
				this._deathCallBack = deathCallback;
			}
			return this;
		}

		return this._deathTime;
	},

	/**
	 * Gets / sets the entity opacity from 0.0 to 1.0.
	 * @param {Number=} val The opacity value.
	 * @example #Set the entity to half-visible
	 *     entity.opacity(0.5);
	 * @example #Set the entity to fully-visible
	 *     entity.opacity(1.0);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	opacity: function (val) {
		if (val !== undefined) {
			if (taro.isClient) {
				this.emit('set-opacity', val);
			}
			this._opacity = val;
			this._stats.opacity = val;
			return this;
		}

		return this._opacity;
	},

	/**
	 * Gets / sets the noAabb flag that determines if the entity's axis
	 * aligned bounding box should be calculated every tick or not. If
	 * you don't need the AABB data (for instance if you don't need to
	 * detect mouse events on this entity or you DO want the AABB to be
	 * updated but want to control it manually by calling aabb(true)
	 * yourself as needed).
	 * @param {Boolean=} val If set to true will turn off AABB calculation.
	 * @returns {*}
	 */
	noAabb: function (val) {
		if (val !== undefined) {
			this._noAabb = val;
			return this;
		}

		return this._noAabb;
	},

	/**
	 * Gets / sets the texture to use when rendering the entity.
	 * @param {TaroTexture=} texture The texture object.
	 * @example #Set the entity texture (image)
	 *     var texture = new TaroTexture('path/to/some/texture.png');
	 *     entity.texture(texture);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	texture: function (texture) {
		if (texture !== undefined) {
			this._texture = texture;
			return this;
		}

		return this._texture;
	},

	/**
	 * Gets / sets the current texture cell used when rendering the game
	 * object's texture. If the texture is not cell-based, this value is
	 * ignored.
	 * @param {Number=} val The cell index.
	 * @example #Set the entity texture as a 4x4 cell sheet and then set the cell to use
	 *     var texture = new TaroCellSheet('path/to/some/cellSheet.png', 4, 4);
	 *     entity.texture(texture)
	 *         .cell(3);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	cell: function (val) {
		if (val > 0 || val === null) {
			this._cell = val;
			return this;
		}

		return this._cell;
	},

	/**
	 * Gets / sets the current texture cell used when rendering the game
	 * object's texture. If the texture is not cell-based, this value is
	 * ignored. This differs from cell() in that it accepts a string id
	 * as the cell
	 * @param {Number=} val The cell id.
	 * @example #Set the entity texture as a sprite sheet with cell ids and then set the cell to use
	 *     var texture = new TaroSpriteSheet('path/to/some/cellSheet.png', [
	 *         [0, 0, 40, 40, 'robotHead'],
	 *         [40, 0, 40, 40, 'humanHead'],
	 *     ]);
	 *
	 *     // Assign the texture, set the cell to use and then
	 *     // set the entity to the size of the cell automatically!
	 *     entity.texture(texture)
	 *         .cellById('robotHead')
	 *         .dimensionsFromCell();
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	cellById: function (val) {
		if (val !== undefined) {
			if (this._texture) {
				// Find the cell index this id corresponds to
				var i;
				var tex = this._texture;
				var cells = tex._cells;

				for (i = 1; i < cells.length; i++) {
					if (cells[i][4] === val) {
						// Found the cell id so assign this cell index
						this.cell(i);
						return this;
					}
				}

				// We were unable to find the cell index from the cell
				// id so produce an error
				TaroEntity.prototype.log(
					`Could not find the cell id "${val}" in the assigned entity texture ${tex.id()}, please check your sprite sheet (texture) cell definition to ensure the cell id "${val}" has been assigned to a cell!`,
					'error'
				);
			} else {
				TaroEntity.prototype.log(
					'Cannot assign cell index from cell ID until an TaroSpriteSheet has been set as the texture for this entity. Please set the texture before calling cellById().',
					'error'
				);
			}
		}

		return this._cell;
	},

	/**
	 * Sets the geometry of the entity to match the width and height
	 * of the assigned texture.
	 * @param {Number=} percent The percentage size to resize to.
	 * @example #Set the entity dimensions based on the assigned texture
	 *     var texture = new TaroTexture('path/to/some/texture.png');
	 *
	 *     // Assign the texture, and then set the entity to the
	 *     // size of the texture automatically!
	 *     entity.texture(texture)
	 *         .dimensionsFromTexture();
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	dimensionsFromTexture: function (percent) {
		if (this._texture) {
			if (percent === undefined) {
				this.width(this._texture._sizeX);
				this.height(this._texture._sizeY);
			} else {
				this.width(Math.floor((this._texture._sizeX / 100) * percent));
				this.height(Math.floor((this._texture._sizeY / 100) * percent));
			}

			// Recalculate localAabb
			this.localAabb(true);
		}

		return this;
	},

	/**
	 * Sets the geometry of the entity to match the width and height
	 * of the assigned texture cell. If the texture is not cell-based
	 * the entire texture width / height will be used.
	 * @param {Number=} percent The percentage size to resize to.
	 * @example #Set the entity dimensions based on the assigned texture and cell
	 *     var texture = new TaroSpriteSheet('path/to/some/cellSheet.png', [
	 *         [0, 0, 40, 40, 'robotHead'],
	 *         [40, 0, 40, 40, 'humanHead'],
	 *     ]);
	 *
	 *     // Assign the texture, set the cell to use and then
	 *     // set the entity to the size of the cell automatically!
	 *     entity.texture(texture)
	 *         .cellById('robotHead')
	 *         .dimensionsFromCell();
	 * @return {*} The object this method was called from to allow
	 * method chaining
	 */
	dimensionsFromCell: function (percent) {
		if (this._texture) {
			if (this._texture._cells && this._texture._cells.length) {
				if (percent === undefined) {
					this.width(this._texture._cells[this._cell][2]);
					this.height(this._texture._cells[this._cell][3]);
				} else {
					this.width(Math.floor((this._texture._cells[this._cell][2] / 100) * percent));
					this.height(Math.floor((this._texture._cells[this._cell][3] / 100) * percent));
				}

				// Recalculate localAabb
				this.localAabb(true);
			}
		}

		return this;
	},

	/**
	 * Gets / sets the highlight mode. True is on false is off.
	 * @param {Boolean} val The highlight mode true or false.
	 * @example #Set the entity to render highlighted
	 *     entity.highlight(true);
	 * @example #Get the current highlight state
	 *     var isHighlighted = entity.highlight();
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	highlight: function (val) {
		if (val !== undefined) {
			this._highlight = val;
			return this;
		}

		return this._highlight;
	},

	/**
	 * Returns the absolute world position of the entity as an
	 * TaroPoint3d.
	 * @example #Get the world position of the entity
	 *     var wordPos = entity.worldPosition();
	 * @return {TaroPoint3d} The absolute world position of the
	 * entity.
	 */
	worldPosition: function () {
		return new TaroPoint3d(this._worldMatrix.matrix[2], this._worldMatrix.matrix[5], 0);
	},

	/**
	 * Returns the absolute world rotation z of the entity as a
	 * value in radians.
	 * @example #Get the world rotation of the entity's z axis
	 *     var wordRot = entity.worldRotationZ();
	 * @return {Number} The absolute world rotation z of the
	 * entity.
	 */
	worldRotationZ: function () {
		return this._worldMatrix.rotationRadians();
	},

	/**
	 * Converts an array of points from local space to this entity's
	 * world space using it's world transform matrix. This will alter
	 * the points passed in the array directly.
	 * @param {Array} points The array of TaroPoints to convert.
	 */
	localToWorld: function (points, viewport, inverse) {
		viewport = viewport || taro._currentViewport;

		if (this._adjustmentMatrix) {
			// Apply the optional adjustment matrix
			this._worldMatrix.multiply(this._adjustmentMatrix);
		}

		if (!inverse) {
			this._worldMatrix.transform(points, this);
		} else {
			this._localMatrix.transform(points, this);
			// this._worldMatrix.getInverse().transform(points, this);
		}

		if (this._ignoreCamera) {
			// viewport.camera._worldMatrix.transform(points, this);
		}
	},

	/**
	 * Converts a point from local space to this entity's world space
	 * using it's world transform matrix. This will alter the point's
	 * data directly.
	 * @param {TaroPoint3d} point The TaroPoint3d to convert.
	 */
	localToWorldPoint: function (point, viewport) {
		viewport = viewport || taro._currentViewport;
		this._worldMatrix.transform([point], this);
	},

	/**
	 * Returns the screen position of the entity as an TaroPoint3d where x is the
	 * "left" and y is the "top", useful for positioning HTML elements at the
	 * screen location of an taro entity. This method assumes that the top-left
	 * of the main canvas element is at 0, 0. If not you can adjust the values
	 * yourself to allow for offset.
	 * @example #Get the screen position of the entity
	 *     var screenPos = entity.screenPosition();
	 * @return {TaroPoint3d} The screen position of the entity.
	 */
	screenPosition: function () {
		return new TaroPoint3d(
			Math.floor(
				(this._worldMatrix.matrix[2] - taro._currentCamera._translate.x) * taro._currentCamera._scale.x +
					taro._bounds2d.x2
			),
			Math.floor(
				(this._worldMatrix.matrix[5] - taro._currentCamera._translate.y) * taro._currentCamera._scale.y +
					taro._bounds2d.y2
			),
			0
		);
	},

	/**
	 * @deprecated Use bounds3dPolygon instead
	 */
	localIsoBoundsPoly: function () {},

	localBounds3dPolygon: function (recalculate) {
		if (this._bounds3dPolygonDirty || !this._localBounds3dPolygon || recalculate) {
			var geom = this._bounds3d;
			var poly = new TaroPoly2d();
			// Bottom face
			var bf2 = Math.toIso(+geom.x2, -geom.y2, -geom.z2);
			var bf3 = Math.toIso(+geom.x2, +geom.y2, -geom.z2);
			var bf4 = Math.toIso(-geom.x2, +geom.y2, -geom.z2);
			// Top face
			var tf1 = Math.toIso(-geom.x2, -geom.y2, geom.z2);
			var tf2 = Math.toIso(+geom.x2, -geom.y2, geom.z2);
			var tf4 = Math.toIso(-geom.x2, +geom.y2, geom.z2);

			poly
				.addPoint(tf1.x, tf1.y)
				.addPoint(tf2.x, tf2.y)
				.addPoint(bf2.x, bf2.y)
				.addPoint(bf3.x, bf3.y)
				.addPoint(bf4.x, bf4.y)
				.addPoint(tf4.x, tf4.y)
				.addPoint(tf1.x, tf1.y);

			this._localBounds3dPolygon = poly;
			this._bounds3dPolygonDirty = false;
		}

		return this._localBounds3dPolygon;
	},

	/**
	 * @deprecated Use bounds3dPolygon instead
	 */
	isoBoundsPoly: function () {},

	bounds3dPolygon: function (recalculate) {
		if (this._bounds3dPolygonDirty || !this._bounds3dPolygon || recalculate) {
			var poly = this.localBounds3dPolygon(recalculate).clone();

			// Convert local co-ordinates to world based on entities world matrix
			this.localToWorld(poly._poly);

			this._bounds3dPolygon = poly;
		}

		return this._bounds3dPolygon;
	},

	/**
	 * @deprecated Use mouseInBounds3d instead
	 */
	mouseInIsoBounds: function () {},

	mouseInBounds3d: function (recalculate) {
		var poly = this.localBounds3dPolygon(recalculate);
		var mp = this.mousePos();

		return poly.pointInside(mp);
	},

	/**
	 * Calculates and returns the current axis-aligned bounding box in
	 * world co-ordinates.
	 * @param {Boolean=} recalculate If true this will force the
	 * recalculation of the AABB instead of returning a cached
	 * value.
	 * @example #Get the entity axis-aligned bounding box dimensions
	 *     var aabb = entity.aabb();
	 *
	 *     TaroEntity.prototype.log(aabb.x);
	 *     TaroEntity.prototype.log(aabb.y);
	 *     TaroEntity.prototype.log(aabb.width);
	 *     TaroEntity.prototype.log(aabb.height);
	 * @example #Get the entity axis-aligned bounding box dimensions forcing the engine to update the values first
	 *     var aabb = entity.aabb(true); // Call with true to force update
	 *
	 *     TaroEntity.prototype.log(aabb.x);
	 *     TaroEntity.prototype.log(aabb.y);
	 *     TaroEntity.prototype.log(aabb.width);
	 *     TaroEntity.prototype.log(aabb.height);
	 * @return {TaroRect} The axis-aligned bounding box in world co-ordinates.
	 */
	aabb: function (recalculate, inverse) {
		if (this._aabbDirty || !this._aabb || recalculate) {
			//  && this.newFrame()
			var poly = new TaroPoly2d();
			var minX;
			var minY;
			var maxX;
			var maxY;
			var box;
			var anc = this._anchor;
			var ancX = anc.x;
			var ancY = anc.y;
			var geom;
			var geomX2;
			var geomY2;
			var x;
			var y;

			geom = this._bounds2d;
			geomX2 = geom.x2;
			geomY2 = geom.y2;

			x = geomX2;
			y = geomY2;

			poly.addPoint(-x + ancX, -y + ancY);
			poly.addPoint(x + ancX, -y + ancY);
			poly.addPoint(x + ancX, y + ancY);
			poly.addPoint(-x + ancX, y + ancY);

			this._renderPos = { x: -x + ancX, y: -y + ancY };

			// Convert the poly's points from local space to world space
			this.localToWorld(poly._poly, null, inverse);

			// Get the extents of the newly transformed poly
			minX = Math.min(poly._poly[0].x, poly._poly[1].x, poly._poly[2].x, poly._poly[3].x);

			minY = Math.min(poly._poly[0].y, poly._poly[1].y, poly._poly[2].y, poly._poly[3].y);

			maxX = Math.max(poly._poly[0].x, poly._poly[1].x, poly._poly[2].x, poly._poly[3].x);

			maxY = Math.max(poly._poly[0].y, poly._poly[1].y, poly._poly[2].y, poly._poly[3].y);

			box = new TaroRect(minX, minY, maxX - minX, maxY - minY);

			this._aabb = box;
			this._aabbDirty = false;
		}

		return this._aabb;
	},

	/**
	 * Calculates and returns the local axis-aligned bounding box
	 * for the entity. This is the AABB relative to the entity's
	 * center point.
	 * @param {Boolean=} recalculate If true this will force the
	 * recalculation of the local AABB instead of returning a cached
	 * value.
	 * @example #Get the entity local axis-aligned bounding box dimensions
	 *     var aabb = entity.localAabb();
	 *
	 *     TaroEntity.prototype.log(aabb.x);
	 *     TaroEntity.prototype.log(aabb.y);
	 *     TaroEntity.prototype.log(aabb.width);
	 *     TaroEntity.prototype.log(aabb.height);
	 * @example #Get the entity local axis-aligned bounding box dimensions forcing the engine to update the values first
	 *     var aabb = entity.localAabb(true); // Call with true to force update
	 *
	 *     TaroEntity.prototype.log(aabb.x);
	 *     TaroEntity.prototype.log(aabb.y);
	 *     TaroEntity.prototype.log(aabb.width);
	 *     TaroEntity.prototype.log(aabb.height);
	 * @return {TaroRect} The local AABB.
	 */
	localAabb: function (recalculate) {
		if (!this._localAabb || recalculate) {
			var aabb = this.aabb();
			this._localAabb = new TaroRect(
				-Math.floor(aabb.width / 2),
				-Math.floor(aabb.height / 2),
				Math.floor(aabb.width),
				Math.floor(aabb.height)
			);
		}

		return this._localAabb;
	},

	/**
	 * Calculates the axis-aligned bounding box for this entity, including
	 * all child entity bounding boxes and returns the final composite
	 * bounds.
	 * @example #Get the composite AABB
	 *     var entity = new TaroEntity(),
	 *         aabb = entity.compositeAabb();
	 * @return {TaroRect}
	 */
	compositeAabb: function (inverse) {
		var arr = this._children;
		var arrCount;
		var rect;

		if (inverse) {
			rect = this.aabb(true, inverse).clone();
		} else {
			rect = this.aabb().clone();
		}

		// Now loop all children and get the aabb for each of them
		// them add those bounds to the current rect
		if (arr) {
			arrCount = arr.length;

			var x = 0;
			while (arrCount--) {
				x++;
				if (x > 10000) {
					TaroEntity.prototype.log('TaroEntity 1255');
					break;
				} // for detecting infinite loops
				rect.thisCombineRect(arr[arrCount].compositeAabb(inverse));
			}
		}

		return rect;
	},

	/**
	 * Gets / sets the composite stream flag. If set to true, any objects
	 * mounted to this one will have their streamMode() set to the same
	 * value as this entity and will also have their compositeStream flag
	 * set to true. This allows you to easily automatically stream any
	 * objects mounted to a root object and stream them all.
	 * @param val
	 * @returns {*}
	 */
	compositeStream: function (val) {
		if (val !== undefined) {
			this._compositeStream = val;
			return this;
		}

		return this._compositeStream;
	},

	/**
	 * Override the _childMounted method and apply entity-based flags.
	 * @param {TaroEntity} child
	 * @private
	 */
	_childMounted: function (child) {
		// Check if we need to set the compositeStream and streamMode
		if (this.compositeStream()) {
			child.compositeStream(true);
			child.streamMode(this.streamMode());
			child.streamControl(this.streamControl());
		}

		TaroObject.prototype._childMounted.call(this, child);

		// Check if we are compositeCached and update the cache
		if (this.compositeCache()) {
			this.cacheDirty(true);
		}
	},

	/**
	 * Takes two values and returns them as an array where index [0]
	 * is the y argument and index[1] is the x argument. This method
	 * is used specifically in the 3d bounds intersection process to
	 * determine entity depth sorting.
	 * @param {Number} x The first value.
	 * @param {Number} y The second value.
	 * @return {Array} The swapped arguments.
	 * @private
	 */
	_swapVars: function (x, y) {
		return [y, x];
	},

	_internalsOverlap: function (x0, x1, y0, y1) {
		var tempSwap;

		if (x0 > x1) {
			tempSwap = this._swapVars(x0, x1);
			x0 = tempSwap[0];
			x1 = tempSwap[1];
		}

		if (y0 > y1) {
			tempSwap = this._swapVars(y0, y1);
			y0 = tempSwap[0];
			y1 = tempSwap[1];
		}

		if (x0 > y0) {
			tempSwap = this._swapVars(x0, y0);
			x0 = tempSwap[0];
			y0 = tempSwap[1];

			tempSwap = this._swapVars(x1, y1);
			x1 = tempSwap[0];
			y1 = tempSwap[1];
		}

		return y0 < x1;
	},

	_projectionOverlap: function (otherObject) {
		var thisG3d = this._bounds3d;
		var thisMin = {
			x: this._translate.x - thisG3d.x / 2,
			y: this._translate.y - thisG3d.y / 2,
			z: this._translate.z - thisG3d.z,
		};
		var thisMax = {
			x: this._translate.x + thisG3d.x / 2,
			y: this._translate.y + thisG3d.y / 2,
			z: this._translate.z + thisG3d.z,
		};
		var otherG3d = otherObject._bounds3d;
		var otherMin = {
			x: otherObject._translate.x - otherG3d.x / 2,
			y: otherObject._translate.y - otherG3d.y / 2,
			z: otherObject._translate.z - otherG3d.z,
		};
		var otherMax = {
			x: otherObject._translate.x + otherG3d.x / 2,
			y: otherObject._translate.y + otherG3d.y / 2,
			z: otherObject._translate.z + otherG3d.z,
		};

		return (
			this._internalsOverlap(
				thisMin.x - thisMax.y,
				thisMax.x - thisMin.y,
				otherMin.x - otherMax.y,
				otherMax.x - otherMin.y
			) &&
			this._internalsOverlap(
				thisMin.x - thisMax.z,
				thisMax.x - thisMin.z,
				otherMin.x - otherMax.z,
				otherMax.x - otherMin.z
			) &&
			this._internalsOverlap(
				thisMin.z - thisMax.y,
				thisMax.z - thisMin.y,
				otherMin.z - otherMax.y,
				otherMax.z - otherMin.y
			)
		);
	},

	/**
	 * Compares the current entity's 3d bounds to the passed entity and
	 * determines if the current entity is "behind" the passed one. If an
	 * entity is behind another, it is drawn first during the scenegraph
	 * render phase.
	 * @param {TaroEntity} otherObject The other entity to check this
	 * entity's 3d bounds against.
	 * @example #Determine if this entity is "behind" another entity based on the current depth-sort
	 *     var behind = entity.isBehind(otherEntity);
	 * @return {Boolean} If true this entity is "behind" the passed entity
	 * or false if not.
	 */
	isBehind: function (otherObject) {
		var thisG3d = this._bounds3d;
		var otherG3d = otherObject._bounds3d;
		var thisTranslate = this._translate.clone();
		var otherTranslate = otherObject._translate.clone();

		// thisTranslate.thisToIso();
		// otherTranslate.thisToIso();

		if (this._origin.x !== 0.5 || this._origin.y !== 0.5) {
			thisTranslate.x += this._bounds2d.x * (0.5 - this._origin.x);
			thisTranslate.y += this._bounds2d.y * (0.5 - this._origin.y);
		}
		if (otherObject._origin.x !== 0.5 || otherObject._origin.y !== 0.5) {
			otherTranslate.x += otherObject._bounds2d.x * (0.5 - otherObject._origin.x);
			otherTranslate.y += otherObject._bounds2d.y * (0.5 - otherObject._origin.y);
		}

		var thisX = thisTranslate.x;
		var thisY = thisTranslate.y;
		var otherX = otherTranslate.x;
		var otherY = otherTranslate.y;
		var thisMin = new TaroPoint3d(thisX - thisG3d.x / 2, thisY - thisG3d.y / 2, this._translate.z);
		var thisMax = new TaroPoint3d(thisX + thisG3d.x / 2, thisY + thisG3d.y / 2, this._translate.z + thisG3d.z);
		var otherMin = new TaroPoint3d(otherX - otherG3d.x / 2, otherY - otherG3d.y / 2, otherObject._translate.z);
		var otherMax = new TaroPoint3d(
			otherX + otherG3d.x / 2,
			otherY + otherG3d.y / 2,
			otherObject._translate.z + otherG3d.z
		);

		if (thisMax.x <= otherMin.x) {
			return false;
		}

		if (otherMax.x <= thisMin.x) {
			return true;
		}

		if (thisMax.y <= otherMin.y) {
			return false;
		}

		if (otherMax.y <= thisMin.y) {
			return true;
		}

		if (thisMax.z <= otherMin.z) {
			return false;
		}

		if (otherMax.z <= thisMin.z) {
			return true;
		}

		return thisX + thisY + this._translate.z > otherX + otherY + otherObject._translate.z;
	},

	/**
	 * Get / set the flag determining if this entity will respond
	 * to mouse interaction or not. When you set a mouse* event e.g.
	 * mouseUp, mouseOver etc this flag will automatically be reset
	 * to true.
	 * @param {Boolean=} val The flag value true or false.
	 * @example #Set entity to ignore mouse events
	 *     entity.mouseEventsActive(false);
	 * @example #Set entity to receive mouse events
	 *     entity.mouseEventsActive(true);
	 * @example #Get current flag value
	 *     var val = entity.mouseEventsActive();
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	mouseEventsActive: function (val) {
		if (val !== undefined) {
			this._mouseEventsActive = val;
			return this;
		}

		return this._mouseEventsActive;
	},

	/**
	 * Sets the _ignoreCamera internal flag to the value passed for this
	 * and all child entities down the scenegraph.
	 * @param val
	 */
	ignoreCameraComposite: function (val) {
		var i;
		var arr = this._children;
		var arrCount = arr.length;

		this._ignoreCamera = val;

		for (i = 0; i < arrCount; i++) {
			if (arr[i].ignoreCameraComposite) {
				arr[i].ignoreCameraComposite(val);
			}
		}
	},

	/**
	 * Determines if the frame alternator value for this entity
	 * matches the engine's frame alternator value. The entity's
	 * frame alternator value will be set to match the engine's
	 * after each call to the entity.tick() method so the return
	 * value of this method can be used to determine if the tick()
	 * method has already been run for this entity.
	 *
	 * This is useful if you have multiple viewports which will
	 * cause the entity tick() method to fire once for each viewport
	 * but you only want to execute update code such as movement etc
	 * on the first time the tick() method is called.
	 *
	 * @example #Determine if the entity has already had it's tick method called
	 *     var tickAlreadyCalled = entity.newFrame();
	 * @return {Boolean} If false, the entity's tick method has
	 * not yet been processed for this tick.
	 */
	newFrame: function () {
		return taro._frameAlternator !== this._frameAlternatorCurrent;
	},

	/**
	 * Sets the canvas context transform properties to match the the game
	 * object's current transform values.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to apply
	 * the transformation matrix to.
	 * @example #Transform a canvas context to the entity's local matrix values
	 *     var canvas = document.createElement('canvas');
	 *     canvas.width = 800;
	 *     canvas.height = 600;
	 *
	 *     var ctx = canvas.getContext('2d');
	 *     entity._transformContext(ctx);
	 * @private
	 */
	_transformContext: function (ctx, inverse) {
		if (this._parent) {
			ctx.globalAlpha = this._computedOpacity = this._parent._computedOpacity * this._opacity;
		} else {
			ctx.globalAlpha = this._computedOpacity = this._opacity;
		}

		if (!inverse) {
			this._localMatrix.transformRenderingContext(ctx);
		} else {
			this._localMatrix.getInverse().transformRenderingContext(ctx);
		}
	},

	mouseAlwaysInside: function (val) {
		if (val !== undefined) {
			this._mouseAlwaysInside = val;
			return this;
		}

		return this._mouseAlwaysInside;
	},

	/**
	 * Processes the updates required each render frame. Any code in the update()
	 * method will be called ONCE for each render frame BEFORE the tick() method.
	 * This differs from the tick() method in that the tick method can be called
	 * multiple times during a render frame depending on how many viewports your
	 * simulation is being rendered to, whereas the update() method is only called
	 * once. It is therefore the perfect place to put code that will control your
	 * entity's motion, AI etc.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
	 */
	update: function (ctx, tickDelta, isForOrphans) {
		if (this._deathTime !== undefined && this._deathTime <= taro._tickStart) {
			// Check if the deathCallBack was set
			if (this._deathCallBack) {
				this._deathCallBack.apply(this);
				delete this._deathCallback;
			}

			this.destroy();
		} else {
			// Check that the entity has been born
			if (this._bornTime === undefined || taro._currentTime >= this._bornTime) {
				delete this._streamDataCache;

				if (!isForOrphans) {
					// Process any behaviours assigned to the entity
					this._processUpdateBehaviours();
				}

				// Update this object's current frame alternator value
				// which allows us to determine if we are still on the
				// same frame
				this._frameAlternatorCurrent = taro._frameAlternator;
			} else {
				// sometimes when user returns to the game's tab/window, this._parent is set to null and causing errors
				if (this._parent) {
					// The entity is not yet born, unmount it and add to the spawn queue
					this._birthMount = this._parent.id();
				}
				this.unMount();

				taro.spawnQueue(this);
			}
		}

		// dont process super class if its from orphan. bcz orphan only need to update stream data and its translate
		if (!isForOrphans) {
			// Process super class
			TaroObject.prototype.update.call(this, ctx, tickDelta);
		}
	},

	// convert numbers stored as string in database to int
	parseEntityObject: function (stats) {
		var self = this;
		if (typeof stats === 'object') {
			for (var key in stats) {
				if (typeof stats[key] === 'object') {
					self.parseEntityObject(stats[key]);
				} else if (/^-?\d+$/.test(stats[key])) {
					stats[key] = parseFloat(stats[key]);
				}
			}
		}
	},

	/**
	 * Processes the actions required each render frame.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
	 * @param {Boolean} dontTransform If set to true, the tick method will
	 * not transform the context based on the entity's matrices. This is useful
	 * if you have extended the class and want to process down the inheritance
	 * chain but have already transformed the entity in a previous overloaded
	 * method.
	 */
	tick: function (ctx, dontTransform) {
		if (this._inView) taro.inViewCount++;
		if (this._inView && (!this._parent || this._parent._inView)) {
			// var category = this._category || 'etc';
			// if (taro.tickCount[category] == undefined)
			// 	taro.tickCount[category] = 0;
			// taro.tickCount[category]++;
			taro.tickCount++;

			// Process any behaviours assigned to the entity
			this._processTickBehaviours();

			// Process any mouse events we need to do

			if (this._mouseEventsActive) {
				if (this._processTriggerHitTests()) {
					// Point is inside the trigger bounds
					taro.input.queueEvent(this, this._mouseInTrigger, null);
				} else {
					if (taro.input.mouseMove) {
						// There is a mouse move event but we are not inside the entity
						// so fire a mouse out event (_handleMouseOut will check if the
						// mouse WAS inside before firing an out event).
						this._handleMouseOut(taro.input.mouseMove);
					}
				}
			}

			// Check for cached version
			if (this._cache || this._compositeCache) {
				// Caching is enabled
				if (this._cacheDirty) {
					// The cache is dirty, redraw it
					this._refreshCache(dontTransform);
				}

				// Now render the cached image data to the main canvas
				this._renderCache(ctx);
			} else {
				// Non-cached output
				// Transform the context by the current transform settings
				if (!dontTransform) {
					this._transformContext(ctx);
				}

				// Render item below unit currently disabled
				// if (this._category === 'unit') {
				// 	if (this._compositeCache) {
				// 		if (this._cacheDirty) {
				// 			// Process children
				// 			TaroObject.prototype.tick.call(this, this._cacheCtx, true);
				// 			this._renderCache(ctx);
				// 			this._cacheDirty = false;
				// 		}
				// 	} else {
				// 		// Process children
				// 		TaroObject.prototype.tick.call(this, ctx, true);
				// 	}
				// }
				this._renderEntity(ctx, dontTransform);
			}

			if (
				Math.round(this._translate.x) != Math.round(this._oldTranform[0]) ||
				Math.round(this._translate.y) != Math.round(this._oldTranform[1]) ||
				parseFloat(this._rotate.z).toFixed(3) != parseFloat(this._oldTranform[2]).toFixed(3)
			) {
				this._hasMoved = true;
				this._oldTranform = [this._translate.x, this._translate.y, this._rotate.z];
			}

			// Process any automatic-mode stream updating required
			if (this._streamMode === 1 || this._streamMode === 2) {
				this.streamSync();
			}

			// if (taro._currentTime > taro.server.lastSnapshotSentAt)

			if (this._compositeCache) {
				if (this._cacheDirty) {
					// Process children
					TaroObject.prototype.tick.call(this, this._cacheCtx);
					this._renderCache(ctx);
					this._cacheDirty = false;
				}
			} else {
				// Process children
				TaroObject.prototype.tick.call(this, ctx);
			}
		}
	},
	playEffect: function (type, data) {
		if (this._stats && this._stats.effects && this._stats.effects[type]) {
			var effect = this._stats.effects[type];

			if (effect.runScript) {
				const triggeredBy = {};
				triggeredBy[`${this._category}Id`] = this._id;

				const script = this.script.scripts?.[effect.runScript];
				const triggeredFrom = script.isWorld ? 'world' : 'map';

				this.script.runScript(effect.runScript, { triggeredBy, triggeredFrom });
			}

			if (taro.isServer) {
				if (type == 'move' || type == 'idle' || type == 'none') {
					this.streamUpdateData([{ effect: { type: type } }]);
				} else if (type == 'attacked') {
					this.streamUpdateData([{ effect: { type: type, data: data } }]);
				}
				// playEffect projectile creation is only happening on the client;
			} else if (taro.isClient) {
				if (!this.isRendering()) {
					return;
				}

				var position = this._translate;

				if (
					this._category === 'item' &&
					this._stats.currentBody &&
					(this._stats.currentBody.type === 'spriteOnly' || this._stats.currentBody.type === 'none')
				) {
					var ownerUnit = this.getOwnerUnit();
					position = (ownerUnit && ownerUnit._translate) || position;
				}

				// if animation is assigned to effect, play it
				if (effect.animation !== undefined && effect.animation !== 'none' && effect.animation !== '') {
					this.applyAnimationById(effect.animation);
				}

				if (effect.projectileType) {
					// these are never created on the server
					var projectile = taro.game.cloneAsset('projectileTypes', effect.projectileType);

					if (projectile) {
						var position = taro.game.lastProjectileHitPosition || this._translate;

						projectile.defaultData = {
							//type: effect.projectileType,
							translate: {
								x: position.x,
								y: position.y,
							},
							rotate: this._rotate.z,
						};
						//fix added for correct phaser projectile texture
						projectile.type = effect.projectileType;
						// set property for client-only effect projectiles
						projectile.streamMode = 0;
						new Projectile(projectile);
					}
				}

				var shouldRepeat = type === 'move';
				var isAlreadyPlaying = false;
				if (this.isPlayingSound) {
					this.isPlayingSound.loop = shouldRepeat;
					if (shouldRepeat) {
						isAlreadyPlaying = true;
						this.isPlayingSound.play();
					}
				}
				if (effect.sound) {
					for (var soundKey in effect.sound) {
						if (!isAlreadyPlaying) {
							this.isPlayingSound = taro.sound.playSound(effect.sound[soundKey], position, soundKey, shouldRepeat);
							if (this.isPlayingSound) {
								this.isPlayingSound.effect = effect.sound[soundKey];
							}
						}
					}
				}

				var angle = this._rotate.z;
				if (type == 'attacked') {
					// get angle between attacked unit and attacking unit
					var attacker = taro.$(data?.attackerId);
					if (attacker) {
						angle =
							Math.atan2(attacker._translate.y - this._translate.y, attacker._translate.x - this._translate.x) +
							Math.radians(90);
					}
				}

				this.tween.start(effect.tween, angle);

				// run tween for all items carried by this unit
				if (this._category === 'unit' && this.ownedItems) {
					Object.values(this.ownedItems).forEach((item) => {
						if (item) {
							item.tween.start(effect.tween, angle);
						}
					});
				}
			}
		}
	},
	_processTriggerHitTests: function () {
		var mp, mouseTriggerPoly;

		if (taro._currentViewport) {
			if (!this._mouseAlwaysInside) {
				mp = this.mousePosWorld();

				if (mp) {
					// Use the trigger polygon if defined
					if (this._triggerPolygon && this[this._triggerPolygon]) {
						mouseTriggerPoly = this[this._triggerPolygon](mp);
					} else {
						// Default to either aabb or bounds3dPolygon depending on entity parent mounting mode
						if (this._parent && this._parent._mountMode === 1) {
							// Use bounds3dPolygon
							mouseTriggerPoly = this.bounds3dPolygon();
						} else {
							// Use aabb
							mouseTriggerPoly = this.aabb();
						}
					}

					// Check if the current mouse position is inside this aabb
					return mouseTriggerPoly.xyInside(mp.x, mp.y);
				}
			} else {
				return true;
			}
		}

		return false;
	},

	_refreshCache: function (dontTransform) {
		// The cache is not clean so re-draw it
		// Render the entity to the cache
		var _canvas = this._cacheCanvas;
		var _ctx = this._cacheCtx;

		if (this._compositeCache) {
			// Get the composite entity AABB and alter the internal canvas
			// to the composite size so we can render the entire entity
			var aabbC = this.compositeAabb(true);

			this._compositeAabbCache = aabbC;

			if (aabbC.width > 0 && aabbC.height > 0) {
				_canvas.width = Math.ceil(aabbC.width);
				_canvas.height = Math.ceil(aabbC.height);
			} else {
				// We cannot set a zero size for a canvas, it will
				// cause the browser to freak out
				_canvas.width = 2;
				_canvas.height = 2;
			}

			// Translate to the center of the canvas
			_ctx.translate(-aabbC.x, -aabbC.y);

			/**
			 * Fires when the entity's composite cache is ready.
			 * @event TaroEntity#compositeReady
			 */
			this.emit('compositeReady');
		} else {
			if (this._bounds2d.x > 0 && this._bounds2d.y > 0) {
				_canvas.width = this._bounds2d.x;
				_canvas.height = this._bounds2d.y;
			} else {
				// We cannot set a zero size for a canvas, it will
				// cause the browser to freak out
				_canvas.width = 1;
				_canvas.height = 1;
			}

			// Translate to the center of the canvas
			_ctx.translate(this._bounds2d.x2, this._bounds2d.y2);

			this._cacheDirty = false;
		}

		// Transform the context by the current transform settings
		if (!dontTransform) {
			this._transformContext(_ctx);
		}

		this._renderEntity(_ctx, dontTransform);
	},

	flip: function (isFlipping) {
		if (taro.isServer && this._stats.flip !== isFlipping) {
			this.streamUpdateData([{ flip: isFlipping }]);
		} else if (taro.isClient) {
			this.emit('flip', [isFlipping]);
		}
		this._stats.flip = isFlipping;
	},

	/**
	 * Handles calling the texture.render() method if a texture
	 * is applied to the entity. This part of the tick process has
	 * been abstracted to allow it to be overridden by an extending
	 * class.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to render
	 * the entity to.
	 * @private
	 */
	_renderEntity: function (ctx) {
		if (this._opacity > 0) {
			// Check if the entity has a background pattern
			if (this._backgroundPattern) {
				if (!this._backgroundPatternFill) {
					// We have a pattern but no fill produced
					// from it. Check if we have a context to
					// generate a pattern from
					if (ctx) {
						// Produce the pattern fill
						this._backgroundPatternFill = ctx.createPattern(
							this._backgroundPattern.image,
							this._backgroundPatternRepeat
						);
					}
				}

				if (this._backgroundPatternFill) {
					// Draw the fill
					ctx.save();
					ctx.fillStyle = this._backgroundPatternFill;

					// TODO: When firefox has fixed their bug regarding negative rect co-ordinates, revert this change

					// This is the proper way to do this but firefox has a bug which I'm gonna report
					// so instead I have to use ANOTHER translate call instead. So crap!
					// ctx.rect(-this._bounds2d.x2, -this._bounds2d.y2, this._bounds2d.x, this._bounds2d.y);
					ctx.translate(-this._bounds2d.x2, -this._bounds2d.y2);
					ctx.rect(0, 0, this._bounds2d.x, this._bounds2d.y);
					if (this._backgroundPatternTrackCamera) {
						ctx.translate(-taro._currentCamera._translate.x, -taro._currentCamera._translate.y);
						ctx.scale(taro._currentCamera._scale.x, taro._currentCamera._scale.y);
					}
					ctx.fill();
					taro._drawCount++;

					if (this._backgroundPatternIsoTile) {
						ctx.translate(
							-Math.floor(this._backgroundPattern.image.width) / 2,
							-Math.floor(this._backgroundPattern.image.height / 2)
						);
						ctx.fill();
						taro._drawCount++;
					}

					ctx.restore();
				}
			}

			var texture = this._texture;

			// Check if the entity is visible based upon its opacity
			if (texture && texture._loaded) {
				// Draw the entity image

				// flip texture horizontally/vertically if requested
				if (this._stats.flip == 1) {
					ctx.save();
					ctx.scale(-1, 1);
				}
				if (this._stats.flip == 2) {
					ctx.save();
					ctx.scale(1, -1);
				}
				if (this._stats.flip == 3) {
					ctx.save();
					ctx.scale(-1, -1);
				}

				texture.render(ctx, this, taro._tickDelta);

				if (this._stats.flip > 0) {
					ctx.restore();
				}

				if (this._highlight) {
					ctx.globalCompositeOperation = 'lighter';
					texture.render(ctx, this);
				}
			}

			if (this._compositeCache && taro._currentViewport._drawCompositeBounds) {
				// TaroEntity.prototype.log('moo');
				ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
				ctx.fillRect(-this._bounds2d.x2, -this._bounds2d.y2, this._bounds2d.x, this._bounds2d.y);
				ctx.fillStyle = '#ffffff';
				ctx.fillText('Composite Entity', -this._bounds2d.x2, -this._bounds2d.y2 - 15);
				ctx.fillText(this.id(), -this._bounds2d.x2, -this._bounds2d.y2 - 5);
			}
		}
	},

	/**
	 * Draws the cached off-screen canvas image data to the passed canvas
	 * context.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to render
	 * the entity to.
	 * @private
	 */
	_renderCache: function (ctx) {
		ctx.save();
		if (this._compositeCache) {
			var aabbC = this._compositeAabbCache;
			ctx.translate(this._bounds2d.x2 + aabbC.x, this._bounds2d.y2 + aabbC.y);

			if (this._parent && this._parent._ignoreCamera) {
				// Translate the entity back to negate the scene translate
				var cam = taro._currentCamera;
				// ctx.translate(-cam._translate.x, -cam._translate.y);
				/* this.scaleTo(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
				this.rotateTo(-cam._rotate.x, -cam._rotate.y, -cam._rotate.z); */
			}
		}

		// We have a clean cached version so output that
		ctx.drawImage(this._cacheCanvas, -this._bounds2d.x2, -this._bounds2d.y2);

		if (taro._currentViewport._drawCompositeBounds) {
			ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
			ctx.fillRect(-this._bounds2d.x2, -this._bounds2d.y2, this._cacheCanvas.width, this._cacheCanvas.height);
			ctx.fillStyle = '#ffffff';
			ctx.fillText('Composite Cache', -this._bounds2d.x2, -this._bounds2d.y2 - 15);
			ctx.fillText(this.id(), -this._bounds2d.x2, -this._bounds2d.y2 - 5);
		}

		taro._drawCount++;

		if (this._highlight) {
			ctx.globalCompositeOperation = 'lighter';
			ctx.drawImage(this._cacheCanvas, -this._bounds2d.x2, -this._bounds2d.y2);

			taro._drawCount++;
		}
		ctx.restore();
	},

	/**
	 * Transforms a point by the entity's parent world matrix and
	 * it's own local matrix transforming the point to this entity's
	 * world space.
	 * @param {TaroPoint3d} point The point to transform.
	 * @example #Transform a point by the entity's world matrix values
	 *     var point = new TaroPoint3d(0, 0, 0);
	 *     entity._transformPoint(point);
	 *
	 *     TaroEntity.prototype.log(point);
	 * @return {TaroPoint3d} The transformed point.
	 * @private
	 */
	_transformPoint: function (point) {
		if (this._parent) {
			var tempMat = new TaroMatrix2d();
			// Copy the parent world matrix
			tempMat.copy(this._parent._worldMatrix);
			// Apply any local transforms
			tempMat.multiply(this._localMatrix);
			// Now transform the point
			tempMat.getInverse().transformCoord(point, this);
		} else {
			this._localMatrix.transformCoord(point, this);
		}

		return point;
	},

	/**
	 * Helper method to transform an array of points using _transformPoint.
	 * @param {Array} points The points array to transform.
	 * @private
	 */
	_transformPoints: function (points) {
		var point;
		var pointCount = points.length;

		var x = 0;
		while (pointCount--) {
			x++;
			if (x > 10000) {
				TaroEntity.prototype.log('TaroEntity 1964');
				break;
			} // for detecting infinite loops
			point = points[pointCount];
			if (this._parent) {
				var tempMat = new TaroMatrix2d();
				// Copy the parent world matrix
				tempMat.copy(this._parent._worldMatrix);
				// Apply any local transforms
				tempMat.multiply(this._localMatrix);
				// Now transform the point
				tempMat.getInverse().transformCoord(point, this);
			} else {
				this._localMatrix.transformCoord(point, this);
			}
		}
	},

	/**
	 * Generates a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @return {String} The string code fragment that will
	 * reproduce this entity when evaluated.
	 */
	_stringify: function (options) {
		// Make sure we have an options object
		if (options === undefined) {
			options = {};
		}

		// Get the properties for all the super-classes
		var str = TaroObject.prototype._stringify.call(this, options);
		var i;

		// Loop properties and add property assignment code to string
		for (i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
					case '_opacity':
						str += `.opacity(${this.opacity()})`;
						break;
					case '_texture':
						str += `.texture(taro.$('${this.texture().id()}'))`;
						break;
					case '_cell':
						str += `.cell(${this.cell()})`;
						break;
					case '_translate':
						if (options.transform !== false && options.translate !== false) {
							str += `.translateTo(${this._translate.x}, ${this._translate.y}, ${this._translate.z})`;
						}
						break;
					case '_rotate':
						if (options.transform !== false && options.rotate !== false) {
							str += `.rotateTo(${this._rotate.x}, ${this._rotate.y}, ${this._rotate.z})`;
						}
						break;
					case '_scale':
						if (options.transform !== false && options.scale !== false) {
							str += `.scaleTo(${this._scale.x}, ${this._scale.y}, ${this._scale.z})`;
						}
						break;
					case '_origin':
						if (options.origin !== false) {
							str += `.originTo(${this._origin.x}, ${this._origin.y}, ${this._origin.z})`;
						}
						break;
					case '_anchor':
						if (options.anchor !== false) {
							str += `.anchor(${this._anchor.x}, ${this._anchor.y})`;
						}
						break;
					case '_width':
						if (typeof this.width() === 'string') {
							str += `.width('${this.width()}')`;
						} else {
							str += `.width(${this.width()})`;
						}
						break;
					case '_height':
						if (typeof this.height() === 'string') {
							str += `.height('${this.height()}')`;
						} else {
							str += `.height(${this.height()})`;
						}
						break;
					case '_bounds3d':
						str += `.bounds3d(${this._bounds3d.x}, ${this._bounds3d.y}, ${this._bounds3d.z})`;
						break;
					case '_deathTime':
						if (options.deathTime !== false && options.lifeSpan !== false) {
							str += `.deathTime(${this.deathTime()})`;
						}
						break;
					case '_highlight':
						str += `.highlight(${this.highlight()})`;
						break;
				}
			}
		}

		return str;
	},

	/**
	 * Destroys the entity by removing it from the scenegraph,
	 * calling destroy() on any child entities and removing
	 * any active event listeners for the entity. Once an entity
	 * has been destroyed it's this._alive flag is also set to
	 * false.
	 * @example #Destroy the entity
	 *     entity.destroy();
	 */
	destroy: function (destroyOrphan) {
		// console.log(`taroEntity: destroy ${this._category} ${this.id()}`);

		this._alive = false;
		/* CEXCLUDE */
		// Check if the entity is streaming
		if (taro.isServer) {
			if (this._streamMode === 1 || this._streamMode === 2) {
				delete this._streamDataCache;
				this.streamDestroy();
			}
		}

		/* CEXCLUDE */
		if (this.gluedEntities && this.gluedEntities.length > 0) {
			this.gluedEntities.forEach(function (glueEntity) {
				var entity = taro.$(glueEntity.id);
				if (entity && entity.isRendering()) {
					entity.unMount();
					entity.destroy();

					delete taro.entitiesToRender.trackEntityById[glueEntity.id];
				}
			});
		}

		if (taro.isClient) {
			var entityId = this.entityId || this.id();
			if (taro.entitiesToRender.trackEntityById[entityId]) {
				if (taro.client.myPlayer?._stats.cameraTrackedUnitId == this.id()) {
					taro.client.emit('stop-follow');
				}

				delete taro.entitiesToRender.trackEntityById[entityId];
			}
			this.emit('destroy');
		}

		for (var region in taro.regionManager.entitiesInRegion) {
			delete taro.regionManager.entitiesInRegion[region][this.id()];
		}

		TaroEntity.prototype.log(
			`entity destroyed ${this.id()} category: ${this._category} ${this._stats ? this._stats.name : ''}`
		);
		this.emit('destroyed', this);

		// Call TaroObject.destroy()
		TaroObject.prototype.destroy.call(this);

		if (taro.isClient && taro.$('baseScene')._orphans) {
			delete taro.$('baseScene')._orphans[this._id];
		}
	},

	// remove all pointers referencing to this entity
	clearAllPointers: function () {
		var keysToDelete = [
			'ability',
			'animation',
			'attribute',
			'inventory',
			'minimapUnit',
			'unitUi',
			'_aabb',
			'_bounds2d',
			'_bounds3d',
			'_rotate',
			'_velocity',
		];
		for (var i = 0; i < keysToDelete.length; i++) {
			var key = keysToDelete[i];
			if (this[key] && typeof this[key].destroy === 'function') {
				this[key].destroy();
				delete this[key];
			}
		}
	},

	saveSpecialProp: function (obj, i) {
		switch (i) {
			case '_texture':
				if (obj._texture) {
					return { _texture: obj._texture.id() };
				}
				break;

			default:
				// Call super-class saveSpecialProp
				return TaroObject.prototype.saveSpecialProp.call(this, obj, i);
		}

		return undefined;
	},

	loadSpecialProp: function (obj, i) {
		switch (i) {
			case '_texture':
				return { _texture: taro.$(obj[i]) };

			default:
				// Call super-class loadSpecialProp
				return TaroObject.prototype.loadSpecialProp.call(this, obj, i);
		}
	},

	/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// INTERACTION
	/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Gets / sets the callback that is fired when a mouse
	 * move event is triggered.
	 * @param {Function=} callback
	 * @example #Hook the mouse move event and stop it propagating further down the scenegraph
	 *     entity.mouseMove(function (event, control) {
	 *         // Mouse moved with button
	 *         TaroEntity.prototype.log('Mouse move button: ' + event.button);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         taro.input.stopPropagation();
	 *     });
	 * @return {*}
	 */
	mouseMove: function (callback) {
		if (callback) {
			this._mouseMove = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseMove;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * over event is triggered.
	 * @param {Function=} callback
	 * @example #Hook the mouse over event and stop it propagating further down the scenegraph
	 *     entity.mouseOver(function (event, control) {
	 *         // Mouse over with button
	 *         TaroEntity.prototype.log('Mouse over button: ' + event.button);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         taro.input.stopPropagation();
	 *     });
	 * @return {*}
	 */
	mouseOver: function (callback) {
		if (callback) {
			this._mouseOver = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseOver;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * out event is triggered.
	 * @param {Function=} callback
	 * @example #Hook the mouse out event and stop it propagating further down the scenegraph
	 *     entity.mouseOut(function (event, control) {
	 *         // Mouse out with button
	 *         TaroEntity.prototype.log('Mouse out button: ' + event.button);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         taro.input.stopPropagation();
	 *     });
	 * @return {*}
	 */
	mouseOut: function (callback) {
		if (callback) {
			this._mouseOut = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseOut;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * up event is triggered.
	 * @param {Function=} callback
	 * @example #Hook the mouse up event and stop it propagating further down the scenegraph
	 *     entity.mouseUp(function (event, control) {
	 *         // Mouse up with button
	 *         TaroEntity.prototype.log('Mouse up button: ' + event.button);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         taro.input.stopPropagation();
	 *     });
	 * @return {*}
	 */
	mouseUp: function (callback) {
		if (callback) {
			this._mouseUp = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseUp;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * down event is triggered.
	 * @param {Function=} callback
	 * @example #Hook the mouse down event and stop it propagating further down the scenegraph
	 *     entity.mouseDown(function (event, control) {
	 *         // Mouse down with button
	 *         TaroEntity.prototype.log('Mouse down button: ' + event.button);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         taro.input.stopPropagation();
	 *     });
	 * @return {*}
	 */
	mouseDown: function (callback) {
		if (callback) {
			this._mouseDown = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseDown;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * wheel event is triggered.
	 * @param {Function=} callback
	 * @example #Hook the mouse wheel event and stop it propagating further down the scenegraph
	 *     entity.mouseWheel(function (event, control) {
	 *         // Mouse wheel with button
	 *         TaroEntity.prototype.log('Mouse wheel button: ' + event.button);
	 *         TaroEntity.prototype.log('Mouse wheel delta: ' + event.wheelDelta);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         taro.input.stopPropagation();
	 *     });
	 * @return {*}
	 */
	mouseWheel: function (callback) {
		if (callback) {
			this._mouseWheel = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseWheel;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * move event is triggered.
	 */
	mouseMoveOff: function () {
		delete this._mouseMove;

		return this;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * over event is triggered.
	 */
	mouseOverOff: function () {
		delete this._mouseOver;

		return this;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * out event is triggered.
	 */
	mouseOutOff: function () {
		delete this._mouseOut;

		return this;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * up event is triggered.
	 */
	mouseUpOff: function () {
		delete this._mouseUp;

		return this;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * down event is triggered if the listener was registered
	 * via the mouseDown() method.
	 */
	mouseDownOff: function () {
		delete this._mouseDown;

		return this;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * wheel event is triggered.
	 */
	mouseWheelOff: function () {
		delete this._mouseWheel;

		return this;
	},

	triggerPolygon: function (poly) {
		if (poly !== undefined) {
			this._triggerPolygon = poly;
			return this;
		}

		return this._triggerPolygon;
	},

	/**
	 * Gets / sets the shape / polygon that the mouse events
	 * are triggered against. There are two options, 'aabb' and
	 * 'isoBounds'. The default is 'aabb'.
	 * @param val
	 * @returns {*}
	 * @deprecated
	 */
	mouseEventTrigger: function (val) {
		TaroEntity.prototype.log('mouseEventTrigger is no longer in use. Please see triggerPolygon() instead.', 'warning');
		/* if (val !== undefined) {
			// Set default value
			this._mouseEventTrigger = 0;

			switch (val) {
				case 'isoBounds':
					this._mouseEventTrigger = 1;
					break;

				case 'custom':
					this._mouseEventTrigger = 2;
					break;

				case 'aabb':
					this._mouseEventTrigger = 0;
					break;
			}
			return this;
		}

		return this._mouseEventTrigger === 0 ? 'aabb' : 'isoBounds'; */
	},

	/**
	 * Handler method that determines which mouse-move event
	 * to fire, a mouse-over or a mouse-move.
	 * @private
	 */
	_handleMouseIn: function (event, evc, data) {
		// Check if the mouse move is a mouse over
		if (!this._mouseStateOver) {
			this._mouseStateOver = true;
			if (this._mouseOver) {
				this._mouseOver(event, evc, data);
			}

			/**
			 * Fires when the mouse moves over the entity.
			 * @event TaroEntity#mouseOver
			 * @param {Object} The DOM event object.
			 * @param {Object} The taro event control object.
			 * @param {*} Any further event data.
			 */
			this.emit('mouseOver', [event, evc, data]);
		}

		if (this._mouseMove) {
			this._mouseMove(event, evc, data);
		}
		this.emit('mouseMove', [event, evc, data]);
	},

	/**
	 * Handler method that determines if a mouse-out event
	 * should be fired.
	 * @private
	 */
	_handleMouseOut: function (event, evc, data) {
		// The mouse went away from this entity so
		// set mouse-down to false, regardless of the situation
		this._mouseStateDown = false;

		// Check if the mouse move is a mouse out
		if (this._mouseStateOver) {
			this._mouseStateOver = false;
			if (this._mouseOut) {
				this._mouseOut(event, evc, data);
			}

			/**
			 * Fires when the mouse moves away from the entity.
			 * @event TaroEntity#mouseOut
			 * @param {Object} The DOM event object.
			 * @param {Object} The taro event control object.
			 * @param {*} Any further event data.
			 */
			this.emit('mouseOut', [event, evc, data]);
		}
	},

	/**
	 * Handler method that determines if a mouse-wheel event
	 * should be fired.
	 * @private
	 */
	_handleMouseWheel: function (event, evc, data) {
		if (this._mouseWheel) {
			this._mouseWheel(event, evc, data);
		}

		/**
		 * Fires when the mouse wheel is moved over the entity.
		 * @event TaroEntity#mouseWheel
		 * @param {Object} The DOM event object.
		 * @param {Object} The taro event control object.
		 * @param {*} Any further event data.
		 */
		this.emit('mouseWheel', [event, evc, data]);
	},

	/**
	 * Handler method that determines if a mouse-up event
	 * should be fired.
	 * @private
	 */
	_handleMouseUp: function (event, evc, data) {
		// Reset the mouse-down flag
		this._mouseStateDown = false;
		if (this._mouseUp) {
			this._mouseUp(event, evc, data);
		}

		/**
		 * Fires when a mouse up occurs on the entity.
		 * @event TaroEntity#mouseUp
		 * @param {Object} The DOM event object.
		 * @param {Object} The taro event control object.
		 * @param {*} Any further event data.
		 */
		this.emit('mouseUp', [event, evc, data]);
	},

	/**
	 * Handler method that determines if a mouse-down event
	 * should be fired.
	 * @private
	 */
	_handleMouseDown: function (event, evc, data) {
		if (!this._mouseStateDown) {
			this._mouseStateDown = true;
			if (this._mouseDown) {
				this._mouseDown(event, evc, data);
			}

			/**
			 * Fires when a mouse down occurs on the entity.
			 * @event TaroEntity#mouseDown
			 * @param {Object} The DOM event object.
			 * @param {Object} The taro event control object.
			 * @param {*} Any further event data.
			 */
			this.emit('mouseDown', [event, evc, data]);
		}
	},

	/**
	 * Checks mouse input types and fires the correct mouse event
	 * handler. This is an internal method that should never be
	 * called externally.
	 * @param {Object} evc The input component event control object.
	 * @param {Object} data Data passed by the input component into
	 * the new event.
	 * @private
	 */
	_mouseInTrigger: function (evc, data) {
		if (taro.input.mouseMove) {
			// There is a mouse move event
			this._handleMouseIn(taro.input.mouseMove, evc, data);
		}

		if (taro.input.mouseDown) {
			// There is a mouse down event
			this._handleMouseDown(taro.input.mouseDown, evc, data);
		}

		if (taro.input.mouseUp) {
			// There is a mouse up event
			this._handleMouseUp(taro.input.mouseUp, evc, data);
		}

		if (taro.input.mouseWheel) {
			// There is a mouse wheel event
			this._handleMouseWheel(taro.input.mouseWheel, evc, data);
		}
	},

	/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// TRANSFORM
	/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Enables tracing calls which inadvertently assign NaN values to
	 * transformation properties. When called on an entity this system
	 * will break with a debug line when a transform property is set
	 * to NaN allowing you to step back through the call stack and
	 * determine where the offending value originated.
	 * @returns {TaroEntity}
	 */
	debugTransforms: function () {
		taro.traceSet(this._translate, 'x', 1, function (val) {
			return isNaN(val);
		});

		taro.traceSet(this._translate, 'y', 1, function (val) {
			return isNaN(val);
		});

		taro.traceSet(this._translate, 'z', 1, function (val) {
			return isNaN(val);
		});

		taro.traceSet(this._rotate, 'x', 1, function (val) {
			return isNaN(val);
		});

		taro.traceSet(this._rotate, 'y', 1, function (val) {
			return isNaN(val);
		});

		taro.traceSet(this._rotate, 'z', 1, function (val) {
			return isNaN(val);
		});

		taro.traceSet(this._scale, 'x', 1, function (val) {
			return isNaN(val);
		});

		taro.traceSet(this._scale, 'y', 1, function (val) {
			return isNaN(val);
		});

		taro.traceSet(this._scale, 'z', 1, function (val) {
			return isNaN(val);
		});

		return this;
	},

	velocityTo: function (x, y, z) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._velocity.x = x;
			this._velocity.y = y;
			this._velocity.z = z;
		} else {
			TaroEntity.prototype.log('velocityTo() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	velocityBy: function (x, y, z) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._velocity.x += x;
			this._velocity.y += y;
			this._velocity.z += z;
		} else {
			TaroEntity.prototype.log('velocityBy() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Translates the entity by adding the passed values to
	 * the current translation values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Translate the entity by 10 along the x axis
	 *     entity.translateBy(10, 0, 0);
	 * @return {*}
	 */
	translateBy: function (x, y, z) {
		if (!isNaN(x) && !isNaN(y) && !isNaN(z) && x !== undefined && y !== undefined && z !== undefined) {
			this._translate.x += x;
			this._translate.y += y;
			this._translate.z += z;
		} else {
			TaroEntity.prototype.log('translateBy() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Translates the entity to the passed values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Translate the entity to 10, 0, 0
	 *     entity.translateTo(10, 0, 0);
	 * @return {*}
	 */
	translateTo: function (x, y) {
		if (x !== undefined && y !== undefined && !isNaN(x) && !isNaN(y)) {
			if (this._translate) {
				this._translate.x = x;
				this._translate.y = y;
			}

			// ensure this entity is created at its latest position to the new clients. (instead of spawnPosition)
			// this.defaultData.translate = this._translate;
		} else {
			TaroEntity.prototype.log('translateTo() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	transformTexture: function (x, y, z) {
		if (!taro.isClient) return this;

		this.emit('transform', {
			x: x,
			y: y,
			rotation: z,
		});

		return this;
	},

	teleportTo: function (x, y, rotate, teleportCamera) {
		// console.log("teleportTo", x, y, rotate, this._stats.type)
		this.isTeleporting = true;
		this.nextKeyFrame[1] = [x, y, rotate];
		this.teleportCamera = teleportCamera;
		this.teleportDestination = [x, y, rotate];
		this.reconRemaining = undefined; // when a unit is teleported, end reconciliation
		// this.setLinearVelocityLT(0, 0);

		this.translateTo(x, y);
		if (rotate != undefined) {
			this.rotateTo(0, 0, rotate);
		}

		if (taro.isServer) {
			this.clientStreamedPosition = undefined;
		} else if (taro.isClient) {
			// client-side prediction is enabled (cspMode either 1 or 2)
			let myUnit = taro.client.selectedUnit;
			if (this === myUnit && taro.physics && this._stats.controls?.cspMode) {
				myUnit.serverStreamedPosition = {
					x: x,
					y: y,
					rotation: rotate,
				};
			}
			this.isTransforming(true);
			//instantly move to camera the new position
			if (teleportCamera && taro.client.myPlayer?._stats.cameraTrackedUnitId === this.id()) {
				taro.client.emit('camera-instant-move', [x, y]);
			}
		}

		if (this._category == 'unit') {
			// teleport unit's attached items as well. otherwise, the attached bodies (using joint) can cause a drag and
			// teleport the unit to a location that's between the origin and the destination
			for (entityId in this.jointsAttached) {
				if ((attachedEntity = taro.$(entityId))) {
					if (attachedEntity._category == 'item') {
						// to prevent infinite loop, only move items that are attached to unit
						attachedEntity.teleportTo(
							attachedEntity._translate.x + offsetX,
							attachedEntity._translate.y + offsetY,
							attachedEntity._rotate.z
						);
					}
				}
			}
		}
	},

	/**
	 * Translates the entity to the passed point.
	 * @param {TaroPoint3d} point The point with co-ordinates.
	 * @example #Translate the entity to 10, 0, 0
	 *     var point = new TaroPoint3d(10, 0, 0),
	 *         entity = new TaroEntity();
	 *
	 *     entity.translateToPoint(point);
	 * @return {*}
	 */
	translateToPoint: function (point) {
		if (point !== undefined) {
			this._translate.x = point.x;
			this._translate.y = point.y;
			this._translate.z = point.z;
		} else {
			TaroEntity.prototype.log('translateToPoint() called with a missing or undefined point parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Translates the object to the tile co-ordinates passed.
	 * @param {Number} x The x tile co-ordinate.
	 * @param {Number} y The y tile co-ordinate.
	 * @param {Number=} z The z tile co-ordinate.
	 * @example #Translate entity to tile
	 *     // Create a tile map
	 *     var tileMap = new TaroTileMap2d()
	 *         .tileWidth(40)
	 *         .tileHeight(40);
	 *
	 *     // Mount our entity to the tile map
	 *     entity.mount(tileMap);
	 *
	 *     // Translate the entity to the tile x:10, y:12
	 *     entity.translateToTile(10, 12, 0);
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	translateToTile: function (x, y, z) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			var finalZ;

			// Handle being passed a z co-ordinate
			if (z !== undefined) {
				finalZ = z * this._parent._tileWidth;
			} else {
				finalZ = this._translate.z;
			}

			this.translateTo(
				x * this._parent._tileWidth + this._parent._tileWidth / 2,
				y * this._parent._tileHeight + this._parent._tileWidth / 2,
				finalZ
			);
		} else {
			TaroEntity.prototype.log(
				'Cannot translate to tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.',
				'warning'
			);
		}

		return this;
	},

	/**
	 * Gets the translate accessor object.
	 * @example #Use the translate accessor object to alter the y co-ordinate of the entity to 10
	 *     entity.translate().y(10);
	 * @return {*}
	 */
	translate: function () {
		if (arguments.length) {
			TaroEntity.prototype.log(
				'You called translate with arguments, did you mean translateTo or translateBy instead of translate?',
				'warning'
			);
		}

		this.x = this._translateAccessorX;
		this.y = this._translateAccessorY;
		this.z = this._translateAccessorZ;

		return this._entity || this;
	},

	/**
	 * The translate accessor method for the x axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.translate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_translateAccessorX: function (val) {
		if (val !== undefined) {
			this._translate.x = val;
			return this._entity || this;
		}

		return this._translate.x;
	},

	/**
	 * The translate accessor method for the y axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.translate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_translateAccessorY: function (val) {
		if (val !== undefined) {
			this._translate.y = val;
			return this._entity || this;
		}

		return this._translate.y;
	},

	/**
	 * The translate accessor method for the z axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.translate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_translateAccessorZ: function (val) {
		// TODO: Do we need to do anything to the matrix here for iso views?
		// this._localMatrix.translateTo(this._translate.x, this._translate.y);
		if (val !== undefined) {
			this._translate.z = val;
			return this._entity || this;
		}

		return this._translate.z;
	},

	/**
	 * Rotates the entity by adding the passed values to
	 * the current rotation values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Rotate the entity by 10 degrees about the z axis
	 *     entity.rotateBy(0, 0, Math.radians(10));
	 * @return {*}
	 */
	rotateBy: function (x, y, z) {
		if (!isNaN(x) && !isNaN(y) && !isNaN(z) && x !== undefined && y !== undefined && z !== undefined) {
			this._rotate.x += x;
			this._rotate.y += y;
			this._rotate.z += z;
			this.transformTexture(0, 0, z); // TODO x and y should probably not be 0
		} else {
			TaroEntity.prototype.log('rotateBy() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Rotates the entity to the passed values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Rotate the entity to 10 degrees about the z axis
	 *     entity.rotateTo(0, 0, Math.radians(10));
	 * @return {*}
	 */
	rotateTo: function (x, y, z) {
		// if (this._category == 'item')
		// 	console.log("asdf!", z)
		if (!isNaN(x) && !isNaN(y) && !isNaN(z) && x !== undefined && y !== undefined && z !== undefined) {
			this._rotate.x = x;
			this._rotate.y = y;
			this._rotate.z = z;
		} else {
			TaroEntity.prototype.log('rotateTo() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Gets the translate accessor object.
	 * @example #Use the rotate accessor object to rotate the entity about the z axis 10 degrees
	 *     entity.rotate().z(Math.radians(10));
	 * @return {*}
	 */
	rotate: function () {
		if (arguments.length) {
			TaroEntity.prototype.log(
				'You called rotate with arguments, did you mean rotateTo or rotateBy instead of rotate?',
				'warning'
			);
		}

		this.x = this._rotateAccessorX;
		this.y = this._rotateAccessorY;
		this.z = this._rotateAccessorZ;

		return this._entity || this;
	},

	/**
	 * The rotate accessor method for the x axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.rotate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_rotateAccessorX: function (val) {
		if (val !== undefined) {
			this._rotate.x = val;
			return this._entity || this;
		}

		return this._rotate.x;
	},

	/**
	 * The rotate accessor method for the y axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.rotate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_rotateAccessorY: function (val) {
		if (val !== undefined) {
			this._rotate.y = val;
			return this._entity || this;
		}

		return this._rotate.y;
	},

	/**
	 * The rotate accessor method for the z axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.rotate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_rotateAccessorZ: function (val) {
		if (val !== undefined) {
			this._rotate.z = val;
			return this._entity || this;
		}

		return this._rotate.z;
	},

	/**
	 * Scales the entity by adding the passed values to
	 * the current scale values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Scale the entity by 2 on the x axis
	 *     entity.scaleBy(2, 0, 0);
	 * @return {*}
	 */
	scaleBy: function (x, y, z) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._scale.x += x;
			this._scale.y += y;
			this._scale.z += z;
		} else {
			TaroEntity.prototype.log('scaleBy() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Scale the entity to the passed values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Set the entity scale to 1 on all axes
	 *     entity.scaleTo(1, 1, 1);
	 * @return {*}
	 */
	scaleTo: function (x, y, z) {
		if (taro.isClient) {
			this.emit('scale', {
				x: x,
				y: y,
			});
		}

		if (this._scale && x !== undefined && y !== undefined && z !== undefined) {
			this._scale.x = x;
			this._scale.y = y;
			this._scale.z = z;
			// TaroEntity.prototype.log("scaling to ", this._scale)
		} else {
			TaroEntity.prototype.log('scaleTo() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	scaleDimensions: function (width, height) {
		if (this._stats.scaleDimensions) {
			var originalWidth = this.width();
			var originalHeight = this.height();
			var scaleX = width / originalWidth;
			var scaleY = height / originalHeight;

			if (taro.isServer) {
				this.scaleTo(scaleX, scaleY, 0);
				this.updateBody(undefined, false, true);
			} else {
				this.height(height);
				this.width(width);
			}
		}
	},

	/**
	 * Gets the scale accessor object.
	 * @example #Use the scale accessor object to set the scale of the entity on the x axis to 1
	 *     entity.scale().x(1);
	 * @return {*}
	 */
	scale: function () {
		if (arguments.length) {
			TaroEntity.prototype.log(
				'You called scale with arguments, did you mean scaleTo or scaleBy instead of scale?',
				'warning'
			);
		}

		this.x = this._scaleAccessorX;
		this.y = this._scaleAccessorY;
		this.z = this._scaleAccessorZ;

		return this._entity || this;
	},

	/**
	 * The scale accessor method for the x axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.scale().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_scaleAccessorX: function (val) {
		if (val !== undefined) {
			this._scale.x = val;
			return this._entity || this;
		}

		return this._scale.x;
	},

	/**
	 * The scale accessor method for the y axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.scale().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_scaleAccessorY: function (val) {
		if (val !== undefined) {
			this._scale.y = val;
			return this._entity || this;
		}

		return this._scale.y;
	},

	/**
	 * The scale accessor method for the z axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.scale().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_scaleAccessorZ: function (val) {
		if (val !== undefined) {
			this._scale.z = val;
			return this._entity || this;
		}

		return this._scale.z;
	},

	/**
	 * Sets the origin of the entity by adding the passed values to
	 * the current origin values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Add 0.5 to the origin on the x axis
	 *     entity.originBy(0.5, 0, 0);
	 * @return {*}
	 */
	originBy: function (x, y, z) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._origin.x += x;
			this._origin.y += y;
			this._origin.z += z;
		} else {
			TaroEntity.prototype.log('originBy() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Set the origin of the entity to the passed values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Set the entity origin to 0.5 on all axes
	 *     entity.originTo(0.5, 0.5, 0.5);
	 * @return {*}
	 */
	originTo: function (x, y, z) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._origin.x = x;
			this._origin.y = y;
			this._origin.z = z;
		} else {
			TaroEntity.prototype.log('originTo() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Gets the origin accessor object.
	 * @example #Use the origin accessor object to set the origin of the entity on the x axis to 1
	 *     entity.origin().x(1);
	 * @return {*}
	 */
	origin: function () {
		this.x = this._originAccessorX;
		this.y = this._originAccessorY;
		this.z = this._originAccessorZ;

		return this._entity || this;
	},

	/**
	 * The origin accessor method for the x axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.origin().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_originAccessorX: function (val) {
		if (val !== undefined) {
			this._origin.x = val;
			return this._entity || this;
		}

		return this._origin.x;
	},

	/**
	 * The origin accessor method for the y axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.origin().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_originAccessorY: function (val) {
		if (val !== undefined) {
			this._origin.y = val;
			return this._entity || this;
		}

		return this._origin.y;
	},

	/**
	 * The origin accessor method for the z axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.origin().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_originAccessorZ: function (val) {
		if (val !== undefined) {
			this._origin.z = val;
			return this._entity || this;
		}

		return this._origin.z;
	},

	_rotatePoint: function (point, radians, origin) {
		var cosAngle = Math.cos(radians);
		var sinAngle = Math.sin(radians);

		return {
			x: origin.x + (point.x - origin.x) * cosAngle + (point.y - origin.y) * sinAngle,
			y: origin.y - (point.x - origin.x) * sinAngle + (point.y - origin.y) * cosAngle,
		};
	},

	/**
	 * Checks the current transform values against the previous ones. If
	 * any value is different, the appropriate method is called which will
	 * update the transformation matrix accordingly.
	 */
	updateTransform: function () {
		taro.updateTransform++;
		this._localMatrix.identity();

		if (this._mode === 0) {
			// 2d translation
			this._localMatrix.multiply(this._localMatrix._newTranslate(this._translate.x, this._translate.y));
		}

		if (this._mode === 1) {
			if (!isNaN(this._translate.x) && !isNaN(this._translate.y)) {
				// iso translation
				var isoPoint = (this._translateIso = new TaroPoint3d(
					this._translate.x,
					this._translate.y,
					this._translate.z + this._bounds3d.z / 2
				).toIso());

				if (this._parent && this._parent._bounds3d.z) {
					// This adjusts the child entity so that 0, 0, 0 inside the
					// parent is the center of the base of the parent
					isoPoint.y += this._parent._bounds3d.z / 1.6;
				}

				this._localMatrix.multiply(this._localMatrix._newTranslate(isoPoint.x, isoPoint.y));
			} else {
				console.log('localMatrix translate error: ', this._category, this._translate);
				if (taro.chat)
					taro.chat.postMessage({
						text: `localMatrix translate error: ${this._category}${this._stats}`,
					});
			}
		}

		taro.matrixEntityId = this.id();
		taro.matrixAngle = this._rotate.z;

		this._localMatrix.rotateBy(this._rotate.z);
		this._localMatrix.scaleBy(this._scale.x, this._scale.y);

		// Adjust local matrix for origin values if not at center
		if (this._origin.x !== 0.5 || this._origin.y !== 0.5) {
			this._localMatrix.translateBy(
				this._bounds2d.x * (0.5 - this._origin.x),
				this._bounds2d.y * (0.5 - this._origin.y)
			);
		}

		// TODO: If the parent and local transforms are unchanged, we should used cached values
		if (this._parent) {
			this._worldMatrix.copy(this._parent._worldMatrix);
			this._worldMatrix.multiply(this._localMatrix);
		} else {
			this._worldMatrix.copy(this._localMatrix);
		}

		// Check if the world matrix has changed and if so, set a few flags
		// to allow other methods to know that a matrix change has occurred
		if (!this._worldMatrix.compare(this._oldWorldMatrix)) {
			this._oldWorldMatrix.copy(this._worldMatrix);
			this._transformChanged = true;
			this._aabbDirty = true;
			this._bounds3dPolygonDirty = true;
		} else {
			this._transformChanged = false;
		}

		// Check if the geometry has changed and if so, update the aabb dirty
		if (!this._oldBounds2d.compare(this._bounds2d)) {
			this._aabbDirty = true;

			// Record the new geometry to the oldGeometry data
			this._oldBounds2d.copy(this._bounds2d);
		}

		if (!this._oldBounds3d.compare(this._bounds3d)) {
			this._bounds3dPolygonDirty = true;

			// Record the new geometry to the oldGeometry data
			this._oldBounds3d.copy(this._bounds3d);
		}

		return this;
	},

	/**
	 * Gets / sets the disable interpolation flag. If set to true then
	 * stream data being received by the client will not be interpolated
	 * and will be instantly assigned instead. Useful if your entity's
	 * transformations should not be interpolated over time.
	 * @param val
	 * @returns {*}
	 */
	disableInterpolation: function (val) {
		if (val !== undefined) {
			this._disableInterpolation = val;
			return this;
		}

		return this._disableInterpolation;
	},

	/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// STREAM
	/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Gets / sets the array of sections that this entity will
	 * encode into its stream data.
	 * @param {Array=} sectionArray An array of strings.
	 * @example #Define the sections this entity will use in the network stream. Use the default "transform" section as well as a "custom1" section
	 *     entity.streamSections('transform', 'custom1');
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	streamSections: function (sectionArray) {
		if (sectionArray !== undefined) {
			this._streamSections = sectionArray;
			return this;
		}

		return this._streamSections;
	},

	/**
	 * Adds a section into the existing streamed sections array.
	 * @param {String} sectionName The section name to add.
	 */
	streamSectionsPush: function (sectionName) {
		this._streamSections = this._streamSections || [];
		this._streamSections.push(sectionName);

		return this;
	},
	getPersistentData: function (type) {
		var self = this;
		var dataToBeSaved = {};
		var variables = {};
		var unit = null;
		var player = null;
		var isUnitExists = false;

		dataToBeSaved[type] = {};

		if (type == 'player') {
			player = self;
			unit = taro.$(player._stats.selectedUnitId);

			if (!player || !player._stats) return;
		} else if (type == 'unit') {
			unit = self;
			player = unit.getOwner();

			if (!unit || !unit._stats) return;
		}

		isUnitExists = !!(unit && unit._stats);

		var variablesToBeIgnored = ['playerGroup', 'itemGroup', 'unitGroup'];
		for (var variablesId in self.variables) {
			var variable = self.variables[variablesId];
			if (!variablesToBeIgnored.includes(variable.dataType)) {
				variables[variablesId] = rfdc()(variable);
			}
		}

		if (isUnitExists) {
			// remove all passive attributes applied to this unit
			unit._stats.itemIds.forEach(function (itemId) {
				if (itemId) {
					var item = taro.$(itemId);
					if (item && item._stats && item._stats.bonus && item._stats.bonus.passive) {
						if (
							item._stats.slotIndex < unit._stats.inventorySize ||
							item._stats.bonus.passive.isDisabledInBackpack != true
						) {
							unit.updateStats(itemId, true);
						}
					} else {
						unit.updateStats(itemId, true);
					}
				}
			});
		}

		dataToBeSaved[type] = {
			attributes: rfdc()(self._stats.attributes),
			variables: variables,
			quests: type === 'player' ? self.quests : undefined,
		};

		if (isUnitExists) {
			// add all passive attributes applyed to this unit
			unit._stats.itemIds.forEach(function (itemId) {
				if (itemId) {
					var item = taro.$(itemId);
					if (item && item._stats && item._stats.bonus && item._stats.bonus.passive) {
						if (
							item._stats.slotIndex < unit._stats.inventorySize ||
							item._stats.bonus.passive.isDisabledInBackpack != true
						) {
							unit.updateStats(itemId);
						}
					} else {
						unit.updateStats(itemId);
					}
				}
			});
		}

		if (isUnitExists && type == 'unit' && unit._stats.itemIds) {
			var inventoryItems = unit._stats.itemIds.reduce(function (pv, cv) {
				if (cv) {
					var item = taro.$(cv);
					if (item) {
						var itemVariable = {};
						for (var variablesId in item.variables) {
							var variable = item.variables[variablesId];
							if (!variablesToBeIgnored.includes(variable.dataType)) {
								itemVariable[variablesId] = rfdc()(variable);
							}
						}
						var itemStatsToBeSaved = {
							itemTypeId: item._stats.itemTypeId,
							attributes: rfdc()(item._stats.attributes),
							variables: rfdc()(itemVariable),
							quantity: item._stats.quantity,
							slotIndex: item._stats.slotIndex,
						};

						pv.push(itemStatsToBeSaved);
					}
				}
				return pv;
			}, []);
			dataToBeSaved[type].inventoryItems = inventoryItems;
		}

		return rfdc()(dataToBeSaved[type]);
	},

	updateStats: function (itemId, removeAttributes) {
		var self = this;
		var item = taro.$(itemId);
		if (!taro.isServer) return;
		// 1. store the unit's current attribute values. let's say we had 500/600 HP (base max 100hp)
		var currentType = this._category === 'unit' ? 'unitTypes' : 'playerTypes';
		var bonusType = this._category === 'unit' ? 'unitAttribute' : 'playerAttribute';
		var currentEntityTypeId = this._category === 'unit' ? 'type' : 'playerTypeId';

		var baseEntityStats = taro.game.getAsset(currentType, this._stats[currentEntityTypeId]);

		if (!baseEntityStats) {
			return;
		}

		var unit = self;
		if (currentType === 'playerTypes') {
			unit = this.getSelectedUnit();
		}

		if (
			item &&
			item._stats.bonus &&
			item._stats.bonus.passive &&
			unit &&
			(unit.canUseItem(item._stats) || removeAttributes)
		) {
			var attributePassiveBonuses = item._stats.bonus.passive[bonusType];

			if (attributePassiveBonuses) {
				for (var attrId in attributePassiveBonuses) {
					var selectedAttribute = this._stats.attributes[attrId];
					var bonus = attributePassiveBonuses[attrId];

					if (selectedAttribute && bonus) {
						var currentAttributeValue = parseFloat(selectedAttribute.value) || 1;
						var maxValue = parseFloat(selectedAttribute.max);
						if (currentAttributeValue != undefined) {
							if (removeAttributes) {
								if (bonus.type === 'percentage') {
									var newValue = currentAttributeValue / (1 + parseFloat(bonus.value) / 100);
									var newMax = maxValue / (1 + parseFloat(bonus.value) / 100);
								} else {
									var newMax = maxValue - parseFloat(bonus.value);
									var newValue = Math.min(newMax, Math.max(selectedAttribute.min, currentAttributeValue));
								}
							} else {
								if (bonus.type === 'percentage') {
									var newValue = currentAttributeValue * (1 + parseFloat(bonus.value) / 100);
									var newMax = maxValue * (1 + parseFloat(bonus.value) / 100);
								} else {
									var newMax = maxValue + parseFloat(bonus.value);
									var newValue = Math.min(newMax, Math.max(selectedAttribute.min, currentAttributeValue));
								}
							}
							// this._stats.attributes[attrId].value = newValue;
							// this._stats.attributes[attrId].max = newMax;
							// updatedAttributes[attrId] = newValue;
							// updatedAttributes[attrId] = newMax;
							this.attribute.update(attrId, newValue, null, newMax);
							this.attribute.setMax(attrId, newMax);
						}
					}
				}
			}
		}
		// update player attributes;
		if (currentType === 'unitTypes') {
			var player = this.getOwner();
			player && player.updateStats(itemId, removeAttributes);
		}
	},

	loadPersistentData: function (persistData) {
		var self = this;

		if (persistData) {
			var attributes = persistData.attributes;
			var max = {};
			var min = {};
			var regSpeed = {};
			var keysToStream = ['min', 'max', 'regenerateSpeed', 'value'];
			for (var attrKey in attributes) {
				var persistAttribute = attributes[attrKey];
				var playerAttribute = self._stats && self._stats.attributes && self._stats.attributes[attrKey];
				if (playerAttribute) {
					for (var i = 0; i < keysToStream.length; i++) {
						var key = keysToStream[i];
						switch (key) {
							// we are persisting min, max and regenerating speed for
							// consumed item giving any bonuses
							case 'min':
								playerAttribute.min = persistAttribute[key];
								min[attrKey] = persistAttribute[key];
								break;
							case 'max':
								playerAttribute.max = persistAttribute[key];
								max[attrKey] = persistAttribute[key];
								break;
							case 'regenerateSpeed':
								playerAttribute.regenerateSpeed = persistAttribute[key];
								regSpeed[attrKey] = persistAttribute[key];
								break;
							case 'value':
								var newValue = Math.max(playerAttribute.min, Math.min(persistAttribute[key], playerAttribute.max));
								self.attribute.update(attrKey, newValue, playerAttribute.min, playerAttribute.max, true);
								break;
						}
					}
				}
			}
			self.streamUpdateData([{ attributesRegenerateRate: regSpeed }]);

			var variables = persistData.variables;
			var quests = persistData.quests;

			if (self && self.quests && quests) {
				self.quests = quests;
				self.streamUpdateData([
					{
						quests,
					},
				]);
			}

			for (var variableKey in variables) {
				var persistVariable = variables[variableKey];

				if (self && self.variables && self.variables[variableKey]) {
					// self.variables[variableKey] = persistVariable;
					// use variable update method instead of directly writing to variables
					self.variable.update(variableKey, persistVariable.value);
				}
			}

			// self.variable.init(self);
		}
	},

	isAttributeChanged: function (attrName, newUpdate) {
		var hasChanged = false;
		for (key in newUpdate) {
			if (newUpdate[key] !== this.lastUpdatedData[attrName][key]) {
				hasChanged = true;
			}
		}
	},

	// use to apply max,min value before attributes value
	// orderData: function (data) {
	// 	var attributes = data.attributes && rfdc()(data.attributes);
	// 	var attributesMax = data.attributesMax && rfdc()(data.attributesMax);
	// 	var attributesMin = data.attributesMin && rfdc()(data.attributesMin);
	// 	if (attributesMax) {
	// 		delete data.attributesMax;
	// 		data.attributesMax = attributesMax;
	// 	}
	// 	if (attributesMin) {
	// 		delete data.attributesMin;
	// 		data.attributesMin = attributesMin;
	// 	}
	// 	if (attributes) {
	// 		delete data.attributes;
	// 		data.attributes = attributes;
	// 	}
	// 	return data;
	// },

	streamUpdateData: function (queuedData, clientId) {
		if (queuedData != undefined) {
			for (var i = 0; i < queuedData.length; i++) {
				var data = queuedData[i];
				for (attrName in data) {
					var newValue = data[attrName];
					// console.log(this._category, this.id(), attrName, newValue)
					switch (attrName) {
						case 'attributes':
							// only on client side to prevent circular recursion
							if (taro.isClient) {
								var attributesObject = rfdc()(this._stats.attributes);
								if (attributesObject) {
									for (var attributeTypeId in data.attributes) {
										var attributeData = attributesObject[attributeTypeId];
										// streamMode 4 ignores
										if (this._category == 'unit') {
											var ownerPlayer = this.getOwner();
										} else if (this._category == 'item') {
											var ownerPlayer = this.getOwnerUnit()?.getOwner();
										}

										if (
											attributeData &&
											// ignore update if streamMode = 4 and it's for my own unit
											!(ownerPlayer?._stats?.clientId == taro.network.id() && attributeData.streamMode == 4)
										) {
											// package MIN update with VALUE
											let min = null;
											if (
												!(
													data.attributes[attributeTypeId].min === null ||
													data.attributes[attributeTypeId].min === undefined
												)
											) {
												min = attributeData.min = data.attributes[attributeTypeId].min;
											}

											// package MAX update with VALUE
											let max = null;
											if (
												!(
													data.attributes[attributeTypeId].max === null ||
													data.attributes[attributeTypeId].max === undefined
												)
											) {
												max = attributeData.max = data.attributes[attributeTypeId].max;
											}

											// pass OR null in cases where max value is updated twice in succession
											// without this, client update call passes undefined as value
											let value =
												data.attributes[attributeTypeId].value || data.attributes[attributeTypeId].value === 0
													? data.attributes[attributeTypeId].value
													: null;
											this.attribute.update(attributeTypeId, value, min, max);
											this.unitUi && this.unitUi.updateAttributeBar(attributeTypeId);
										}
										// update attribute if entity has such attribute
									}
								}
							}
							// else if (taro.isServer) {
							// 	for (var attributeTypeId in data.attributes) {
							// 		// prevent attribute being passed to client if it is invisible
							// 		if (this._stats.attributes && this._stats.attributes[attributeTypeId]) {
							// 			var attribute = this._stats.attributes[attributeTypeId];
							// 			if (
							// 				(attribute.streamMode != null && attribute.streamMode != 1) && // don't stream if streamMode isn't sync'ed (1). Also added != null for legacy support.
							// 				attributeTypeId !== taro.game.data.settings.scoreAttributeId // always stream attribute that's used for scoreboard
							// 			) {
							// 				delete data[attrName];
							// 			}
							// 		}
							// 	}
							// }
							break;

						// deprecated
						case 'attributesMax':
							if (this._stats.attributes) {
								// only on client side to prevent circular recursion
								for (var attributeTypeId in data.attributesMax) {
									if (this._stats.attributes && this._stats.attributes[attributeTypeId]) {
										this._stats.attributes[attributeTypeId].max = data.attributesMax[attributeTypeId];
									}

									// update attribute if entity has such attribute
									if (taro.isClient) {
										if (this._category === 'unit') {
											// this.updateAttributeBar(this._stats.attributes[attributeTypeId]);
											this.unitUi && this.unitUi.updateAttributeBar(attributeTypeId);
										}
									}
								}
							}
							break;

						// deprecated
						case 'attributesMin':
							// only on client side to prevent circular recursion
							for (var attributeTypeId in data.attributesMin) {
								if (this._stats.attributes && this._stats.attributes[attributeTypeId]) {
									this._stats.attributes[attributeTypeId].min = data.attributesMin[attributeTypeId];

									// update attribute if entity has such attribute
									if (taro.isClient) {
										if (this._category === 'unit') {
											this.updateAttributeBar(this._stats.attributes[attributeTypeId]);
											this.unitUi && this.unitUi.updateAttributeBar(attributeTypeId);
										}
									}
								}
							}
							break;

						case 'attributesRegenerateRate':
							// only on client side to prevent circular recursion
							for (var attributeTypeId in data.attributesRegenerateRate) {
								if (this._stats.attributes && this._stats.attributes[attributeTypeId]) {
									this._stats.attributes[attributeTypeId].regenerateSpeed =
										data.attributesRegenerateRate[attributeTypeId];
								}
							}
							break;

						case 'variables':
							// only on client side to prevent circular recursion
							if (taro.isClient) {
								var variablesObject = rfdc()(this.variables);
								if (variablesObject) {
									for (var variableId in data.variables) {
										var variableData = variablesObject[variableId];
										// streamMode 4 ignores
										if (this._category == 'unit') {
											var ownerPlayer = this.getOwner();
										} else if (this._category == 'item') {
											var ownerPlayer = this.getOwnerUnit()?.getOwner();
										}

										if (
											variableData &&
											// ignore update if streamMode = 4 and it's for my own unit
											!(ownerPlayer?._stats?.clientId == taro.network.id() && variableData.streamMode == 4)
										) {
											this.variable.update(variableId, data.variables[variableId]);
										}
										// update attribute if entity has such attribute
									}
								}
							}
							break;
						case 'quests':
							break;
						//FIXME: when the 3d physics is ready, remove this
						case 'temp_translation_y':
							if (taro.isClient) {
								this.emit('temp_translation_y', [data.temp_translation_y]);
							}
							break;
						case 'depth':
							this._stats[attrName] = newValue;
							if (taro.isClient) {
								this.depth(data.depth);
							}
							break;
						case 'opacity':
							if (taro.isClient) {
								this.opacity(newValue);
							}
							break;

						case 'flip':
							this._stats[attrName] = newValue;
							// ignore flip command from server for my own unit, because it's already done locally
							if (
								taro.isClient &&
								this != taro.client.selectedUnit &&
								!(this._category == 'item' && this.getOwnerUnit() == taro.client.selectedUnit)
							) {
								this.flip(newValue);
							}
							break;

						case 'ownerId':
							this._stats[attrName] = newValue;
							this.oldOwnerId = this._stats[attrName]; // should this not be placed above the line above?
							break;

						case 'rotate':
							if (typeof newValue === 'number') {
								this.rotateTo(0, 0, newValue);
							}
							break;

						default:
							if (taro.isServer) {
								this._stats[attrName] = newValue;
							}

							break;
					}

					if (taro.isServer) {
						// keys that will stream even if its new value is same as the previous value
						if (typeof this.queueStreamData === 'function') {
							// var forceStreamKeys = ['anim', 'coin', 'stateId', 'ownerId', 'name', 'slotIndex', 'newItemId', 'quantity', 'spriteOnly', 'setFadingText', 'playerJoinedAgain', 'use', 'hidden'];
							var forceStreamKeys = [
								'anim',
								'coin',
								'setFadingText',
								'playerJoinedAgain',
								'useQueued',
								'isHidden',
								'cameraTrackedUnitId',
								'opacity',
							];
							var dataIsAttributeRelated = [
								'attributes',
								'attributesMin',
								'attributesMax',
								'attributesRegenerateRate',
							].includes(attrName);
							if (
								newValue !== this.lastUpdatedData[attrName] ||
								dataIsAttributeRelated ||
								forceStreamKeys.includes(attrName)
							) {
								var streamData = {};
								streamData[attrName] = data[attrName];

								if (clientId) {
									var data = {};
									data[this.id()] = streamData;
									taro.network.send('streamUpdateData', data, clientId); // send update to a specific client
								} else {
									this.queueStreamData(streamData); // broadcast update to all clients
								}

								// for server-side only: cache last updated data, so we dont stream same data again (this optimizes CPU usage by a lot)
								this.lastUpdatedData[attrName] = rfdc()(newValue);
							}
							// else console.log(this._category, this._stats.name, attrName, "is the same as previous", this.lastUpdatedData[attrName], "new", newValue)
						}
					} else if (taro.isClient) {
						switch (attrName) {
							case 'quests':
								var gameId = taro.game.data.defaultData._id;
								if (newValue.active !== undefined) {
									this.quests = newValue;
								} else {
									Object.entries(newValue).map(([questId, v], idx) => {
										if (v.removed === true) {
											if (this.quests.active[gameId][questId] !== undefined) {
												delete this.quests.active[gameId][questId];
											}
											this.quests.completed[gameId] = this.quests.completed[gameId].filter((id) => id !== questId);

											return;
										}
										if (v.completed === true) {
											delete this.quests.active[gameId][questId];
											this.quests.completed[gameId].push(questId);
											return;
										}
										if (v.name !== undefined) {
											this.quests.active[gameId][questId] = v;
											return;
										}
										if (v.progress !== undefined) {
											this.quests.active[gameId][questId].progress = v.progress;
											return;
										}
									});
								}
								break;
							case 'anim':
								var animationId = newValue;
								this.applyAnimationById(animationId);
								break;

							case 'stateId':
								var stateId = newValue;
								this.setState(stateId);

								if (this._category == 'item') {
									var owner = this.getOwnerUnit();
									// update state only iff it's not my unit's item
									if (owner == taro.client.selectedUnit) {
										// don't repeat whip-out tween for my own unit as it has already been executed from unit.changeItem()
									} else if (stateId == 'selected') {
										this.applyAnimationForState(stateId);

										// whip-out the new item using tween
										// unless item is 'unusable'
										if (this._stats.type !== 'unusable') {
											let customTween = {
												type: 'swing',
												keyFrames: [
													[0, [0, 0, -1.57]],
													[100, [0, 0, 0]],
												],
											};
											this.tween.start(null, this._rotate.z, customTween);
										}
									}

									const bodyId = this._stats.states[stateId]?.body;
									// make sure item always has proper size defined by state
									if (
										// accommodate legacy 'unSelected'
										this._stats.states[stateId] &&
										bodyId &&
										this._stats.bodies[bodyId] &&
										// old single condition
										bodyId !== 'none'
									) {
										this.emit('size', {
											width: this._stats.currentBody.width,
											height: this._stats.currentBody.height,
										});
									}
									// unmount item when item is in backpack
									if (owner && this._stats.slotIndex >= owner._stats.inventorySize) {
										this.unMount();
									}
								} else {
									this.updateLayer();
									this.applyAnimationForState(newValue);
									this._scaleTexture();
									this.scaleDimensions(this._stats.width, this._stats.height);
								}

								break;
							case 'effect':
								// don't use streamed effect call for my own unit or its items
								if (
									newValue.type != 'attacked' &&
									(this == taro.client.selectedUnit ||
										(this._category == 'item' && this.getOwnerUnit() == taro.client.selectedUnit))
								) {
									continue;
								}
								this.playEffect(newValue.type, newValue.data ? newValue.data : {});
								break;

							case 'isHidden':
								if (newValue == true) {
									this.hide();
								} else {
									this.show();
								}

								break;

							case 'hideNameLabel':
								this.emit('hide-label');
								break;
							case 'showNameLabel':
								this.emit('show-label');
								break;
						}

						this.lastUpdatedData[attrName] = rfdc()(newValue);
					}
				}
			}
		}
	},

	// combine all data that'll be sent to the client, and send them altogether at the tick
	queueStreamData: function (data, clientId) {
		// this._streamDataQueued = this._streamDataQueued.concat(data);
		for (key in data) {
			value = data[key];

			// need to include variables here, otherwise only the latest variable is sent to client streamUpdateData
			if (
				['attributes', 'attributesMin', 'attributesMax', 'attributesRegenerateRate', 'variables', 'quests'].includes(
					key
				)
			) {
				// some data need to merge instead of overwriting they key. otherwise, we'll only be able to send the last attribute added.
				// for example, if server calls queueStreamData for Speed and HP attributes, HP will overwrite Speed as they share same key ("attributes")
				// this._streamDataQueued[key] = {...this._streamDataQueued[key], ...value};
				if (this._streamDataQueued[key] == undefined) {
					this._streamDataQueued[key] = {};
				}
				// Object.assign was breaking new attribute logic that needs recursive merging
				this._streamDataQueued[key] = _.merge(this._streamDataQueued[key], value);
			} else {
				this._streamDataQueued[key] = value;
			}
		}

		taro.server.bandwidthUsage[this._category] += JSON.stringify(this._streamDataQueued).length;
	},

	/**
	 * Removes a section into the existing streamed sections array.
	 * @param {String} sectionName The section name to remove.
	 */
	streamSectionsPull: function (sectionName) {
		if (this._streamSections) {
			this._streamSections.pull(sectionName);
		}

		return this;
	},

	/**
	 * Gets / sets a streaming property on this entity. If set, the
	 * property's new value is streamed to clients on the next packet.
	 *
	 * @param {String} propName The name of the property to get / set.
	 * @param {*=} propVal Optional. If provided, the property is set
	 * to this value.
	 * @return {*} "this" when a propVal argument is passed to allow method
	 * chaining or the current value if no propVal argument is specified.
	 */
	streamProperty: function (propName, propVal) {
		this._streamProperty = this._streamProperty || {};
		// this._streamPropertyChange = this._streamPropertyChange || {};

		if (propName !== undefined) {
			if (propVal !== undefined) {
				// this._streamPropertyChange[propName] = this._streamProperty[propName] !== propVal;
				this._streamProperty[propName] = propVal;

				return this;
			}

			return this._streamProperty[propName];
		}

		return undefined;
	},

	/**
	 * Gets / sets the data for the specified data section id. This method
	 * is usually not called directly and instead is part of the network
	 * stream system. General use case is to write your own custom streamSectionData
	 * method in a class that extends TaroEntity so that you can control the
	 * data that the entity will send and receive over the network stream.
	 * @param {String} sectionId A string identifying the section to
	 * handle data get / set for.
	 * @param {*=} data If present, this is the data that has been sent
	 * from the server to the client for this entity.
	 * @param {Boolean=} bypassSmoothing If true, will assign transform
	 * directly to entity instead of adding the values to the time stream.
	 * @return {*} "this" when a data argument is passed to allow method
	 * chaining or the current value if no data argument is specified.
	 */
	streamSectionData: function (sectionId, data) {
		switch (sectionId) {
			case 'transform':
				if (taro.isServer) {
					var x = this._translate.x.toFixed(0);
					var y = this._translate.y.toFixed(0);
					var angle = ((this._rotate.z % (2 * Math.PI)) * 1000).toFixed(0);

					if (this._hasMoved) {
						//console.log("streaming", this._category, this._stats.name, this.id(), x, y, angle)
						this._oldTranform = [this._translate.x, this._translate.y, this._rotate.z];

						// var distanceTravelled = x - taro.lastX;
						// console.log(this.id(), taro._currentTime - taro.lastSnapshotTime, taro._currentTime, x,  distanceTravelled / (taro._currentTime - taro.lastSnapshotTime))
						// taro.lastX = x
						// taro.lastSnapshotTime = taro._currentTime;

						let buffArr = [];

						buffArr.push(Number(x));
						buffArr.push(Number(y));
						buffArr.push(Number(angle));

						if (this.isTeleporting) {
							buffArr.push(Number(this.isTeleporting));
							buffArr.push(Number(this.teleportCamera));
							this.isTeleporting = false;
							this.teleportCamera = false;
						}

						// TaroEntity.prototype.log(this._size, this._translate, this._rotate)
						if (this.bypassSmoothing) {
							buffArr.push(1);
							// taro.devLog("streamData", buff)
							this.bypassSmoothing = false;
						}

						buffArr = buffArr.map((item) => item.toString(16));

						this._streamSectionData = buffArr;
					}
				}
				break;

			case 'depth':
				if (data !== undefined) {
					if (taro.isClient) {
						this.depth(parseInt(data));
					}
				} else {
					return String(this.depth());
				}
				break;

			case 'layer':
				if (data !== undefined) {
					if (taro.isClient) {
						this.layer(parseInt(data));
					}
				} else {
					return String(this.layer());
				}
				break;

			case 'bounds2d':
				if (data !== undefined) {
					if (taro.isClient) {
						var geom = data.split(',');
						this.bounds2d(parseFloat(geom[0]), parseFloat(geom[1]));
					}
				} else {
					return String(`${this._bounds2d.x},${this._bounds2d.y}`);
				}
				break;

			case 'bounds3d':
				if (data !== undefined) {
					if (taro.isClient) {
						var geom = data.split(',');
						this.bounds3d(parseFloat(geom[0]), parseFloat(geom[1]), parseFloat(geom[2]));
					}
				} else {
					return String(`${this._bounds3d.x},${this._bounds3d.y},${this._bounds3d.z}`);
				}
				break;

			case 'hidden':
				if (data !== undefined) {
					if (taro.isClient) {
						if (data == 'true') {
							this.hide();
						} else {
							this.show();
						}
					}
				} else {
					return String(this._stats.isHidden);
				}
				break;

			case 'mount':
				if (data !== undefined) {
					if (taro.isClient) {
						if (data) {
							var newParent = taro.$(data);

							if (newParent) {
								this.mount(newParent);
							}
						} else {
							// Unmount
							this.unMount();
						}
					}
				} else {
					var parent = this.parent();

					if (parent) {
						return this.parent().id();
					} else {
						return '';
					}
				}
				break;

			case 'origin':
				if (data !== undefined) {
					if (taro.isClient) {
						var geom = data.split(',');
						this.origin(parseFloat(geom[0]), parseFloat(geom[1]), parseFloat(geom[2]));
					}
				} else {
					return String(`${this._origin.x},${this._origin.y},${this._origin.z}`);
				}
				break;

			case 'props':
				var newData, changed, i;

				if (data !== undefined) {
					if (taro.isClient) {
						var props = JSON.parse(data);

						// Update properties that have been sent through
						for (i in props) {
							changed = false;
							if (props.hasOwnProperty(i)) {
								if (this._streamProperty[i] != props[i]) {
									changed = true;
								}
								this._streamProperty[i] = props[i];

								this.emit('streamPropChange', [i, props[i]]);
							}
						}
					}
				} else {
					newData = {};

					for (i in this._streamProperty) {
						if (this._streamProperty.hasOwnProperty(i)) {
							// if (this._streamPropertyChange[i]) {
							newData[i] = this._streamProperty[i];
							// this._streamPropertyChange[i] = false;
							// }
						}
					}

					return JSON.stringify(newData);
				}
				break;
		}
	},
	getQueuedStreamData: function () {
		return this._streamDataQueued;
	},

	/**
	 * Gets / sets the stream mode that the stream system will use when
	 * handling pushing data updates to connected clients.
	 * @param {Number=} val A value representing the stream mode.
	 * @example #Set the entity to disable streaming
	 *     entity.streamMode(0);
	 * @example #Set the entity to automatic streaming
	 *     entity.streamMode(1);
	 * @example #Set the entity to stream only when the entity is created/removed
	 *     entity.streamMode(2);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	streamMode: function (val) {
		// console.log("streamMode (" + val + ")", (this._stats) ? this._stats.name : this._category)
		if (val !== undefined) {
			this._streamMode = val;

			return this;
		}

		return this._streamMode;
	},

	/**
	 * Gets / sets the stream control callback function that will be called
	 * each time the entity tick method is called and stream-able data is
	 * updated.
	 * @param {Function=} method The stream control method.
	 * @example #Set the entity's stream control method to control when this entity is streamed and when it is not
	 *     entity.streamControl(function (clientId) {
	 *         // Let's use an example where we only want this entity to stream
	 *         // to one particular client with the id 4039589434
	 *         if (clientId === '4039589434') {
	 *             // Returning true tells the network stream to send data
	 *             // about this entity to the client
	 *             return true;
	 *         } else {
	 *             // Returning false tells the network stream NOT to send
	 *             // data about this entity to the client
	 *             return false;
	 *         }
	 *     });
	 *
	 * Further reading: [Controlling Streaming](http://www.isogenicengine.com/documentation/isogenic-game-engine/versions/1-1-0/manual/networking-multiplayer/realtime-network-streaming/stream-modes-and-controlling-streaming/)
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	streamControl: function (method) {
		if (method !== undefined) {
			this._streamControl = method;
			return this;
		}

		return this._streamControl;
	},

	/**
	 * Gets / sets the stream sync interval. This value
	 * is in milliseconds and cannot be lower than 16. It will
	 * determine how often data from this entity is added to the
	 * stream queue.
	 * @param {Number=} val Number of milliseconds between adding
	 * stream data for this entity to the stream queue.
	 * @param {String=} sectionId Optional id of the stream data
	 * section you want to set the interval for. If omitted the
	 * interval will be applied to all sections.
	 * @example #Set the entity's stream update (sync) interval to 1 second because this entity's data is not highly important to the simulation so save some bandwidth!
	 *     entity.streamSyncInterval(1000);
	 * @example #Set the entity's stream update (sync) interval to 16 milliseconds because this entity's data is very important to the simulation so send as often as possible!
	 *     entity.streamSyncInterval(16);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	streamSyncInterval: function (val, sectionId) {
		if (val !== undefined) {
			if (!sectionId) {
				if (val < 16) {
					delete this._streamSyncInterval;
				} else {
					this._streamSyncDelta = 0;
					this._streamSyncInterval = val;
				}
			} else {
				this._streamSyncSectionInterval = this._streamSyncSectionInterval || {};
				this._streamSyncSectionDelta = this._streamSyncSectionDelta || {};
				if (val < 16) {
					delete this._streamSyncSectionInterval[sectionId];
				} else {
					this._streamSyncSectionDelta[sectionId] = 0;
					this._streamSyncSectionInterval[sectionId] = val;
				}
			}
			return this;
		}

		return this._streamSyncInterval;
	},

	/**
	 * Gets / sets the precision by which floating-point values will
	 * be encoded and sent when packaged into stream data.
	 * @param {Number=} val The number of decimal places to preserve.
	 * @example #Set the float precision to 2
	 *     // This will mean that any data using floating-point values
	 *     // that gets sent across the network stream will be rounded
	 *     // to 2 decimal places. This helps save bandwidth by not
	 *     // having to send the entire number since precision above
	 *     // 2 decimal places is usually not that important to the
	 *     // simulation.
	 *     entity.streamFloatPrecision(2);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	streamFloatPrecision: function (val) {
		if (val !== undefined) {
			this._streamFloatPrecision = val;

			var i;
			var floatRemove = '\\.';

			// Update the floatRemove regular expression pattern
			for (i = 0; i < this._streamFloatPrecision; i++) {
				floatRemove += '0';
			}

			// Add the trailing comma
			floatRemove += ',';

			// Create the new regexp
			this._floatRemoveRegExp = new RegExp(floatRemove, 'g');

			return this;
		}

		return this._streamFloatPrecision;
	},

	/**
	 * Override this method if your entity should send data through to
	 * the client when it is being created on the client for the first
	 * time through the network stream. The data will be provided as the
	 * first argument in the constructor call to the entity class so
	 * you should expect to receive it as per this example:
	 * @example #Using and Receiving Stream Create Data
	 *     var MyNewClass = TaroEntity.extend({
	 *         classId: 'MyNewClass',
	 *
	 *         // Define the init with the parameter to receive the
	 *         // data you return in the streamCreateData() method
	 *         init: function (myCreateData) {
	 *             this._myData = myCreateData;
	 *         },
	 *
	 *         streamCreateData: function () {
	 *             return this._myData;
	 *         }
	 *     });
	 *
	 * Valid return values must not include circular references!
	 */
	streamCreateData: function (clientId) {
		if (taro.isServer) {
			var data = {};
			var keys = [];

			switch (this._category) {
				// here we are picking keys from this._stats to include in the data sent from server
				// these data are used in the class constructor for the specific entity in TaroStreamComponent._onStreamCreate() [data[4]]
				case 'unit':
					// cellsheet is used for purchasable-skins
					keys = [
						'name',
						'type',
						'stateId',
						'ownerId',
						'currentItemIndex',
						'currentItemId',
						'flip',
						'skin',
						'anim',
						'scale',
						'cellSheet',
						'width',
						'height',
						'scaleDimensions',
						'isHidden',
						'opacity',
					];
					data = {
						attributes: {},
						variables: {},
					};
					break;

				case 'item':
					// TODO: we shouldn't have to send currentBody. for some reason, all items have 'dropped' stateId
					keys = [
						'itemTypeId',
						'anim',
						'stateId',
						'oldOwnerUnitId',
						'ownerUnitId',
						'quantity',
						'currentBody',
						'flip',
						'isBeingUsed',
						'width',
						'height',
						'scaleDimensions',
						'description',
						'slotIndex',
						'isHidden',
						'opacity',
					];
					data = {
						attributes: {},
						variables: {},
					};
					break;

				case 'projectile':
					keys = [
						'type',
						'anim',
						'stateId',
						'flip',
						'width',
						'height',
						'scaleDimensions',
						'sourceItemId',
						'streamMode',
						'isHidden',
						'opacity',
					];
					data = {
						attributes: {},
						variables: {},
					};
					break;

				case 'player':
					// purchasables is required for rendering this player's owned skin to the other players
					keys = [
						'name',
						'clientId',
						'playerTypeId',
						'controlledBy',
						'playerJoined',
						'unitIds',
						'selectedUnitId',
						'cameraTrackedUnitId',
						'userId',
						'banChat',
						'purchasables',
						'username',
						'profilePicture',
						'roleIds',
						'isHidden',
						'isMobile',
					];
					data = {
						attributes: {},
						variables: {},
					};

					// send sensitive information to the target clients only
					if (this._stats.clientId == clientId) {
						data.coins = this._stats.coins;
						data.mutedUsers = this._stats.mutedUsers;
						data.banChat = this._stats.banChat;
						data.isEmailVerified = this._stats.isEmailVerified;
						data.allPurchasables = this._stats.allPurchasables;
						data.isUserVerified = this._stats.isUserVerified;
						data.isUserAdmin = this._stats.isUserAdmin;
						data.isUserMod = this._stats.isUserMod;
					}

					break;

				case 'region':
					keys = ['id', 'default'];
					data = {
						currentBody: {
							height: this._stats.currentBody.height,
							width: this._stats.currentBody.width,
						},
					};
					break;
			}

			for (i in keys) {
				var key = keys[i];
				data[key] = this._stats[key];
			}

			if (data.attributes != undefined) {
				for (key in this._stats.attributes) {
					// send the whole attribute objects
					data.attributes[key] = this._stats.attributes[key];
				}
			}

			if (data.variables != undefined) {
				for (key in this.variables) {
					data.variables[key] = { value: this.variables[key].value };
				}
			}

			return data;
		}
	},

	/**
	 * Gets / sets the stream emit created flag. If set to true this entity
	 * emit a "streamCreated" event when it is created by the stream, but
	 * after the id and initial transform are set.
	 * @param val
	 * @returns {*}
	 */
	streamEmitCreated: function (val) {
		if (val !== undefined) {
			this._streamEmitCreated = val;
			return this;
		}

		return this._streamEmitCreated;
	},

	/**
	 * Queues stream data for this entity to be sent to the
	 * specified client id or array of client ids.
	 * @param {Array} clientId An array of string IDs of each
	 * client to send the stream data to.
	 * @return {TaroEntity} "this".
	 */
	streamSync: function (clientId) {
		if (this._streamMode === 1 || this._streamMode === 2) {
			// Check if we have a stream sync interval
			if (this._streamSyncInterval) {
				this._streamSyncDelta += taro._tickDelta;

				if (this._streamSyncDelta < this._streamSyncInterval) {
					// The stream sync interval is still higher than
					// the stream sync delta so exit without calling the
					// stream sync method
					return this;
				} else {
					// We've reached the delta we want so zero it now
					// ready for the next loop
					this._streamSyncDelta = 0;
				}
			}

			this._streamSync();
			return this;
		}

		// if (this._streamMode === 2) {
		// 	// Stream mode is advanced
		// 	this._streamSync(clientId, this._streamRoomId);

		// 	return this;
		// }

		recipientArr = null;
		return this;
	},

	/**
	 * Asks the stream system to queue the stream data to the specified
	 * client id or array of ids.
	 * @param {Array} recipientArr The array of ids of the client(s) to
	 * queue stream data for. The stream data being queued
	 * is returned by a call to this._streamData().
	 * @param {String} streamRoomId The id of the room the entity belongs
	 * in (can be undefined or null if no room assigned).
	 * @private
	 */
	_streamSync: function () {
		var recipientArr = taro.network.clientIds;
		var arrCount = recipientArr.length;
		var arrIndex;
		var clientId;
		var thisId = this.id();
		var createResult = true; // We set this to true by default

		var data = this._streamData();
		// Loop the recipient array
		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			clientId = recipientArr[arrIndex];

			// Check if the client has already received a create
			// command for this entity
			if (!taro.network.stream._streamClientCreated[thisId]) {
				taro.network.stream._streamClientCreated[thisId] = {};
			}

			// IDLE MODE
			// need condition that evaluates only for clientIds that *need* the forced sync
			if (
				!taro.network.stream._streamClientCreated[thisId][clientId] ||
				taro.server.rejoiningIdleClients.indexOf(clientId) !== -1
			) {
				createResult = this.streamCreate(clientId);
				this._hasMoved = true;
			}
		}

		if (data && recipientArr.length && this._streamMode === 1 && this._hasMoved) {
			taro.server.bandwidthUsage[this._category] += data.length;
			taro.network.stream.queue(thisId, data, recipientArr);
			this._hasMoved = false;
		} else {
			// still need to set this to false even if there's no data to send
			this._hasMoved = false;
		}
	},

	/**
	 * Issues a create entity command to the passed client id
	 * or array of ids. If no id is passed it will issue the
	 * command to all connected clients. If using streamMode(1)
	 * this method is called automatically.
	 * @param {*} clientId The id or array of ids to send
	 * the command to.
	 * @example #Send a create command for this entity to all clients
	 *     entity.streamCreate();
	 * @example #Send a create command for this entity to an array of client ids
	 *     entity.streamCreate(['43245325', '326755464', '436743453']);
	 * @example #Send a create command for this entity to a single client id
	 *     entity.streamCreate('43245325');
	 * @return {Boolean}
	 */
	streamCreate: function (clientId) {
		// TaroEntity.prototype.log("streamCreate")

		if (this._parent && taro.network.stream._streamClientCreated !== undefined) {
			var thisId = this.id();
			var arr;
			var i;

			// Send the client an entity create command first
			var streamCreateData = this.streamCreateData(clientId);
			this.streamSectionData('transform'); // prepare this._streamSectionData

			taro.network.send(
				'_taroStreamCreate',
				[this.classId(), thisId, this._parent.id(), this._streamSectionData, streamCreateData],
				clientId
			);

			taro.server.bandwidthUsage[this._category] += JSON.stringify(streamCreateData).length;
			taro.network.stream._streamClientCreated[thisId] = taro.network.stream._streamClientCreated[thisId] || {};

			if (clientId) {
				// Mark the client as having received a create
				// command for this entity
				taro.network.stream._streamClientCreated[thisId][clientId] = true;
			} else {
				// Mark all clients as having received this create
				arr = taro.network.clients();

				for (i in arr) {
					if (arr.hasOwnProperty(i)) {
						taro.network.stream._streamClientCreated[thisId][i] = true;
					}
				}
			}

			return true;
		}

		return false;
	},

	/**
	 * Issues a destroy entity command to the passed client id
	 * or array of ids. If no id is passed it will issue the
	 * command to all connected clients. If using streamMode(1)
	 * this method is called automatically.
	 * @param {*} clientId The id or array of ids to send
	 * the command to.
	 * @example #Send a destroy command for this entity to all clients
	 *     entity.streamDestroy();
	 * @example #Send a destroy command for this entity to an array of client ids
	 *     entity.streamDestroy(['43245325', '326755464', '436743453']);
	 * @example #Send a destroy command for this entity to a single client id
	 *     entity.streamDestroy('43245325');
	 * @return {Boolean}
	 */
	streamDestroy: function (clientId) {
		var thisId = this.id();
		var arr;
		var i;

		// Send clients the stream destroy command for this entity
		taro.network.send('_taroStreamDestroy', [taro._currentTime, thisId], clientId);

		if (!taro.network.stream) return true;

		taro.network.stream._streamClientCreated[thisId] = taro.network.stream._streamClientCreated[thisId] || {};

		if (clientId) {
			// Mark the client as having received a destroy
			// command for this entity
			taro.network.stream._streamClientCreated[thisId][clientId] = false;
		} else {
			// Mark all clients as having received this destroy
			arr = taro.network.clients();

			delete taro.network.stream._streamClientCreated[thisId];
		}

		return true;
	},

	/**
	 * Generates and returns the current stream data for this entity. The
	 * data will usually include only properties that have changed since
	 * the last time the stream data was generated. The returned data is
	 * a string that has been compressed in various ways to reduce network
	 * overhead during transmission.
	 * @return {String} The string representation of the stream data for
	 * this entity.
	 * @private
	 */
	_streamData: function () {
		// Check if we already have a cached version of the streamData
		if (this._streamDataCache) {
			if (this._category == 'unit') {
				console.log(
					'?. _streamDataCache exists. returning',
					taro._currentTime,
					this.id(),
					this._parent._category,
					this._parent.id(),
					'_streamDataCache'
				);
			}

			return this._streamDataCache;
		} else {
			// Let's generate our stream data
			var sectionDataString = '';
			var sectionData;
			var sectionIndex;
			var sectionId;

			// Only send further data if the entity is still "alive"
			if (this._alive) {
				// Now loop the data sections array and compile the rest of the
				// data string from the data section return data
				for (sectionIndex = 0; sectionIndex < this._streamSections.length; sectionIndex++) {
					sectionData = '';
					sectionId = this._streamSections[sectionIndex];
					// if (this._streamMode === 2 && sectionId === 'transform') break;
					// Stream section sync intervals allow individual stream sections
					// to be streamed at different (usually longer) intervals than other
					// sections so you could for instance reduce the number of updates
					// a particular section sends out in a second because the data is
					// not that important compared to updated transformation data
					if (this._streamSyncSectionInterval && this._streamSyncSectionInterval[sectionId]) {
						// Check if the section interval has been reached
						this._streamSyncSectionDelta[sectionId] += taro._tickDelta;

						if (this._streamSyncSectionDelta[sectionId] >= this._streamSyncSectionInterval[sectionId]) {
							// Get the section data for this section id
							this.streamSectionData(sectionId);
							// Reset the section delta
							this._streamSyncSectionDelta[sectionId] = 0;
						}
					} else {
						// Get the section data for this section id
						this.streamSectionData(sectionId);
					}
				}

				if (this._streamSectionData !== undefined) {
					// Add the section start designator character. We do this
					// regardless of if there is actually any section data because
					// we want to be able to identify sections in a serial fashion
					// on receipt of the data string on the client
					// // sectionDataString += taro.network.stream._sectionDesignator;

					// Add any custom data to the stream string at this point

					streamData = this.encodedStreamData();

					// Remove any .00 from the string since we don't need that data
					// TODO: What about if a property is a string with something.00 and it should be kept?
					// // streamData = streamData.replace(this._floatRemoveRegExp, ',');

					// Store the data in cache in case we are asked for it again this tick
					// the update() method of the TaroEntity class clears this every tick
					this._streamDataCache = streamData;

					return streamData;
				}
			}
		}
	},

	encodedStreamData: function () {
		var data = this.id();
		return [data].concat(this._streamSectionData).join('&');
	},

	/* CEXCLUDE */

	/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// INTERPOLATOR
	/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Calculates the current value based on the time along the
	 * value range.
	 * @param {Number} startValue The value that the interpolation started from.
	 * @param {Number} endValue The target value to be interpolated to.
	 * @param {Number} startTime The time the interpolation started.
	 * @param {Number} currentTime The current time.
	 * @param {Number} endTime The time the interpolation will end.
	 * @return {Number} The interpolated value.
	 */
	interpolateValue: function (startValue, endValue, startTime, currentTime, endTime) {
		var totalValue = endValue - startValue;
		var dataDelta = endTime - startTime;
		var offsetDelta = currentTime - startTime;
		var deltaTime = offsetDelta / dataDelta;

		// clamp so currentTime stays after startTime
		deltaTime = Math.max(0, deltaTime);

		return totalValue * deltaTime + startValue;
	},

	reconcileValue: function (startValue, endValue, startTime, currentTime, endTime) {
		var totalValue = endValue - startValue;
		var dataDelta = endTime - startTime;
		var offsetDelta = currentTime - startTime;
		var t = Math.abs(offsetDelta / dataDelta);
		var deltaTime = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad (acceleration until halfway, then deceleration)

		return totalValue * deltaTime + startValue;
	},

	/**
	 * Update the position of the entities using the interpolation. This results smooth motion of the entities.
	 */
	_processTransform: function () {
		const now = taro._currentTime;
		var tickDelta = now - this.lastTransformedAt;

		if (
			tickDelta == 0 || // entity has already transformed for this tick
			this._translate == undefined ||
			this._stats.currentBody == undefined // entity has no body
		) {
			return;
		}
		let rotateStart = null;
		let rotateEnd = null;

		let x = this._translate.x;
		let y = this._translate.y;
		let rotate = this._rotate.z;
		let nextTransform = this.nextKeyFrame[1];
		let nextTime = this.nextKeyFrame[0];
		let timeRemaining = nextTime - now;

		// don't lerp is time remaining is less than 5ms
		if (nextTransform && timeRemaining > -tickDelta) {
			// lerp between current position and nextTransform
			x = this.interpolateValue(x, nextTransform[0], now - tickDelta, now, nextTime);
			y = this.interpolateValue(y, nextTransform[1], now - tickDelta, now, nextTime);

			// if (this == taro.client.selectedUnit)
			// 	console.log(parseFloat(x).toFixed(0), "nextX", parseFloat(nextTransform[0]), "speedReq", parseFloat((nextTransform[0] - x)/timeRemaining).toFixed(2) , "timeRemaining", timeRemaining)
			rotateStart = rotate;
			rotateEnd = nextTransform[2];

			// a hack to prevent rotational interpolation suddnely jumping by 2 PI (e.g. 0.01 to -6.27)
			if (Math.abs(rotateEnd - rotateStart) > Math.PI) {
				if (rotateEnd > rotateStart) {
					rotateStart += Math.PI * 2;
				} else {
					rotateStart -= Math.PI * 2;
				}
			}

			rotate = this.interpolateValue(
				rotateStart,
				rotateEnd,
				taro._currentTime - 16,
				taro._currentTime,
				taro._currentTime + 16
			);
		} else {
			x = nextTransform[0];
			y = nextTransform[1];
			rotate = nextTransform[2];
		}

		// for my own unit, ignore streamed angle if this unit control is set to face mouse cursor instantly.
		if (
			this == taro.client.selectedUnit &&
			this.angleToTarget != undefined &&
			!isNaN(this.angleToTarget) &&
			this._stats.controls &&
			this._stats.controls.mouseBehaviour.rotateToFaceMouseCursor &&
			this._stats.currentBody &&
			!this._stats.currentBody.fixedRotation
		) {
			rotate = this.angleToTarget;
		}

		this._translate.x = x;
		this._translate.y = y;
		this._rotate.z = rotate;

		this.isTeleporting = false;

		this.lastTransformedAt = taro._currentTime;
	},

	isTransforming: function (bool) {
		if (bool != undefined) {
			this._isTransforming = bool;

			// when set as true, force transformTexture
			if (bool == true) {
				this.transformTexture(this.nextKeyFrame[1][0], this.nextKeyFrame[1][1], this.nextKeyFrame[1][2]);
			}
		}

		return this._isTransforming;
	},

	getAttributeBarContainer: function () {
		var self = this;
		var attributeContainerId = self._stats && self._stats.attributeBarContainer && self._stats.attributeBarContainer.id;

		if (attributeContainerId) {
			return taro.$(attributeContainerId);
		}

		return null;
	},

	initParticleEmitters: function () {
		Object.keys(this.variables).forEach((key) => {
			if (
				this.variables[key].dataType === 'particleEmitter' &&
				this.variables[key].value &&
				!this.variables[key].function
			) {
				this._stats.particleEmitters[key] = this.variables[key].value;
				this.createParticleEmitter(this.variables[key].value);
			}
		});
	},

	createParticleEmitter: function (particleTypeId) {
		if (!taro.isClient) return;

		taro.client.emit('create-particle-emitter', {
			particleId: particleTypeId,
			position: { x: 0, y: 0 },
			angle: 0,
			entityId: this.id(),
		});
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroEntity;
}
