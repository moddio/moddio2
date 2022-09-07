class PhaserScene extends Phaser.Scene {

	patchAssetUrl (url: string): string {
		// https://stackoverflow.com/a/37455118
		return `${url}?v=1`;
	}
}
