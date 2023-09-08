function debounce<Params extends any[]>(
	func: (...args: Params) => any,
	timeout: number,
	mergedTemplate?: MergedTemplate<any>,
): (...args: Params) => void {
	let timer: NodeJS.Timeout;
	let mergedData: any = [{}];
	return function (...args: Params) {
		clearTimeout(timer);
		if (mergedTemplate) {
			args.map((v, idx) => {
				objectUtils.merge(mergedData[0], v, mergedTemplate);
			});
		} else {
			if (Array.isArray(args)) {
				mergedData = args;
			} else {
				mergedData[0] = args;
			}
		}

		timer = setTimeout(() => {
			func(...mergedData);
			mergedData = [{}];
		}, timeout);
	};
}

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = debounce;
}
