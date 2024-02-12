class ThreeTextureManager {
    constructor() {
        this.textureMap = new Map();
        this.filter = THREE.LinearFilter;
        this.loader = new THREE.TextureLoader();
    }
    static instance() {
        return this._instance || (this._instance = new this());
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    loadFromUrl(key, url, cb = (tex) => { }) {
        this.loader.load(url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.magFilter = this.filter;
            this.textureMap.set(key, tex);
            cb(tex);
        });
    }
    setFilter(filter) {
        this.filter = filter === 'pixelArt' ? THREE.NearestFilter : THREE.LinearFilter;
    }
}
//# sourceMappingURL=ThreeTextureManager.js.map