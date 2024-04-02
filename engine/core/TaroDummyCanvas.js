var nullMethod = function () {};
var TaroDummyCanvas = function () {
	this.dummy = true;
	this.width = 0;
	this.height = 0;
};

TaroDummyCanvas.prototype.getContext = function () {
	return TaroDummyContext;
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroDummyCanvas;
}
