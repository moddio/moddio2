class ThreeBoxMesh extends THREE.Group {
	mesh: THREE.Mesh;

	constructor(tex: THREE.Texture) {
		super();

		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.scale.set(tex.image.width / 64, 1, tex.image.height / 64);
		this.add(this.mesh);
	}

	setScale(sx: number, sy: number, sz: number) {
		this.mesh.scale.set(sx, sy, sz);
	}

	setRotationY(rad: number) {
		this.rotation.y = rad;
	}
}