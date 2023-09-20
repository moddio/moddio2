class PhaserScene extends Phaser.Scene {

	patchAssetUrl (url: string): string {
		
		// proxy all s3 requests via cloudflare
		if (url?.startsWith('https://modd.s3.amazonaws.com')) {
			url = url.replace('https://modd.s3.amazonaws.com', 'https://old-cache.modd.io');
		}
		
		// https://stackoverflow.com/a/37455118
		return `${url}?v=1`;
	}
}
