declare let _: any;
declare let ige: IgeEngine;
declare const gameId: string;

declare const rexvirtualjoystickplugin: any;

type ArrayElement<ArrayType extends readonly unknown[]> =
	ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
