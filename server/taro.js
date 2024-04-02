const cluster = require('cluster');

console.log('########################################################');
console.log('########################################################\n');
console.log(`Executing taro Under Node.js Version ${process.version}`);

// Set a global variable for the location of
// the node_modules folder
modulePath = '../server/node_modules/';
function generateId() {
	let text = '';
	let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (var i = 0; i < 24; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return text;
}

// Load the CoreConfig.js file
taroCoreConfig = require('../engine/CoreConfig.js');
var arr = taroCoreConfig.include;
var arrCount = arr.length;
var arrIndex;
var arrItem;
var itemJs;

// Check if we are deploying, if so don't include core modules
var argParse = require('node-arguments').process;
var args = argParse(process.argv, { separator: '-' });

if (!args['-deploy']) {
	// Loop the taroCoreConfig object's include array
	// and load the required files
	for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
		arrItem = arr[arrIndex];
		if (arrItem[0].indexOf('s') > -1) {
			itemJs = `${arrItem[1]} = ` + `require("../engine/${arrItem[2]}")`;
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
} else {
	// Just include the basics to run TaroNode
	TaroBase = require('../engine/core/TaroBase');
	TaroClass = require('../engine/core/TaroClass');
}

if (process.env.ENV == 'dev') {
	// Include the control class
	TaroNode = require('./TaroNode');
	var taroNode = new TaroNode(); // master TaroNode
} else {
	var self = this;
	// Start the app
	TaroNode = require('./TaroNode');
	var taroNode = new TaroNode();

	if (cluster.isPrimary) {
		// master cluster!
		// Fork workers.
		var debug = process.execArgv.indexOf('--debug') !== -1;
		cluster.setupMaster({
			execArgv: process.execArgv.filter(function (s) {
				return s !== '--debug';
			}),
		});
	} else {
		// Workers can share any TCP connection
		// In this case it is an HTTP server
		// Include the control class

		process.env.cluster = 'worker';

		console.log(`Worker ${process.pid} started`);
	}
}
