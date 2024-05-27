var QuestComponent = TaroEntity.extend({
	classId: 'QuestComponent',
	componentId: 'quest',

	init: function (entity, options) {
		var self = this;
		self._entity = entity;
		var gameId = taro.game.data.defaultData._id;
		// TODO handle the default value here
		if (self._entity.quests.active[gameId] === undefined) {
			self._entity.quests.active[gameId] = {};
		}
		if (self._entity.quests.completed[gameId] === undefined) {
			self._entity.quests.completed[gameId] = [];
		}
		// for (var questId in self._entity.quests) {
		// 	var entityQuest = self._entity.quests[questId];
		// 	// if the quest is not defined, use the default value

		// 	if (entityQuest?.value == undefined) {
		// 		// self._entity.quests[questId].value = entityQuest.default;
		// 		self.update(questId, entityQuest.default);
		// 	}
		// }
	},

	completeQuest: function (questId) {
		var self = this;
		var gameId = taro.game.data.defaultData._id;

		var questObj = self._entity.quests;
		if (questObj !== undefined) {
			if (questObj.active[gameId][questId] !== undefined) {
				delete questObj.active[gameId][questId];
				questObj.completed[gameId].push(questId);
				if (taro.isServer) {
					self._entity.streamUpdateData([
						{
							quests: {
								[questId]: { completed: true },
							},
						},
					]);
				}
			} else {
				taro.script.errorLog(`no active quest with ${questId} found`);
			}
		}
	},

	removeQuest: function (questId) {
		var self = this;
		var gameId = taro.game.data.defaultData._id;
		var questObj = self._entity.quests;
		if (questObj.active[gameId][questId] !== undefined) {
			delete questObj.active[gameId][questId];
		}
		var questObj = self._entity.quests;
		if (questObj.completed[gameId].includes(questId)) {
			questObj.completed[gameId] = questObj.completed[gameId].filter((v) => v !== questId);
			if (taro.isServer) {
				self._entity.streamUpdateData([
					{
						quests: questId,
					},
				]);
			}
		}
	},

	addQuest: function (questId, object) {
		var self = this;
		var gameId = taro.game.data.defaultData._id;

		var questObj = self._entity.quests;
		if (questObj !== undefined) {
			if (questObj.active[gameId][questId] === undefined) {
				questObj.active[gameId][questId] = object;
				if (taro.isServer) {
					self._entity.streamUpdateData([
						{
							quests: {
								[questId]: object,
							},
						},
					]);
				}
			} else {
				taro.script.errorLog(`quest ${questId} has already been added to the player`);
			}
		}
	},

	setProgress: function (questId, progress) {
		var self = this;
		var gameId = taro.game.data.defaultData._id;

		var questObj = self._entity.quests;
		if (questObj !== undefined) {
			if (questObj.active[gameId][questId] !== undefined && questObj.active[gameId][questId].progress !== value) {
				questObj.active[gameId][questId].progress = progress;
				if (taro.isServer) {
					self._entity.streamUpdateData([
						{
							quests: {
								[questId]: { progress },
							},
						},
					]);
				}
			}
		} else {
			taro.script.errorLog(`quest ${questId} is not defined`);
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = QuestComponent;
}
