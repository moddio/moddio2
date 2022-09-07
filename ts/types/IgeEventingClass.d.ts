type EvtListener = any;

declare class IgeEventingClass extends IgeClass {

	on (
		eventName: string | string[],
		call: (...args: any[]) => void,
		context?: any,
		oneShot?: boolean,
		sendEventName?: boolean
	): EvtListener;

	off (
		eventName: string,
		evtListener: EvtListener,
		callback?: (success: boolean) => void
	): boolean

	emit (
		eventName: string,
		args?: Array<any> | object
	): number;

}
