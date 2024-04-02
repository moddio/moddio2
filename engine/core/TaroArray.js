var TaroArray = function () {};
TaroArray.prototype = [];

// Empower the TaroArray with all the method calls of the an TaroEntity
for (var methodName in TaroEntity.prototype) {
	if (TaroEntity.prototype.hasOwnProperty(methodName)) {
		if (methodName !== 'init') {
			TaroArray.prototype[methodName] = (function (methodName) {
				return function () {
					var c = this.length;
					for (var i = 0; i < c; i++) {
						this[i][methodName].apply(this[i], arguments);
					}
				};
			})(methodName);
		}
	}
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroArray;
}
