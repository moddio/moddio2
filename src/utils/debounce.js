function debounce(func, timeout, mergedTemplate) {
    var timer;
    var mergedData = [{}];
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        clearTimeout(timer);
        if (mergedTemplate) {
            args.map(function (v, idx) {
                objectUtils.merge(mergedData[0], v, mergedTemplate);
            });
        }
        else {
            if (Array.isArray(args)) {
                mergedData = args;
            }
            else {
                mergedData[0] = args;
            }
        }
        timer = setTimeout(function () {
            func.apply(void 0, mergedData);
            mergedData = [{}];
        }, timeout);
    };
}
if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
    module.exports = debounce;
}
//# sourceMappingURL=debounce.js.map