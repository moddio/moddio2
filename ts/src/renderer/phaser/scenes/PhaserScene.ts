class PhaserScene extends Phaser.Scene {
	patchAssetUrl(url: string): string {
		// proxy all s3 requests via cloudflare, old-cache.modd.io points to same 'modd' s3 bucket
		if (url?.startsWith('https://modd.s3.amazonaws.com')) {
			url = url.replace('https://modd.s3.amazonaws.com', 'https://old-cache.modd.io');
		}

		if (url?.indexOf('.png') !== -1 || url?.indexOf('.jpg') !== -1) {
			// load images via Image tag, helps CF optimize and convert(to webp) images via Polish - https://newdocs.phaser.io/docs/3.60.0/focus/Phaser.Loader.LoaderPlugin-image
			this.load.imageLoadType = 'HTMLImageElement';
		} else {
			// default loader type
			this.load.imageLoadType = 'XHR';
		}

		// https://stackoverflow.com/a/37455118
		return `${url}?v=1`;
	}
}
