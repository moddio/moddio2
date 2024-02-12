class ThreeBoxMesh extends THREE.Group {
    constructor(tex) {
        super();
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.scale.set(Utils.pixelToWorld(tex.image.width), 1, Utils.pixelToWorld(tex.image.height));
        this.add(this.mesh);
    }
    setScale(sx, sy, sz) {
        this.mesh.scale.set(sx, sy, sz);
    }
    setRotationY(rad) {
        this.rotation.y = rad;
    }
}
//# sourceMappingURL=ThreeBoxMesh.js.map