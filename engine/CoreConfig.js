var includeFolders = [
	{
		flags: 'csap',
		folderPath: './components/physics/box2d/distsWrapper/',
		filesName: [
			'planckWrapper',
			'box2dwasmWrapper',
			'box2dtsWrapper',
			'box2dninjaWrapper',
			'box2dwebWrapper',
			'nativeWrapper',
			'box2dWrapper',
			'voxelWrapper'
		],
	},
];

const arrays = includeFolders
	.map((v) =>
		v.filesName.map((fileName) => {
			return [v.flags, fileName, `${v.folderPath + fileName}.js`];
		})
	)
	.flat();

var taroCoreConfig = {
	/* Includes for the main taro loader. Flags are indicated as:
	 * c = client
	 * s = server
	 * a =
	 * p = prototype
	 */
	include: [
		/* Client-Side Stack Trace Support */
		['c', 'TaroStackTrace', 'components/stackTrace/lib_stack.js'],
		/* The taro Core Files */
		['csap', 'TaroBase', 'core/TaroBase.js'],
		['csap', 'TaroClass', 'core/TaroClass.js'],
		['csap', 'TaroEventingClass', 'core/TaroEventingClass.js'],
		/* Data Classes */
		['csap', 'TaroPoint2d', 'core/TaroPoint2d.js'],
		['csap', 'TaroPoint3d', 'core/TaroPoint3d.js'],
		['csap', 'TaroPoly2d', 'core/TaroPoly2d.js'],
		['csap', 'TaroRect', 'core/TaroRect.js'],
		['csap', 'TaroMatrix2d', 'core/TaroMatrix2d.js'],
		/* Components */
		['csap', 'TaroTimeComponent', 'components/TaroTimeComponent.js'],
		['csap', 'TaroAnimationComponent', 'components/TaroAnimationComponent.js'],
		['csap', 'TaroVelocityComponent', 'components/TaroVelocityComponent.js'],
		['csap', 'TaroInputComponent', 'components/TaroInputComponent.js'],
		['csap', 'TaroTiledComponent', 'components/TaroTiledComponent.js'],
		['csap', 'TaroUiManagerComponent', 'components/TaroUiManagerComponent.js'],
		['csap', 'ProfilerComponent', 'components/ProfilerComponent.js'],
		/* Network Stream */
		['csap', 'TaroTimeSyncExtension', 'components/network/TaroTimeSyncExtension.js'],
		['csap', 'TaroStreamComponent', 'components/network/TaroStreamComponent.js'],
		/* Net.io */
		['cap', 'NetIo', 'components/network/net.io/net.io-client/index.js'],
		['cap', 'TaroNetIoClient', 'components/network/net.io/TaroNetIoClient.js'],
		['sap', 'TaroNetIoServer', 'components/network/net.io/TaroNetIoServer.js'],
		['csap', 'TaroNetIoComponent', 'components/network/net.io/TaroNetIoComponent.js'],
		/* Chat System */
		['cap', 'TaroChatClient', 'components/chat/TaroChatClient.js'],
		['sap', 'TaroChatServer', 'components/chat/TaroChatServer.js'],
		['csap', 'TaroChatComponent', 'components/chat/TaroChatComponent.js'],
		/* CocoonJS Support */
		['csap', 'TaroCocoonJsComponent', 'components/cocoonjs/TaroCocoonJsComponent.js'],
		/* General Extensions */
		['csap', 'TaroUiPositionExtension', 'extensions/TaroUiPositionExtension.js'],
		['csap', 'TaroUiStyleExtension', 'extensions/TaroUiStyleExtension.js'],
		/* Main Engine Classes */
		['csap', 'TaroSceneGraph', 'core/TaroSceneGraph.js'],
		['csap', 'TaroBaseScene', 'core/TaroBaseScene.js'],
		['csap', 'TaroDummyCanvas', 'core/TaroDummyCanvas.js'],
		['csap', 'TaroDummyContext', 'core/TaroDummyContext.js'],
		['csap', 'TaroObject', 'core/TaroObject.js'],
		['csap', 'TaroEntity', 'core/TaroEntity.js'],
		['csap', 'TaroMap2d', 'core/TaroMap2d.js'],
		['csap', 'TaroTileMap2d', 'core/TaroTileMap2d.js'],
		['csap', 'TaroCamera', 'core/TaroCamera.js'],
		['csap', 'TaroViewport', 'core/TaroViewport.js'],
		['csap', 'TaroScene2d', 'core/TaroScene2d.js'],
		['csap', 'TaroArray', 'core/TaroArray.js'],
		/* Engine Actual */
		['csap', 'TaroEngine', 'core/TaroEngine.js'],

		/* Physics Libraries */
		['csap', 'PhysicsComponent', './components/physics/box2d/Box2dComponent.js'],
		['csap', 'TaroEntityPhysics', './components/physics/box2d/TaroEntityPhysics.js'],
		['csap', 'TaroBox2dWorld', './components/physics/box2d/TaroBox2dDebugPainter.js'],
		['csap', 'Box2dHelpers', './components/physics/box2d/debugDrawWrapper/box2dwasmHelper.js'],
		['csap', 'Box2dDebugDraw', './components/physics/box2d/debugDrawWrapper/box2dwasmDebugDraw.js'],
		...arrays,
		['csap', 'dists', './components/physics/box2d/dists.js'],
		['csap', 'planck', './components/physics/box2d/dists/planck/planck.js'],
		['csap', 'box2dweb', './components/physics/box2d/dists/box2dweb/lib_box2d.js', 'box2dweb'],
		['csap', 'box2dninja', './components/physics/box2d/dists/box2dweb/box2d_ninja.js', 'box2dninja'],
		['csap', 'box2dts', './components/physics/box2d/dists/flyoverbox2dts/bundle.js'],
		['casp', 'box2dwasm', './components/physics/box2d/dists/box2dwasm/Box2D.simd.js', 'box2dwasm'],
	],
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = taroCoreConfig;
}
