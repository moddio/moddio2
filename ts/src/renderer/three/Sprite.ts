namespace Renderer {
	export namespace Three {
		export class Sprite extends Node {
			sprite: THREE.InstancedMesh;
			idx: number;
			tex_source_uuid: string;
			billboard = false;
			scaleUnflipped = new THREE.Vector2(1, 1);

			private depth = 1;
			private flipX = 1;
			private flipY = 1;
			private angleOffset = 0;

			constructor(protected tex: THREE.Texture) {
				super();
				const instancedMeshesData = Renderer.Three.instance().instancedMeshesData;
				this.tex_source_uuid = tex.source.uuid;
				if (instancedMeshesData[tex.source.uuid] === undefined) {
					const geometry = new THREE.PlaneGeometry(1, 1);
					geometry.rotateX(-Math.PI / 2);
					const material = new THREE.MeshBasicMaterial({
						map: tex,
						transparent: true,
						alphaTest: 0.3,
					});
					this.sprite = new THREE.InstancedMesh(geometry, material, 6000);
					instancedMeshesData[tex.source.uuid] = {
						positions: [[0, 0]],
						rotations: [[0, 0]],
						scales: [[0, 0]],
						mesh: this.sprite,
					};

					this.sprite.count = 1;
					this.idx = 0;
					this.add(this.sprite);
				} else {
					instancedMeshesData[tex.source.uuid].positions.push([0, 0]);
					this.idx = instancedMeshesData[tex.source.uuid].positions.length - 1;
					instancedMeshesData[tex.source.uuid].mesh.count += 1;
				}
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
				if (this.sprite === undefined) {
					const renderer = Renderer.Three.instance();
					const mesh = renderer.instancedMeshesData[this.tex_source_uuid].mesh;
					const dummy = new THREE.Object3D();
					dummy.scale.set(sx * this.flipX, 1, sy * this.flipY);
					dummy.updateMatrix();
					if (mesh.count < this.idx) {
						mesh.count = this.idx;
					}
					mesh.setMatrixAt(this.idx, dummy.matrix);
				} else {
					this.scaleUnflipped.set(sx, sy);
					this.sprite.scale.set(this.scaleUnflipped.x * this.flipX, 1, this.scaleUnflipped.y * this.flipY);
				}
			}

			setRotationY(rad: number) {
				if (this.sprite === undefined) {
					const renderer = Renderer.Three.instance();
					const mesh = renderer.instancedMeshesData[this.tex_source_uuid].mesh;
					const dummy = new THREE.Object3D();
					dummy.rotation.y = rad;
					dummy.updateMatrix();
					if (mesh.count < this.idx) {
						mesh.count = this.idx;
					}
					mesh.setMatrixAt(this.idx, dummy.matrix);
				} else {
					this.sprite.rotation.y = rad;
				}
			}

			setDepth(depth: number) {
				this.depth = depth;
				this.calcRenderOrder();
			}

			setTexture(tex: THREE.Texture) {
				//|| (this.sprite.count !== 1 && this.idx === 0)
				if (this.sprite === undefined) {
					const renderer = Renderer.Three.instance();
					const mesh = renderer.instancedMeshesData[this.tex_source_uuid].mesh;
					(mesh.material as THREE.MeshBasicMaterial).map = tex;
				} else {
					(this.sprite.material as THREE.MeshBasicMaterial).map = tex;
				}
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
				if (this.sprite === undefined) {
					const renderer = Renderer.Three.instance();
					const mesh = renderer.instancedMeshesData[this.tex_source_uuid].mesh;
					const dummy = new THREE.Object3D();
					dummy.position.y = Utils.getDepthZOffset(this.depth);
					dummy.updateMatrix();
					if (mesh.count < this.idx) {
						mesh.count = this.idx;
					}
					mesh.setMatrixAt(this.idx, dummy.matrix);
				} else {
					this.sprite.position.y = Utils.getDepthZOffset(this.depth);
				}
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
