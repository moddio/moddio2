var MapComponent = IgeEntity.extend({
	classId: 'MapComponent',
	componentId: 'map',

	init: function () {
		//
	},

	load: function (data) {
		var self = this;

		self.data = data;

		if (ige.isServer) {
			ige.addComponent(IgeTiledComponent)
				.tiled.loadJson(data, function (layerArray, layersById) {

					ige.physics.staticsFromMap(layersById.walls);

					self.createRegions();
				});

		} else if (ige.isClient) {
			$.when(ige.client.igeEngineStarted).done(function () {
				ige.addComponent(IgeTiledComponent)
					.tiled.loadJson(data, function (IgeLayerArray, IgeLayersById) {

						data.tilewidth = Number(data.tilewidth);
						data.tileheight = Number(data.tileheight);
						data.width = Number(data.width);
						data.height = Number(data.height);

						if (ige.physics) {
							ige.physics.staticsFromMap(IgeLayersById.walls);
						}

						// We can add all our layers to our main scene by looping the
						// array or we can pick a particular layer via the layersById
						// object. Let's give an example:
						if (mode === 'sandbox') {
							var mapHeight = ige.game.data.map.height * ige.game.data.map.tileheight;
							var mapWidth = ige.game.data.map.width * ige.game.data.map.tilewidth;
							// changed to Region from RegionUi
							var region = new Region({ height: mapHeight, width: mapWidth });
							region.depth(3)
								.layer(3)
								.drawBoundsData(false)
								.drawBounds(false)
								.mount(ige.client.rootScene)
								.translateTo(0 + (mapWidth / 2), 0 + (mapHeight / 2), 0)
								.height(mapHeight)
								.width(mapWidth)
								.bounds2d(mapWidth, mapHeight, 0);
						}
						ige.client.mapLoaded.resolve();
					});
			});
		}
	},
	createRegions: function () {
		var regions = {};
		for (var i in ige.game.data.variables) {
			var variable = ige.game.data.variables[i];
			if (variable.dataType == 'region') regions[i] = variable;
		}
		ige.$$('region').forEach((region) => {
			region.deleteRegion();
		});
		for (var regionName in regions) {
			if (!ige.regionManager.getRegionById(regionName)) {
				var data = regions[regionName];
				if (data) {
					data.id = regionName;
					new Region(data);
				}
			}
		}
	},

	getDimensions: function () {
		return {

		};
	}
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = MapComponent;
}
