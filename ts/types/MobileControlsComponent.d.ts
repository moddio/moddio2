interface ControlAbility {
	mobilePosition?: {
		x: number;
		y: number;
	};
	keyDown?: {
		cost: object;
		scriptName: string;
		abilityId: string;
		event: string;
	};
	keyUp?: ControlAbility['keyDown'];
}

declare class MobileControlsComponent extends TaroEntity {
	updateButtonPos(): void;

	configure(abilities: Record<string, ControlAbility>): void;

	controls: Record<MobileControlKey, MobileControlSettings>;
}
