var ScriptComponent = TaroEntity.extend({
	classId: 'ScriptComponent',
	componentId: 'script',

	init: function (entity) {
		var self = this;

		self._entity = entity;
		// self.logStr = "";
		self.scripts = undefined;
		self.entryCount = 0;
		self.showLog = false;
		self.errorLogs = {};
		self.currentActionName = '';
		self.currentActionLineNumber = 0;
		self.scriptCache = {};
		self.scriptTime = {};
		self.scriptRuns = {};
		self.last50Actions = [];

		self.addComponent(ParameterComponent, entity);
		self.addComponent(ActionComponent, entity);
		self.addComponent(ConditionComponent, entity);

		ScriptComponent.prototype.log('initializing Script Component');
	},

	load: function (scripts, modify = false) {
		if (modify) {
			Object.entries(scripts).forEach(([scriptId, script]) => {
				if (!script.deleted) {
					this.scripts[scriptId] = script;
				} else {
					delete this.scripts[scriptId];
				}
			});
		} else {
			this.scripts = scripts;
		}
		// map trigger events, so we don't have to iterate through all scripts to find corresponding scripts
		this.triggeredScripts = {};
		for (var scriptId in this.scripts) {
			var script = this.scripts[scriptId];

			// look for matching trigger within the script's triggers
			if (script && script.triggers) {
				for (j = 0; j < script.triggers.length; j++) {
					var trigger = script.triggers[j];
					if (this.triggeredScripts[trigger.type] == undefined) {
						this.triggeredScripts[trigger.type] = [scriptId];
					} else {
						this.triggeredScripts[trigger.type].push(scriptId);
					}
				}
			}
		}
	},

	runScript: function (scriptId, params = {}) {
		var self = this;

		// for logging script history
		self.currentScriptId = scriptId;
		if (this.scripts && this.scripts[scriptId]) {
			var actions = self.getScriptActions(scriptId);

			// console.log(scriptId, ': ', actions, params);

			if (actions) {
				var path = `${this._entity._id}/${scriptId}`;
				var cmd = self.action.run(actions, params, path, 0); // path is passed for profiling purpose
				if (cmd == 'return') {
					taro.log('script return called');
					return;
				}
			}
			// check if we are trying to run a global script from inside entity scripts

			// if we are running from entity script and the script was not found
			// then check for the script on the global script component
		} else if (this._entity && this._entity._id && this._entity._id !== 'taro') {
			taro.script.runScript(scriptId, params);
		}
	},

	getScriptActions: function (scriptId) {
		var self = this;
		if (
			self.scriptCache[scriptId] &&
			(typeof mode === 'undefined' || (typeof mode === 'string' && mode != 'sandbox'))
		) {
			return self.scriptCache[scriptId];
		} else {
			var script = this.scripts[scriptId];
			if (!script.actions) return null;
			if (script) {
				self.scriptCache[scriptId] = rfdc()(script.actions);
				return self.scriptCache[scriptId];
			}
		}
		return null;
	},

	/* trigger and run all of the corresponding script(s) */
	trigger: function (triggerName, triggeredBy) {
		if (taro.isServer) {
			var now = Date.now();
			var lastTriggerRunTime = now - taro.lastTriggerRanAt;

			if (taro.lastTrigger) {
				if (taro.triggerProfiler[taro.lastTrigger]) {
					var count = taro.triggerProfiler[taro.lastTrigger].count;
					taro.triggerProfiler[taro.lastTrigger].count++;
					taro.triggerProfiler[taro.lastTrigger].avgTime =
						(taro.triggerProfiler[taro.lastTrigger].avgTime * count + lastTriggerRunTime) / (count + 1);
					taro.triggerProfiler[taro.lastTrigger].totalTime += lastTriggerRunTime;
				} else {
					taro.triggerProfiler[taro.lastTrigger] = {
						count: 1,
						avgTime: lastTriggerRunTime,
						totalTime: lastTriggerRunTime,
					};
				}
			}

			taro.lastTrigger = triggerName;
			taro.lastTriggerRanAt = now;
		}

		let scriptIds = this.triggeredScripts[triggerName];

		for (var i in scriptIds) {
			let scriptId = scriptIds[i];
			this.scriptLog(`\ntrigger: ${triggerName}`);

			var localVariables = {
				triggeredBy: triggeredBy,
			};

			// console.log(this._entity._category, triggerName, scriptId)
			this.runScript(scriptId, localVariables);
		}
	},

	scriptLog: function (str, tabCount) {
		if (this.entryCount > 50000) return;

		this.entryCount++;

		tabs = '';
		for (i = 0; i < tabCount; i++) {
			tabs += '    ';
		}

		// if (taro.server.isScriptLogOn)
		// console.log(tabs+str)

		// this.logStr = this.logStr  + tabs + str

		// if (this.entryCount > 50000)
		// {

		// 	var filename = "logs/"+taro.server.serverId+"script.log"

		// 	fs.writeFile(filename, this.logStr, function(err) {
		// 	    if(err) {
		// 	        return ScriptComponent.prototype.log(err);
		// 	    }
		// 	});

		// 	ScriptComponent.prototype.log("file saved: ", filename)
		// 	this.logStr = ""
		// 	// this.entryCount = 0
		// }
	},

	recordLast50Action: function (action) {
		var self = this;

		if (self.last50Actions.length > 50) {
			self.last50Actions.shift();
		}

		var scriptName = '[scriptName undefined]';
		if (this.scripts && this.scripts[this.currentScriptId]) {
			scriptName = this.scripts[this.currentScriptId].name;
		}

		var record = `script '${scriptName}' in Action '${action}'`;
		self.last50Actions.push(record);
	},

	errorLog: function (message, path, withActionBlockIdx) {
		if (path == undefined) {
			path = `${this._entity._id}/${this.currentScriptId}/${this.currentActionName}`;
		}
		if (withActionBlockIdx !== true) {
			path += `/${this.currentActionLineNumber}`;
		}
		if (this.scripts) {
			if (taro.script.errorLogs[path] == undefined) {
				taro.script.errorLogs[path] = { message, count: 1 };
			} else {
				taro.script.errorLogs[path].count++;
			}

			if (taro.env === 'standalone') console.log('errorLog', path, message);
			// taro.devLog('errorLog', message);
			// ScriptComponent.prototype.log(log);
		}
		if (taro.isServer && taro.server.unpublishQueued) {
			taro.server.unpublish(`${message} ${path}`);
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ScriptComponent;
}
