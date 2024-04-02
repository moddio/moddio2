var UnitAttributeBar = TaroEntity.extend({
	classId: 'UnitAttributeBar',

	init: function (parentEntityId, attributeData, config) {
		var self = this;

		TaroEntity.prototype.init.call(self);
		self.id();
		self.category('unitBar');

		config = config || {};

		self._stats = {
			parentId: parentEntityId,
		};

		if (typeof attributeData.index !== 'number') {
			console.log('attribute data', attributeData, 'does not have index information');
		}
		if (attributeData.index < 0) {
			console.log('attribute data', attributeData, 'have invalid index information');
		}

		self.index = attributeData.index;

		var progressValueInPercent = (attributeData.value / attributeData.max) * 100;
		progressValueInPercent = Math.max(0, Math.min(100, progressValueInPercent));
		self.lastValue = {
			value: typeof attributeData.value === 'number' ? attributeData.value.toFixed(0) : 0,
			max: attributeData.max,
			progressValueInPercent: progressValueInPercent,
		};
	},

	fadeOut: function (duration) {
		duration = duration || 2000;

		var self = this;

		self.destroyTimeout = setTimeout(function () {
			var parentEntity = self.getOwner();

			if (parentEntity) {
				parentEntity.attributeBars = parentEntity.attributeBars.filter(function (bar) {
					return bar.id !== self.id();
				});
			}

			self.destroy();
		}, duration);

		return this;
	},

	getOwner: function () {
		return taro.$(this._stats.parentId);
	},

	/**
	 * @param {object} attributeData
	 *
	 * sets width of value bar based on provided {attributeData} data and
	 * updates text of value label if it exists
	 */
	updateBar: function (attributeData) {
		var self = this;
		// pick out all the variables that we want to use
		const { value, max, decimalPlaces } = attributeData;
		var progressValueInPercent = (attributeData.value / attributeData.max) * 100;

		// not sure we even want to do rounding here
		// let newValue = decimalPlaces ?
		// 	value.toPrecision(decimalPlaces) :
		// 	value.toPrecision(0);

		newValue = value;

		if (self.lastValue.value && self.lastValue.value === newValue) {
			return;
		}

		progressValueInPercent = Math.max(0, Math.min(100, progressValueInPercent));
		progressValueInPercent = parseInt(progressValueInPercent);

		self.lastValue = {
			value: newValue,
			max: max,
			progressValueInPercent: progressValueInPercent,
		};
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = UnitAttributeBar;
}
