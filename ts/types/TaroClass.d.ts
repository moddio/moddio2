declare class TaroClass {
	static extend<T extends TaroClass & { init(...args: any[]) }>(
		options: T
	): new (...args: Parameters<typeof options.init>) => T;
}
