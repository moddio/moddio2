var moddioConfig =
	process.env.ENV === 'standalone'
		? process.env.LOAD_CC === 'true'
			? [{ name: 'WorkerComponent', path: '../../components/WorkerComponent' }]
			: []
		: [
				{ name: 'WorkerComponent', path: '../../components/WorkerComponent' },
				{ name: 'MasterServerComponent', path: '../../components/MasterServerComponent' },
				{ name: 'MasterComponent', path: '../../components/MasterComponent' },
				{ name: 'HttpComponent', path: '../../components/HttpComponent' },
				{ name: 'ProxyComponent', path: '../../components/ProxyComponent' },
				{ name: 'betterFilter', path: '../../utils/betterFilter' },
			];

var defaultConfig = [
	{ name: 'ServerNetworkEvents', path: '../server/ServerNetworkEvents' },

	{ name: 'ScriptComponent', path: '../src/gameClasses/components/script/ScriptComponent' },

	{ name: 'ConditionComponent', path: '../src/gameClasses/components/script/ConditionComponent' },
	{ name: 'ActionComponent', path: '../src/gameClasses/components/script/ActionComponent' },
	{ name: 'ParameterComponent', path: '../src/gameClasses/components/script/ParameterComponent' },

	{ name: 'Player', path: '../src/gameClasses/Player' },
	{ name: 'Unit', path: '../src/gameClasses/Unit' },
	{ name: 'Sensor', path: '../src/gameClasses/Sensor' },

	{ name: 'MapComponent', path: '../src/gameClasses/components/MapComponent' },
	{ name: 'ShopComponent', path: '../src/gameClasses/components/ShopComponent' },
	{ name: 'GameComponent', path: '../src/gameClasses/components/GameComponent' },
	{ name: 'ItemComponent', path: '../src/gameClasses/components/ItemComponent' },
	{ name: 'TimerComponent', path: '../src/gameClasses/components/TimerComponent' },
	{ name: 'ControlComponent', path: '../src/gameClasses/components/ControlComponent' },
	{ name: 'InventoryComponent', path: '../src/gameClasses/components/InventoryComponent' },

	{ name: 'GameTextComponent', path: '../src/gameClasses/components/ui/GameTextComponent' },
	{ name: 'ScoreboardComponent', path: '../src/gameClasses/components/ui/ScoreboardComponent' },
	{ name: 'AdComponent', path: '../src/gameClasses/components/ui/AdComponent' },
	{ name: 'VideoChatComponent', path: '../src/gameClasses/components/ui/VideoChatComponent' },
	{ name: 'SoundComponent', path: '../src/gameClasses/components/SoundComponent' },

	{ name: 'AbilityComponent', path: '../src/gameClasses/components/unit/AbilityComponent' },
	{ name: 'AIComponent', path: '../src/gameClasses/components/unit/AIComponent' },
	{ name: 'AStarPathfindingComponent', path: '../src/gameClasses/components/unit/AStarPathfindingComponent' },

	{ name: 'AttributeComponent', path: '../src/gameClasses/components/entity/AttributeComponent' },
	{ name: 'VariableComponent', path: '../src/gameClasses/components/entity/VariableComponent' },

	// Raycasting
	{ name: 'Raycaster', path: '../src/gameClasses/Raycaster' },
	{ name: 'Item', path: '../src/gameClasses/Item' },
	{ name: 'Projectile', path: '../src/gameClasses/Projectile' },
	{ name: 'Region', path: '../src/gameClasses/Region' },
	{ name: 'RegionManager', path: '../src/gameClasses/components/RegionManager' },

	// tiles calc
	{ name: 'Combinator', path: '../src/gameClasses/Combinator' },
	{ name: 'TileShape', path: '../src/gameClasses/TileShape' },
	{ name: 'Constants', path: '../src/renderer/phaser/classes/devmode/Constants' },

	{ name: 'StatusComponent', path: '../src/gameClasses/components/StatusComponent' },

	{ name: 'DeveloperMode', path: '../src/gameClasses/DeveloperMode' },
	// Color support
	{ name: 'Colors', path: '../src/utils/Colors' },
	{ name: 'Utils', path: '../src/utils/Utils' },
];

var config = {
	include: moddioConfig.concat(defaultConfig),
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = config;
}
