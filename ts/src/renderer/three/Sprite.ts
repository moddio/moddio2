namespace Renderer {
	export namespace Three {
		export class Sprite extends Node {
			sprite: THREE.Mesh;
			instancedSprite: THREE.InstancedMesh;
			idx: number;
			tex_source_uuid: string;
			texture: THREE.Texture;
			billboard = false;
			scaleUnflipped = new THREE.Vector2(1, 1);

			private depth = 1;
			private flipX = 1;
			private flipY = 1;
			private angleOffset = 0;

			constructor(
				protected tex: THREE.Texture,
				instanced = false
			) {
				super();
				const instancedMeshesData = Renderer.Three.instance().instancedMeshesData;
				this.tex_source_uuid = tex.source.uuid;
				this.texture = tex;
				if (instanced) {
					if (instancedMeshesData[tex.source.uuid] === undefined) {
						const geometry = new THREE.PlaneGeometry(0.625, 0.625);
						geometry.rotateX(-Math.PI / 2);
						const material = new THREE.MeshBasicMaterial({
							map: tex,
							transparent: true,
							alphaTest: 0.3,
						});
						this.instancedSprite = new THREE.InstancedMesh(geometry, material, 6000);
						instancedMeshesData[tex.source.uuid] = {
							positions: [[0, 0]],
							rotations: [[0, 0]],
							scales: [[0, 0]],
							mesh: this.instancedSprite,
						};

						this.instancedSprite.count = 1;
						this.idx = 0;
						this.add(this.instancedSprite);
					} else {
						instancedMeshesData[tex.source.uuid].positions.push([0, 0]);
						this.idx = instancedMeshesData[tex.source.uuid].positions.length - 1;
						instancedMeshesData[tex.source.uuid].mesh.count += 1;
					}
				} else {
					this.initSprite();
				}
			}

			initSprite() {
				const geometry = new THREE.PlaneGeometry(1, 1);
				geometry.rotateX(-Math.PI / 2);
				const material = new THREE.MeshBasicMaterial({
					map: this.texture,
					transparent: true,
					alphaTest: 0.3,
				});
				this.sprite = new THREE.Mesh(geometry, material);
				this.add(this.sprite);
			}

			removeSprite() {
				if (this.sprite) {
					this.sprite.removeFromParent();

					const cleanMaterial = (material) => {
						material.dispose();
						for (const key of Object.keys(material)) {
							const value = material[key];
							if (value && typeof value.dispose === 'function') {
								value.dispose();
							}
						}
					};

					this.sprite.traverse((object) => {
						if (!(object as THREE.Mesh).isMesh && !(object as THREE.Sprite).isSprite) return;

						const obj = object as THREE.Mesh | THREE.Sprite;

						if ((obj as THREE.Mesh).isMesh) {
							obj.geometry.dispose();
						}

						const material = obj.material as THREE.Material;

						if (material.isMaterial) {
							cleanMaterial(obj.material);
						} else {
							for (const material of obj.material as THREE.Material[]) {
								cleanMaterial(material);
							}
						}
					});

					this.sprite = undefined;
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
					Renderer.Three.editInstanceMesh(
						{
							scale: [sx * this.flipX, 1, sy * this.flipY],
						},
						mesh,
						this.idx
					);
				} else {
					this.scaleUnflipped.set(sx, sy);
					this.sprite.scale.set(this.scaleUnflipped.x * this.flipX, 1, this.scaleUnflipped.y * this.flipY);
				}
			}

			setRotationY(rad: number) {
				if (this.sprite === undefined) {
					const renderer = Renderer.Three.instance();
					const mesh = renderer.instancedMeshesData[this.tex_source_uuid].mesh;
					Renderer.Three.editInstanceMesh(
						{
							rotation: [0, rad, 0],
						},
						mesh,
						this.idx
					);
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
					Renderer.Three.editInstanceMesh(
						{
							position: [0, Utils.getDepthZOffset(this.depth), 0],
						},
						mesh,
						this.idx
					);
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
