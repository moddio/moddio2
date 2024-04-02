var ConditionComponent = TaroEntity.extend({
	classId: 'ConditionComponent',
	componentId: 'condition',

	init: function (scriptComponent, entity) {
		var self = this;
		self._script = scriptComponent;
		self._entity = entity;
	},

	run: function (items, vars, actionBlockId) {
		var self = this;

		if (items == undefined || items.length <= 0) {
			return true;
		}

		const [opObj, left, right] = items;

		var op = opObj.operator;

		var leftVar = self._script.param.getValue(left, vars);
		var rightVar = self._script.param.getValue(right, vars);

		// if the operands are taroEntities, then compare their id's
		if (leftVar && leftVar._id != undefined && rightVar && rightVar._id != undefined) {
			leftVar = leftVar._id;
			rightVar = rightVar._id;
		}

		// taro.script.scriptLog("condition comparing two variables: "+JSON.stringify(left)+op+JSON.stringify(right)+"\n")
		// taro.script.scriptLog("condition comparing: "+ leftVar+" "+ op +" " + rightVar+'\n')

		if (op == 'AND') {
			return this.run(left, vars, actionBlockId) && this.run(right, vars, actionBlockId);
		} else if (op == 'OR') {
			return this.run(left, vars, actionBlockId) || this.run(right, vars, actionBlockId);
		} else if (op == '==') {
			if (rightVar == undefined) {
				rightVar = !!rightVar;
			}
			if (leftVar == undefined) {
				leftVar = !!leftVar;
			}
			if (typeof leftVar != 'object') {
				var leftVar = JSON.stringify(leftVar);
			}

			if (typeof rightVar != 'object') {
				var rightVar = JSON.stringify(rightVar);
			}

			return leftVar == rightVar; // stringify is important for comparisons like region comparison
		} else if (op == '!=') {
			return leftVar != rightVar;
		} else if (op == '<') {
			return leftVar < rightVar;
		} else if (op == '>') {
			return leftVar > rightVar;
		} else if (op == '<=') {
			return leftVar <= rightVar;
		} else if (op == '>=') {
			return leftVar >= rightVar;
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ConditionComponent;
}
