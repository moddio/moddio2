var igeCoreConfig = {
	/* Includes for the main IGE loader. Flags are indicated as:
	 * c = client
	 * s = server
	 * a =
	 * p = prototype
	 */
	include: [
		/* Client-Side Stack Trace Support */
		['c', 'IgeStackTrace', 'components/stackTrace/lib_stack.js'],
		/* The IGE Core Files */
		['csap', 'IgeBase', 'core/IgeBase.js'],
		['csap', 'IgeClass', 'core/IgeClass.js'],
		['csap', 'IgeEventingClass', 'core/IgeEventingClass.js'],
		/* Data Classes */
		['csap', 'IgePoint2d', 'core/IgePoint2d.js'],
		['csap', 'IgePoint3d', 'core/IgePoint3d.js'],
		['csap', 'IgePoly2d', 'core/IgePoly2d.js'],
		['csap', 'IgeRect', 'core/IgeRect.js'],
		['csap', 'IgeMatrix2d', 'core/IgeMatrix2d.js'],
		/* Components */
		['csap', 'IgeTimeComponent', 'components/IgeTimeComponent.js'],
		['csap', 'IgeAnimationComponent', 'components/IgeAnimationComponent.js'],
		['csap', 'IgeVelocityComponent', 'components/IgeVelocityComponent.js'],
		['csap', 'IgeTweenComponent', 'components/IgeTweenComponent.js'],
		['csap', 'IgePathComponent', 'components/IgePathComponent.js'],
		['csap', 'IgeInputComponent', 'components/IgeInputComponent.js'],
		['csap', 'IgeTiledComponent', 'components/IgeTiledComponent.js'],
		['csap', 'IgeUiManagerComponent', 'components/IgeUiManagerComponent.js'],
		/* Network Stream */
		['csap', 'IgeTimeSyncExtension', 'components/network/IgeTimeSyncExtension.js'],
		['csap', 'IgeStreamComponent', 'components/network/stream/IgeStreamComponent.js'],
		/* Socket.io */
		// ['cap', 'SocketIo', 'components/network/socket.io/client/socket.io.min.js'],
		['cap', 'IgeSocketIoClient', 'components/network/socket.io/IgeSocketIoClient.js'],
		['sap', 'IgeSocketIoServer', 'components/network/socket.io/IgeSocketIoServer.js'],
		['csap', 'IgeSocketIoComponent', 'components/network/socket.io/IgeSocketIoComponent.js'],
		/* Net.io */
		['cap', 'NetIo', 'components/network/net.io/net.io-client/index.js'],
		['cap', 'IgeNetIoClient', 'components/network/net.io/IgeNetIoClient.js'],
		['sap', 'IgeNetIoServer', 'components/network/net.io/IgeNetIoServer.js'],
		['csap', 'IgeNetIoComponent', 'components/network/net.io/IgeNetIoComponent.js'],
		/* Chat System */
		['cap', 'IgeChatClient', 'components/chat/IgeChatClient.js'],
		['sap', 'IgeChatServer', 'components/chat/IgeChatServer.js'],
		['csap', 'IgeChatComponent', 'components/chat/IgeChatComponent.js'],
		/* MySQL Support */
		['sap', 'IgeMySql', 'components/database/mysql/IgeMySql.js'],
		['sap', 'IgeMySqlComponent', 'components/database/mysql/IgeMySqlComponent.js'],
		/* MongoDB Support */
		['sap', 'IgeMongoDb', 'components/database/mongodb/IgeMongoDb.js'],
		['sap', 'IgeMongoDbComponent', 'components/database/mongodb/IgeMongoDbComponent.js'],
		/* CocoonJS Support */
		['csap', 'IgeCocoonJsComponent', 'components/cocoonjs/IgeCocoonJsComponent.js'],
		/* General Extensions */
		['csap', 'IgeUiPositionExtension', 'extensions/IgeUiPositionExtension.js'],
		['csap', 'IgeUiStyleExtension', 'extensions/IgeUiStyleExtension.js'],
		/* Main Engine Classes */
		['csap', 'IgeFSM', 'core/IgeFSM.js'],
		['csap', 'IgeSceneGraph', 'core/IgeSceneGraph.js'],
		['csap', 'IgeBaseScene', 'core/IgeBaseScene.js'],
		['csap', 'IgeDummyCanvas', 'core/IgeDummyCanvas.js'],
		['csap', 'IgeDummyContext', 'core/IgeDummyContext.js'],
		['csap', 'IgePathNode', 'core/IgePathNode.js'],
		['csap', 'IgePathFinder', 'core/IgePathFinder.js'],
		['csap', 'IgeTween', 'core/IgeTween.js'],
		['csap', 'IgeTexture', 'core/IgeTexture.js'],
		['csap', 'IgeCellSheet', 'core/IgeCellSheet.js'],
		['csap', 'IgeSpriteSheet', 'core/IgeSpriteSheet.js'],
		['csap', 'IgeFontSheet', 'core/IgeFontSheet.js'],
		['csap', 'IgeFontSmartTexture', 'assets/IgeFontSmartTexture.js'],
		['csap', 'IgeObject', 'core/IgeObject.js'],
		['csap', 'IgeEntity', 'core/IgeEntity.js'],
		['csap', 'IgeUiEntity', 'core/IgeUiEntity.js'],
		['csap', 'IgeUiElement', 'core/IgeUiElement.js'],
		['csap', 'IgeFontEntity', 'core/IgeFontEntity.js'],
		['csap', 'IgeParticleEmitter', 'core/IgeParticleEmitter.js'],
		['csap', 'IgeParticle', 'core/IgeParticle.js'],
		['csap', 'IgeMap2d', 'core/IgeMap2d.js'],
		['csap', 'IgeTileMap2d', 'core/IgeTileMap2d.js'],
		['csap', 'IgeTextureMap', 'core/IgeTextureMap.js'],
		['csap', 'IgeTileMap2dSmartTexture', 'assets/IgeTileMap2dSmartTexture.js'],
		['csap', 'IgeCollisionMap2d', 'core/IgeCollisionMap2d.js'],
		['csap', 'IgeCamera', 'core/IgeCamera.js'],
		['csap', 'IgeViewport', 'core/IgeViewport.js'],
		['csap', 'IgeScene2d', 'core/IgeScene2d.js'],
		['csap', 'IgeQuest', 'core/IgeQuest.js'],
		['csap', 'IgeInterval', 'core/IgeInterval.js'],
		['csap', 'IgeTimeout', 'core/IgeTimeout.js'],
		['csap', 'IgeCuboidSmartTexture', 'assets/IgeCuboidSmartTexture.js'],
		['csap', 'IgeCuboid', 'primitives/IgeCuboid.js'],
		['csap', 'IgeArray', 'core/IgeArray.js'],
		/* Audio Components */
		['csap', 'IgeAudioComponent', 'components/audio/IgeAudioComponent.js'],
		['csap', 'IgeAudio', 'components/audio/IgeAudio.js'],
		/* UI Classes */
		['csap', 'IgeUiDropDown', 'ui/IgeUiDropDown.js'],
		['csap', 'IgeUiButton', 'ui/IgeUiButton.js'],
		['csap', 'IgeUiRadioButton', 'ui/IgeUiRadioButton.js'],
		['csap', 'IgeUiProgressBar', 'ui/IgeUiProgressBar.js'],
		['csap', 'IgeUiTextBox', 'ui/IgeUiTextBox.js'],
		['csap', 'IgeUiLabel', 'ui/IgeUiLabel.js'],
		['csap', 'IgeUiTooltip', 'ui/IgeUiTooltip.js'],
		['csap', 'IgeUiMenu', 'ui/IgeUiMenu.js'],
		/* Image Filters */
		['cap', 'IgeFilters', 'core/IgeFilters.js'],
		['cap', 'IgeFilters._convolute', 'filters/convolute.js'],
		['cap', 'IgeFilters.greyScale', 'filters/greyScale.js'],
		['cap', 'IgeFilters.brighten', 'filters/brighten.js'],
		['cap', 'IgeFilters.threshold', 'filters/threshold.js'],
		['cap', 'IgeFilters.sharpen', 'filters/sharpen.js'],
		['cap', 'IgeFilters.blur', 'filters/blur.js'],
		['cap', 'IgeFilters.emboss', 'filters/emboss.js'],
		['cap', 'IgeFilters.edgeDetect', 'filters/edgeDetect.js'],
		['cap', 'IgeFilters.edgeEnhance', 'filters/edgeEnhance.js'],
		['cap', 'IgeFilters.outlineDetect', 'filters/outlineDetect.js'],
		['cap', 'IgeFilters.colorOverlay', 'filters/colorOverlay.js'],
		['cap', 'IgeFilters.sobel', 'filters/sobel.js'],
		['cap', 'IgeFilters.invert', 'filters/invert.js'],
		['cap', 'IgeFilters.glowMask', 'filters/glowMask.js'],
		/* Engine Actual */
		['csap', 'IgeEngine', 'core/IgeEngine.js'],
		/* Physics Libraries */
		['csap', 'PhysicsComponent', './components/physics/box2d/Box2dComponent.js'],
		['csap', 'IgeEntityPhysics', './components/physics/box2d/IgeEntityPhysics.js'],
		['csap', 'IgeBox2dWorld', './components/physics/box2d/IgeBox2dDebugPainter.js'],
		['csap', 'dists', './components/physics/box2d/dists.js'],
		['csap', 'planck', './components/physics/box2d/dists/planck/planck.js'],
		['csap', 'box2dweb', './components/physics/box2d/dists/box2dweb/lib_box2d.js', 'box2dweb'],
		['csap', 'box2dninja', './components/physics/box2d/dists/box2dweb/box2d_ninja.js', 'box2dninja'],
		['csap', 'box2dts', './components/physics/box2d/dists/flyoverbox2dts/bundle.js']
		// No crash for now
	]
};

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = igeCoreConfig;
}
