var functionalTryCatch = (fn, ...args) => {
	if (typeof fn !== 'function') {
		throw Error('fn should be a function!');
	}

	try {
		return [null, fn(...args)];
	} catch (e) {
		return [e];
	}
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = functionalTryCatch;
}
