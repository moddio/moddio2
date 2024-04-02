/**
 * Loads slightly modified Tiled-format json map data into the Isogenic Engine.
 */
var TaroTiledComponent = TaroClass.extend({
	classId: 'TaroTiledComponent',
	componentId: 'tiled',

	/**
	 * @constructor
	 * @param entity
	 * @param options
	 */
	init: function (entity, options) {
		this._entity = entity;
		this._options = options;
	},

	/**
	 * Loads a .js Tiled json-format file and converts to taro format,
	 * then calls the callback with the newly created scene and the
	 * various layers as TaroTextureMap instances.
	 * @param url
	 * @param callback
	 */
	loadJson: function (url, callback) {
		var self = this;
		var scriptElem;

		if (typeof url === 'string') {
			if (taro.isClient) {
				scriptElem = document.createElement('script');
				scriptElem.src = url;
				scriptElem.onload = function () {
					self.log('Tiled data loaded, processing...');
					self._processData(tiled, callback);
				};
				document.getElementsByTagName('head')[0].appendChild(scriptElem);
			} else {
				TaroTiledComponent.prototype.log(
					"URL-based Tiled data is only available client-side. If you want to load Tiled map data on the server please include the map file in your ServerConfig.js file and then specify the map's data object instead of the URL.",
					'error'
				);
			}
		} else {
			self._processData(url, callback);
		}
	},

	_processData: function (data, callback) {
		if (taro.isServer && (data == undefined || data.layers == undefined)) {
			TaroTiledComponent.prototype.log("layer doesn't exist. unpublishing...");
			taro.server.unpublish('TaroTiledComponent#51');
		}
		var self = this;
		var mapClass = TaroTileMap2d;
		var mapWidth = data.width;
		var mapHeight = data.height;
		var layerArray = data.layers;
		var layerCount = layerArray ? layerArray.length : 0;
		var layer;
		var layerType;
		var layerData;
		var layerDataCount;
		var maps = [];
		var layersById = {};
		var tileSetArray = data.tilesets;
		var tileSetCount = tileSetArray ? tileSetArray.length : 0;
		var tileSetItem;
		var tileSetsTotal = tileSetCount;
		var tileSetsLoaded = 0;
		var onLoadFunc;
		var image;
		var tilesetsLoadedFunc;
		var i;
		var k;
		var x;
		var y;
		var z;
		var maxTilesheetsToLoad = 2;

		taro.layersById = layersById;

		// Define the function to call when all tilesets have finished loading
		tilesetsLoadedFunc = function () {
			// Create a map for each layer
			let idx = 0;
			for (i = 0; i < layerCount; i++) {
				layer = layerArray[i];
				if (layer.data === undefined) {
					continue;
				}
				layerType = layer.type;
				idx++;
				// Check if the layer is a tile layer or an object layer
				if (layerType === 'tilelayer') {
					layerData = layer.data;

					TaroTiledComponent.prototype.log(`setting ${layer.name} to depth ${idx}`);

					maps[idx] = new mapClass(data.tilewidth, data.tileheight);

					if (typeof maps[idx].tileWidth == 'function') {
						maps[idx].tileWidth(data.tilewidth).tileHeight(data.tilewidth).depth(idx);
					} else {
						TaroTiledComponent.prototype.log('ERROR while loading map. Chris might have fixed this');
						taro.server.unpublish('TaroTiledComponent#109');
						return;
					}

					maps[idx].type = layerType;
					maps[idx].name = layer.name;

					// Check if the layer should be isometric mounts enabled
					if (data.orientation === 'isometric') {
						maps[idx].isometricMounts(true);
					}

					layersById[layer.name] = maps[idx];
					tileSetCount = tileSetArray.length;

					// Loop through the layer data and paint the tiles
					layerDataCount = layerData.length;

					for (y = 0; y < mapHeight; y++) {
						for (x = 0; x < mapWidth; x++) {
							z = x + y * mapWidth;

							if (layerData[z] > 0 && layerData[z] !== 2147483712) {
								maps[idx].occupyTile(x, y, 1, 1, layerData[z]);
							}
						}
					}
				}

				if (layerType === 'objectgroup') {
					maps[idx] = layer;
					layersById[layer.name] = maps[idx];
				}
			}

			callback(maps, layersById);
		};

		if (taro.isClient) {
			onLoadFunc = function (tileSetCount, tileSetItem) {
				return function () {
					var imageUrl = tileSetItem.image;

					if (imageUrl.includes('tilesheet') || tileSetCount === 0) {
						tileSetItem.tilewidth = taro.scaleMapDetails.originalTileWidth;
						tileSetItem.tileheight = taro.scaleMapDetails.originalTileHeight;
					}

					tileSetsLoaded++;

					if (tileSetsLoaded === tileSetsTotal && tileSetsLoaded <= maxTilesheetsToLoad) {
						// All tilesets loaded, fire processing function
						tilesetsLoadedFunc();
					}
				};
			};

			// TODO remove image loading or entire TaroTiledComponent

			// Load the tile sets
			while (tileSetCount--) {
				// Load the image into memory first so we can read the total width and height
				image = new Image();

				tileSetItem = tileSetArray[tileSetCount];
				image.onload = onLoadFunc(tileSetCount, tileSetItem);

				image.src = tileSetItem.image;
			}
		} else {
			// We're on the server so no tilesets are actually loaded
			tilesetsLoadedFunc();
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroTiledComponent;
}
