var taroPhysicsConfig = {
	taroPhysicsChoices: {
		/* Includes for the main taro loader. Flags are indicated as:
		 * c = client
		 * s = server
		 * a =
		 * p = prototype
		 */

		/* Physics Libraries */
		planck: [
			['csap', 'PhysicsComponent', './components/physics/box2d/Box2dComponent.js'],
			['csap', 'TaroEntityPhysics', './components/physics/box2d/TaroEntityPhysics.js'],
			['csap', 'TaroBox2dWorld', './components/physics/box2d/TaroBox2dDebugPainter.js'],
			['csap', 'dists', './components/physics/box2d/dists.js'],
			['csap', 'planck', './components/physics/box2d/dists/planck/planck.js'],
		],

		box2dwasm: [
			['csap', 'PhysicsComponent', './components/physics/box2d/Box2dComponent.js'],
			['csap', 'TaroEntityPhysics', './components/physics/box2d/TaroEntityPhysics.js'],
			['csap', 'TaroBox2dWorld', './components/physics/box2d/TaroBox2dDebugPainter.js'],
			['csap', 'dists', './components/physics/box2d/dists.js'],
			['csap', 'box2dwasm', './components/physics/box2d/dists/box2dwasm/entry.js', 'box2dwasm'],
		],

		box2dweb: [
			['csap', 'PhysicsComponent', './components/physics/box2d/Box2dComponent.js'],
			['csap', 'TaroEntityPhysics', './components/physics/box2d/TaroEntityPhysics.js'],
			['csap', 'TaroBox2dWorld', './components/physics/box2d/TaroBox2dDebugPainter.js'],
			['csap', 'dists', './components/physics/box2d/dists.js'],
			['csap', 'box2dweb', './components/physics/box2d/dists/box2dweb/lib_box2d.js', 'box2dweb'],
			['csap', 'box2dninja', './components/physics/box2d/dists/box2dweb/box2d_ninja.js', 'box2dninja'],
		],

		box2dts: [
			['csap', 'PhysicsComponent', './components/physics/box2d/Box2dComponent.js'],
			['csap', 'TaroEntityPhysics', './components/physics/box2d/TaroEntityPhysics.js'],
			['csap', 'TaroBox2dWorld', './components/physics/box2d/TaroBox2dDebugPainter.js'],
			['csap', 'dists', './components/physics/box2d/dists.js'],
			['csap', 'box2dts', './components/physics/box2d/dists/flyoverbox2dts/bundle.js'],
		],

		crash: [
			['csap', 'PhysicsComponent', './components/physics/crash/CrashComponent.js'],
			['csap', 'TaroEntityPhysics', './components/physics/crash/TaroEntityPhysics.js'],
			['csap', 'CollisionController', './components/physics/crash/CollisionController.js'],
			['csap', 'quickselect', './components/physics/crash/crashDependencies/quickselect.js'],
			['csap', 'rbush', './components/physics/crash/crashDependencies/rbush.js'],
			['csap', 'sat', './components/physics/crash/crashDependencies/sat.js'],
			['csap', 'crash', './components/physics/crash/crashDependencies/crash.js', 'crash'],
		],
	},

	gameClasses: [
		['csap', 'Unit', '../src/gameClasses/Unit.js'],
		['csap', 'MapComponent', '../src/gameClasses/components/MapComponent.js'],
		['csap', 'Region', '../src/gameClasses/Region.js'],
		['csap', 'Item', '../src/gameClasses/Item.js'],
		['csap', 'Projectile', '../src/gameClasses/Projectile.js'],
		['csap', 'Particle', '../src/gameClasses/Particle.js'],
		['csap', 'Sensor', '../src/gameClasses/Sensor.js'],
	],

	loadSelectPhysics: function (physicsChoice) {
		this.loadFiles(this.taroPhysicsChoices[physicsChoice]);
	},

	loadPhysicsGameClasses: function () {
		this.loadFiles(this.gameClasses);
	},

	// I don't think the server needs to be loading crash dependencies if we have them as npm packages.
	// Should test removing the 's' from those item[0] strings.

	loadFiles: function (physicsFiles) {
		var arr = physicsFiles;
		var arrCount = arr.length;
		var arrIndex, arrItem, itemJs;

		var argParse = require('node-arguments').process;
		var args = argParse(process.argv, { separator: '-' });

		if (!args['-deploy']) {
			// Loop the taroCoreConfig object's include array
			// and load the required files
			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				arrItem = arr[arrIndex];

				itemJs = `${arrItem[1]} = ` + `require("${arrItem[2]}")`;
				// Check if there is a specific object we want to use from the
				// module we are loading
				if (arrItem[3]) {
					itemJs += `.${arrItem[3]};`;
				} else {
					itemJs += ';';
				}
				eval(itemJs);
			}
		}
	},
};
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = taroPhysicsConfig;
}
