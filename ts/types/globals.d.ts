declare let _: any;
declare let taro: TaroEngine;
declare const gameId: string;

declare const box2dwasm: any;
declare const box2dweb: any;
declare const box2DJS: any;
declare const box2dts: any;
declare const planck: any;
declare const box2dninja: any;
declare const PhysicsComponent: any;
declare const UIPlugin: any;
declare const rexvirtualjoystickplugin: any;
declare const RoundRectanglePlugin: any;

interface Window {
	taro: TaroEngine;
	toastErrorMessage: Function;
	isStandalone: Boolean;
}
type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[]
	? ElementType
	: never;

// react editor
declare const inGameEditor: InGameEditor;
declare const reactApp: any;

declare const USE_LOCAL_STORAGE: boolean;
declare const storage: any;

declare const showUserDropdown: any;
declare const rfdc: any;
