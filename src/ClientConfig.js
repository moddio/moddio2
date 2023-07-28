var taroClientConfig = {
	include: [
		'/lib/stats.js',
		'/lib/dat.gui.min.js',
		'/lib/msgpack.min.js',

		'/gameClasses/Player.js',
		'/gameClasses/Unit.js',
		'/gameClasses/Sensor.js',
		'/gameClasses/Region.js',

		'/gameClasses/Item.js',
		'/gameClasses/Projectile.js',
		'/gameClasses/Particle.js',

		'/gameClasses/UnitAttributeBar.js',

		'/gameClasses/ClientNetworkEvents.js',
		'/gameClasses/components/GameComponent.js',
		'/gameClasses/components/MapComponent.js',
		'/gameClasses/components/InventoryComponent.js',
		'/gameClasses/components/SoundComponent.js',
		'/gameClasses/components/ControlComponent.js',
		'/gameClasses/components/MobileControlsComponent.js',
		'/gameClasses/components/TimerComponent.js',
		'/gameClasses/components/ShopComponent.js',
		'/gameClasses/components/RegionManager.js',
		'/gameClasses/components/TweenComponent.js',

		'/gameClasses/components/ui/MenuUiComponent.js',
		'/gameClasses/components/ui/ThemeComponent.js',
		'/gameClasses/components/ui/PlayerUiComponent.js',
		'/gameClasses/components/ui/GameTextComponent.js',
		'/gameClasses/components/ui/ScoreboardComponent.js',
		'/gameClasses/components/ui/ItemUiComponent.js',
		'/gameClasses/components/ui/AdComponent.js',
		'/gameClasses/components/ui/DevConsoleComponent.js',
		'/gameClasses/components/ui/UnitUiComponent.js',
		'/gameClasses/components/ui/VideoChatComponent.js',
		'/gameClasses/components/ui/TradeUiComponent.js',

		'/gameClasses/components/script/ScriptComponent.js',
		'/gameClasses/components/script/VariableComponent.js',
		'/gameClasses/components/script/ActionComponent.js',
		'/gameClasses/components/script/ConditionComponent.js',

		'/gameClasses/components/unit/AIComponent.js',
		'/gameClasses/components/unit/AbilityComponent.js',
		'/gameClasses/components/unit/AttributeComponent.js',

		/* Standard game scripts */
		'/gameClasses/DeveloperMode.js',
		'/gameClasses/EntitiesToRender.js',
		'/gameClasses/Raycaster.js',
		'/gameClasses/HeightRenderComponent.js',

		/* tile calc */
		'/gameClasses/Combinator.js',
		'/gameClasses/TileShape.js',
		/* Phaser */
		'renderer/phaser/phaser.min.js',
		'renderer/phaser/rexuiplugin.min.js',
		'../node_modules/phaser3-rex-plugins/dist/rexvirtualjoystickplugin.min.js',
		//'../node_modules/phaser3-rex-plugins/templates/ui/ui-components.js',
		'renderer/phaser/enums/FlipMode.js',
		'renderer/phaser/enums/TileLayer.js',
		'renderer/phaser/enums/EntityLayer.js',
		'renderer/phaser/classes/BitmapFontManager.js',
		'renderer/phaser/classes/PhaserEntity.js',
		'renderer/phaser/classes/PhaserAnimatedEntity.js',
		'renderer/phaser/classes/PhaserUnit.js',
		'renderer/phaser/classes/PhaserProjectile.js',
		'renderer/phaser/classes/PhaserAttributeBar.js',
		'renderer/phaser/classes/PhaserItem.js',
		'renderer/phaser/classes/PhaserFloatingText.js',
		'renderer/phaser/classes/PhaserChatBubble.js',
		'renderer/phaser/classes/PhaserRegion.js',
		'renderer/phaser/classes/PhaserRay.js',
		'renderer/phaser/classes/PhaserParticle.js',
		'renderer/phaser/scenes/PhaserScene.js',
		'renderer/phaser/scenes/GameScene.js',
		'renderer/phaser/classes/PhaserJoystick.js',
		'renderer/phaser/scenes/MobileControlsScene.js',
		'renderer/phaser/scenes/DevModeScene.js',
		'renderer/phaser/classes/devmode/DevModeTools.js',
		'renderer/phaser/classes/devmode/DevToolButton.js',
		'renderer/phaser/classes/devmode/DevTooltip.js',
		'renderer/phaser/classes/devmode/RegionEditor.js',
		'renderer/phaser/classes/devmode/TileEditor.js',
        'renderer/phaser/classes/devmode/EntityEditor.js',
		'renderer/phaser/classes/devmode/TilePalette.js',
		'renderer/phaser/classes/devmode/TileMarker.js',
        'renderer/phaser/classes/devmode/MarkerGraphics.js',
		'renderer/phaser/classes/devmode/CommandsController.js',
		'renderer/phaser/classes/devmode/Constants.js',
		'renderer/phaser/classes/devmode/EntityImage.js',
		'renderer/phaser/PhaserRenderer.js',
		'/client.js',
		'/index.js'
	]
};

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = taroClientConfig;
}
