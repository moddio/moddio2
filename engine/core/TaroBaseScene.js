/**
 * When loaded into memory using taro.addGraph('TaroBaseScene') will create
 * the scene "baseScene" and the viewport "vp1" that are used in almost all
 * examples and can be used as the base for your scenegraph as well.
 */
var TaroBaseScene = TaroSceneGraph.extend({
	classId: 'TaroBaseScene',

	init: function () {},

	/**
	 * Called when loading the graph data via taro.addGraph().
	 * @param options
	 */
	addGraph: function (options) {
		// Clear existing graph data
		if (taro.$('baseScene')) {
			this.destroyGraph();
		}

		// Create the scene
		var baseScene = new TaroScene2d().id('baseScene');

		// Create the main viewport to look at "baseScene"
		new TaroViewport().id('vp1').autoSize(true).scene(baseScene).drawBounds(false).mount(taro);
	},

	/**
	 * The method called when the graph items are to be removed from the
	 * active graph.
	 */
	removeGraph: function () {
		// Destroy the viewport
		taro.$('vp1').destroy();

		// Destroy the baseScene
		taro.$('baseScene').destroy();
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroBaseScene;
}
