namespace Renderer {
	export namespace Three {
		export class Sprite extends Node {
			sprite: THREE.Mesh;
			billboard = false;
			scaleUnflipped = new THREE.Vector2(1, 1);

			private layer = 3;
			private depth = 1;
			private flipX = 1;
			private flipY = 1;
			private zOffset = 0;
			private angleOffset = 0;

			constructor(protected tex: THREE.Texture) {
				super();

				const geometry = new THREE.PlaneGeometry(1, 1);
				geometry.rotateX(-Math.PI / 2);
				const material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
				this.sprite = new THREE.Mesh(geometry, material);
				this.add(this.sprite);

				const renderer = Renderer.Three.instance();
				renderer.camera.onChange(() => {
					if (this.billboard) {
						this.faceCamera(renderer.camera);
						this.correctZOffsetBasedOnCameraAngle();
					}
				});
			}

			setBillboard(billboard: boolean, camera: Camera) {
				this.billboard = billboard;
				if (this.billboard) {
					this.faceCamera(camera);
					this.correctZOffsetBasedOnCameraAngle();
				}
			}

			setScale(sx: number, sy: number) {
				this.scaleUnflipped.set(sx, sy);
				this.sprite.scale.set(this.scaleUnflipped.x * this.flipX, 1, this.scaleUnflipped.y * this.flipY);
			}

			setRotationY(rad: number) {
				this.sprite.rotation.y = rad;
			}

			setLayer(layer: number) {
				this.layer = layer;
				this.calcRenderOrder();
			}

			setDepth(depth: number) {
				this.depth = depth;
				this.calcRenderOrder();
			}

			setZOffset(offset: number) {
				this.zOffset = offset;
				this.calcRenderOrder();
				this.correctZOffsetBasedOnCameraAngle();
			}

			setTexture(tex: THREE.Texture) {
				(this.sprite.material as THREE.MeshBasicMaterial).map = tex;
			}

			setFlip(x: boolean, y: boolean) {
				this.flipX = x ? -1 : 1;
				this.flipY = y ? -1 : 1;
				this.setScale(this.scaleUnflipped.x, this.scaleUnflipped.y);
			}

			getSizeInPixels() {
				return { width: Utils.worldToPixel(this.scaleUnflipped.x), height: Utils.worldToPixel(this.scaleUnflipped.y) };
			}

			private calcRenderOrder() {
				this.sprite.renderOrder = this.layer * 100 + this.depth;
				this.position.y = Utils.getLayerZOffset(this.layer) + Utils.getDepthZOffset(this.depth) + this.zOffset;
			}

			private faceCamera(camera: Camera) {
				this.rotation.setFromRotationMatrix(camera.instance.matrix);
				this.rotateX(Math.PI * 0.5);
			}

			private correctZOffsetBasedOnCameraAngle() {
				let angle = Math.abs(Renderer.Three.instance().camera.getElevationAngle());
				angle = Math.PI * 0.5 - angle;
				let halfHeight = this.scaleUnflipped.y * 0.5;
				const adj = Math.cos(angle) * halfHeight;
				this.angleOffset = Math.tan(angle) * adj;
				const offset = this.zOffset + this.angleOffset;
				this.position.y = Utils.getLayerZOffset(this.layer) + Utils.getDepthZOffset(this.depth) + offset;
			}
		}
	}
}
