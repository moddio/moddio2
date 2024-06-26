namespace Renderer {
	export namespace Three {
		export class Sprite extends Node {
			sprite: THREE.Mesh;
			billboard = false;
			scaleUnflipped = new THREE.Vector2(1, 1);

			private depth = 1;
			private flipX = 1;
			private flipY = 1;
			private angleOffset = 0;

			constructor(protected tex: THREE.Texture) {
				super();

				const geometry = new THREE.PlaneGeometry(1, 1);
				geometry.rotateX(-Math.PI / 2);
				const material = new THREE.MeshBasicMaterial({
					map: tex,
					transparent: true,
					alphaTest: 0.3,
				});
				this.sprite = new THREE.Mesh(geometry, material);
				const line = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ linewidth: 2, color: 0xffffff }))
				line.visible = false;
				this.sprite.add(line)
				this.add(this.sprite);
			}

			setBillboard(billboard: boolean, camera: Camera) {
				this.billboard = billboard;
				if (this.billboard) {
					this.faceCamera(camera);
					this.correctZOffsetBasedOnCameraAngle();
				} else {
					this.resetRotation();
				}
			}

			setOpacity(opacity: number, time = undefined) {
				(this.sprite.material as THREE.Material).opacity = opacity;
				if (time !== undefined) {
					setTimeout(() => {
						(this.sprite.material as THREE.Material).opacity = 1;
					}, time);
				}
			}

			/*setColor(color: number, time = 0) {
				console.log('setColor', color, time, this.sprite);
				this.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						// Convert to basic material to avoid lighting
						/*const material = new THREE.MeshBasicMaterial();
						THREE.MeshBasicMaterial.prototype.copy.call(material, child.material);
						child.material = material;*/
			/*const originalColor = child.material.color.getHex();
						child.material.color.setHex(color);
						child.material.needsUpdate = true;
						child.material.opacity = 0.5;
						if (time > 0) {
							setTimeout(() => {
								child.material.color.setHex(originalColor);
								child.material.opacity = 1;
							}, time);
						}
					}
				});
			}*/

			setScale(sx: number, sy: number) {
				this.scaleUnflipped.set(sx, sy);
				this.sprite.scale.set(this.scaleUnflipped.x * this.flipX, 1, this.scaleUnflipped.y * this.flipY);
			}

			setRotationY(rad: number) {
				this.sprite.rotation.y = rad;
			}

			setDepth(depth: number) {
				this.depth = depth;
				this.calcRenderOrder();
			}

			setTexture(tex: THREE.Texture) {
				(this.sprite.material as THREE.MeshBasicMaterial).map = tex;
			}

			setFlip(x: boolean, y: boolean) {
				this.flipX = x ? -1 : 1;
				this.flipY = y ? -1 : 1;
				this.setScale(this.scaleUnflipped.x, this.scaleUnflipped.y);
			}

			getSize() {
				return { width: this.scaleUnflipped.x, height: this.scaleUnflipped.y };
			}

			getSizeInPixels() {
				return { width: Utils.worldToPixel(this.scaleUnflipped.x), height: Utils.worldToPixel(this.scaleUnflipped.y) };
			}

			update(_dt: number) {
				if (this.billboard) {
					this.faceCamera(Three.instance().camera);
					this.correctZOffsetBasedOnCameraAngle();
				}


				const parent = this.parent as Unit | Item;
				const isOwnedItem = parent && parent instanceof Item && parent.ownerUnit;
				if (isOwnedItem) {
					this.position.y = parent.ownerUnit.body.position.y;
				}
			}

			private calcRenderOrder() {
				this.sprite.position.y = Utils.getDepthZOffset(this.depth);
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
				const offset = this.angleOffset;

				const parent = this.parent as Unit | Item;
				const isNotItemOrUnownedItem =
					(parent && !(parent instanceof Item)) || (parent && parent instanceof Item && !parent.ownerUnit);

				if (isNotItemOrUnownedItem) {
					this.position.y = Utils.getDepthZOffset(this.depth) + offset;
				}
			}

			private resetRotation() {
				this.rotation.set(0, 0, 0);
				this.calcRenderOrder();
			}
		}
	}
}
