interface ControlAbility {
	mobilePosition?: {
		x: number;
		y: number;
	},
	keyDown?: {
		cost: object;
		scriptName: string;
	},
	keyUp?: ControlAbility['keyDown']
}

declare class MobileControlsComponent extends IgeEntity {

	controls: Record<MobileControlKey, MobileControlSettings>;

}
