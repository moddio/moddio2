class ThreeSprite extends THREE.Group {
    constructor(tex) {
        super();
        this.layer = 3;
        this.depth = 1;
        this.scaleUnflipped = new THREE.Vector2();
        this.flipX = 1;
        this.flipY = 1;
        const geometry = new THREE.PlaneGeometry(1, 1);
        geometry.rotateX(-Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        this.sprite = new THREE.Mesh(geometry, material);
        this.add(this.sprite);
    }
    setScale(sx, sy) {
        this.scaleUnflipped.set(sx, sy);
        this.sprite.scale.set(this.scaleUnflipped.x * this.flipX, 1, this.scaleUnflipped.y * this.flipY);
    }
    setRotationY(rad) {
        this.sprite.rotation.y = rad;
    }
    setLayer(layer) {
        this.layer = layer;
        this.calcRenderOrder();
    }
    setDepth(depth) {
        this.depth = depth;
        this.calcRenderOrder();
    }
    setTexture(tex) {
        this.sprite.material.map = tex;
    }
    setFlip(x, y) {
        this.flipX = x ? -1 : 1;
        this.flipY = y ? -1 : 1;
        this.setScale(this.scaleUnflipped.x, this.scaleUnflipped.y);
    }
    calcRenderOrder() {
        this.sprite.renderOrder = this.layer * 100 + this.depth;
    }
}
//# sourceMappingURL=ThreeSprite.js.map