declare let _: any;
declare let taro: TaroEngine;
declare const gameId: string;

declare const UIPlugin: any;
declare const rexvirtualjoystickplugin: any;

type ArrayElement<ArrayType extends readonly unknown[]> =
	ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

// react editor
declare const inGameEditor : InGameEditor;
declare const reactApp : any;

declare const USE_LOCAL_STORAGE: boolean;
declare const storage: any;
