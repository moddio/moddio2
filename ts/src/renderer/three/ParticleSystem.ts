namespace Renderer {
	export namespace Three {
		export class ParticleSystem extends Node {
			emitters: Emitter[] = [];

			private particles = [];

			private textures = gAssetManager.getTexturesContaining('particle');

			// NOTE(nick): Use groups/buckets to get around the max 16 textures shader
			// limit. There are others way to do this but because textures can have a
			// variaty of sizes this seemed like the easier solution. I tried addGroup()
			// on the InstancedBufferGeometry before but that didn't seem to work :(
			private materials: THREE.ShaderMaterial[] = [];
			private geometries: THREE.InstancedBufferGeometry[] = [];
			private maxTexturesPerGroup = 16;
			private numTextureGroups;

			// Used during particle creation; avoid instantiating temp objects
			private worldPos = new THREE.Vector3();
			private forward = new THREE.Vector3();
			private right = new THREE.Vector3();
			private _up = new THREE.Vector3();
			private basis = new THREE.Matrix4();
			private velocity = new THREE.Vector3();

			constructor() {
				super();

				const maxParticlesPerGroup = 50000;

				this.numTextureGroups = Math.floor(this.textures.length / this.maxTexturesPerGroup);
				if (this.numTextureGroups === 0) this.numTextureGroups = 1;

				for (let i = 0; i < this.numTextureGroups; i++) {
					const material = new THREE.ShaderMaterial({
						uniforms: {
							textures: {
								value: this.textures.slice(
									i * this.maxTexturesPerGroup,
									i * this.maxTexturesPerGroup + this.maxTexturesPerGroup
								),
							},
							time: { value: 0 },
						},
						vertexShader: vs,
						fragmentShader: fs,
						transparent: true,
						depthWrite: false,
						blending: THREE.CustomBlending,
						blendEquation: THREE.AddEquation,
						blendSrc: THREE.OneFactor,
						blendDst: THREE.OneMinusSrcAlphaFactor,
						forceSinglePass: true,
					});

					this.materials.push(material);

					const geometry = new THREE.InstancedBufferGeometry();

					geometry.setAttribute(
						'position',
						new THREE.Float32BufferAttribute(
							[-0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0],
							3
						)
					);
					geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0], 2));

					const createInstancedAttribute = (size: number, step: number) => {
						return new THREE.InstancedBufferAttribute(new Float32Array(size * step), step).setUsage(
							THREE.DynamicDrawUsage
						);
					};

					const createInstancedAttributeInt = (size: number, step: number) => {
						return new THREE.InstancedBufferAttribute(new Int32Array(size * step), step).setUsage(
							THREE.DynamicDrawUsage
						);
					};

					geometry.setAttribute('offset', createInstancedAttribute(maxParticlesPerGroup, 3));
					geometry.setAttribute('scale', createInstancedAttribute(maxParticlesPerGroup, 2));
					geometry.setAttribute('rotation', createInstancedAttribute(maxParticlesPerGroup, 1));
					geometry.setAttribute('color', createInstancedAttribute(maxParticlesPerGroup, 4));
					geometry.setAttribute('blend', createInstancedAttribute(maxParticlesPerGroup, 1));
					geometry.setAttribute('texture', createInstancedAttributeInt(maxParticlesPerGroup, 1));

					this.geometries.push(geometry);

					const points = new THREE.Mesh(geometry, material);
					points.frustumCulled = false;
					points.matrixAutoUpdate = false;
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					points.updateMatrixWorld = function () {};
					points.renderOrder = 498; // Higher than entities, lower than HUD

					this.add(points);
				}
			}

			createEmitter(config: Particle) {
				const particleData = taro.game.data.particleTypes[config.particleId];
				const tex = gAssetManager.getTexture(`particle/${particleData.url}`);

				let zPosition = 0;
				if (particleData['z-index'].layer) zPosition += Utils.getLayerZOffset(particleData['z-index'].layer);
				if (particleData['z-index'].depth) zPosition += Utils.getDepthZOffset(particleData['z-index'].depth);
				if (particleData['z-index'].offset) zPosition += Utils.pixelToWorld(particleData['z-index'].offset);

				const xAngle = Utils.deg2rad(+particleData.direction?.x ?? 0);
				const yAngle = Utils.deg2rad(+particleData.direction?.z ?? 0);
				const zAngle = Utils.deg2rad(+particleData.direction?.y ?? 0);
				const direction = new THREE.Euler(xAngle, yAngle, zAngle, 'XYZ');
				const dirVec = new THREE.Vector3(1, 0, 0);
				dirVec.applyEuler(direction);
				direction.x = dirVec.x;
				direction.y = dirVec.y;
				direction.z = dirVec.z;

				const azimuthMin = Utils.deg2rad(+particleData.azimuth?.min ?? 0);
				const azimuthMax = Utils.deg2rad(+particleData.azimuth?.max ?? 0);

				const elevationMin = Utils.deg2rad(+particleData.elevation?.min ?? 0);
				const elevationMax = Utils.deg2rad(+particleData.elevation?.max ?? 0);

				const lifetimeFrom = (+particleData.lifetime?.min || 1000) / 1000 ?? 1;
				const lifetimeTo = (+particleData.lifetime?.max || 1000) / 1000 ?? 1;

				const emitting = false;

				const frequency = 1 / +particleData.emitFrequency ?? 10;

				const shape = {
					width: particleData.emitZone?.x ?? 0,
					height: particleData.emitZone?.z ?? 0,
					depth: particleData.emitZone?.y ?? 0,
				};

				const rotation = {
					min: Utils.deg2rad(+particleData.rotation?.min ?? 0),
					max: Utils.deg2rad(+particleData.rotation?.max ?? 0),
				};

				const speed = {
					min: +particleData.speed?.min ?? 0,
					max: +particleData.speed?.max ?? 0,
				};

				const scale = {
					x: +particleData.scale?.x ?? 1,
					y: +particleData.scale?.y ?? 1,
					start: 1,
					step: +particleData.scale?.step ?? 0,
				};

				const startColor = Utils.hexToRgb(particleData.colorStart);
				const endColor = Utils.hexToRgb(particleData.colorEnd);
				const colorSpeed = {
					min: +particleData.colorSpeed?.min ?? 1,
					max: +particleData.colorSpeed?.max ?? 1,
				};

				const brightness = {
					min: +particleData.brightness?.min ?? 1,
					max: +particleData.brightness?.max ?? 1,
				};

				const opacity = {
					start: +particleData.opacity?.start ?? 1,
					end: +particleData.opacity?.end ?? 1,
				};

				const duration = +particleData.duration / 1000 ?? 1;

				return {
					particleTypeId: config.particleId,
					position: { x: config.position.x, y: zPosition, z: config.position.y },
					target: undefined,
					direction: { x: direction.x, y: direction.y, z: direction.z },
					azimuth: { min: azimuthMin, max: azimuthMax },
					elevation: { min: elevationMin, max: elevationMax },
					shape,
					addInterval: frequency,
					lifetime: { min: lifetimeFrom, max: lifetimeTo },
					rotation,
					speed,
					scale,
					color: { start: [startColor.r, startColor.g, startColor.b], end: [endColor.r, endColor.g, endColor.b] },
					color_speed: colorSpeed,
					brightness: brightness,
					opacity: opacity,
					blend: 1,
					texture: tex,
					emitting,
					duration,
				};
			}

			emit(emitterConfig: Emitter) {
				const internalConfig = {
					elapsed: 0,
					accumulator: 0,
					hasTarget: !!emitterConfig.target,
				};

				this.emitters.push({ ...internalConfig, ...emitterConfig });
			}

			update(dt: number, time: number, camera: THREE.Camera) {
				const emittersIndicesMarkedForDestroy = [];

				for (let i = 0; i < this.emitters.length; i++) {
					const emitter = this.emitters[i] as EmitterInternal;

					emitter.elapsed += dt;

					const isTimeUp = emitter.duration > 0 && emitter.elapsed >= emitter.duration;
					if (isTimeUp) {
						emitter.emitting = false;
					}

					const isOrphan = emitter.hasTarget && !emitter.target;
					if (isOrphan) {
						emittersIndicesMarkedForDestroy.push(i);
						continue;
					}

					if (emitter.target) {
						emitter.target.getWorldPosition(this.worldPos);
						emitter.position.x = this.worldPos.x;
						emitter.position.z = this.worldPos.z;
					}
				}

				for (const idx of emittersIndicesMarkedForDestroy) {
					this.emitters.splice(idx, 1);
				}

				this.updateEmitters(dt);

				const count = this.particles.length;
				const x = camera.position.x;
				const y = camera.position.y;
				const z = camera.position.z;
				for (var n = 0; n < count; n++) {
					const offset = this.particles[n].offset;
					this.particles[n].dSq = Math.pow(x - offset[0], 2) + Math.pow(y - offset[1], 2) + Math.pow(z - offset[2], 2);
				}
				this.particles.sort((a, b) => b.dSq - a.dSq);

				const texGroups = [];
				for (let i = 0; i < this.numTextureGroups; i++) {
					texGroups.push([]);
				}

				for (var n = 0; n < count; n++) {
					const particle = this.particles[n];
					let texIdx = this.textures.findIndex((tex) => tex === particle.texture);
					if (texIdx === -1) texIdx = 0;
					particle.texIdx = texIdx % this.maxTexturesPerGroup;
					texGroups[Math.floor(texIdx / this.maxTexturesPerGroup)].push(particle);
				}

				for (let i = 0; i < this.numTextureGroups; i++) {
					const texGroup = texGroups[i];

					const offsetAttribute = this.geometries[i].attributes.offset.array;
					const scaleAttribute = this.geometries[i].attributes.scale.array;
					const rotationAttribute = this.geometries[i].attributes.rotation.array;
					const colorAttribute = this.geometries[i].attributes.color.array;
					const blendAttribute = this.geometries[i].attributes.blend.array;
					const textureAttribute = this.geometries[i].attributes.texture.array;

					for (let j = 0; j < texGroup.length; j++) {
						const particle = texGroup[j];
						offsetAttribute[j * 3 + 0] = particle.offset[0];
						offsetAttribute[j * 3 + 1] = particle.offset[1];
						offsetAttribute[j * 3 + 2] = particle.offset[2];

						scaleAttribute[j * 2 + 0] = particle.scale[0];
						scaleAttribute[j * 2 + 1] = particle.scale[1];

						rotationAttribute[j] = particle.rotation;

						colorAttribute[j * 4 + 0] = particle.color[0];
						colorAttribute[j * 4 + 1] = particle.color[1];
						colorAttribute[j * 4 + 2] = particle.color[2];
						colorAttribute[j * 4 + 3] = particle.color[3];
						blendAttribute[j] = particle.blend;

						textureAttribute[j] = particle.texIdx;
					}

					this.geometries[i].attributes.offset.needsUpdate = true;
					this.geometries[i].attributes.scale.needsUpdate = true;
					this.geometries[i].attributes.rotation.needsUpdate = true;
					this.geometries[i].attributes.color.needsUpdate = true;
					this.geometries[i].attributes.blend.needsUpdate = true;
					this.geometries[i].attributes.texture.needsUpdate = true;

					this.geometries[i].instanceCount = texGroup.length;
				}

				for (const material of this.materials) {
					material.uniforms.time.value = time;
				}
			}

			updateEmitters(delta: number) {
				for (let n = 0; n < this.emitters.length; n++) {
					const emitter = this.emitters[n] as EmitterInternal;

					if (!emitter.emitting) continue;

					emitter.accumulator += delta;

					if (emitter.addInterval > 0) {
						// NOTE(nick): Avoids spawning to particles too fast; it has to be seen
						// depending on user feedback if this is an acceptable limit.
						const addInterval = emitter.addInterval < 0.0001 ? 0.0001 : emitter.addInterval;
						while (emitter.accumulator >= addInterval) {
							emitter.accumulator -= addInterval;
							this.emitterEmit(emitter, delta);
						}
					} else {
						this.emitterEmit(emitter, delta);
					}
				}

				let i = 0;
				for (let n = 0; n < this.particles.length; n++) {
					const particle = this.particles[n];

					if (particle.live > 0) {
						particle.live -= delta;

						// NOTE(nick): Decreases opacity during particle's lifetime, this is how
						// it currently works in the Phaser renderer. We might want to add more
						// control to this in the future and give users more emitter settings to
						// play with in the editor.
						let t = (particle.lifetime - particle.live) / particle.lifetime;
						particle.color[3] = Utils.lerp(particle.opacity_from, particle.opacity_to, t);

						if (particle.color_t < 1) {
							const p = particle;
							particle.color[0] = p.color_from[0] + (p.color_to[0] - p.color_from[0]) * p.color_t;
							particle.color[1] = p.color_from[1] + (p.color_to[1] - p.color_from[1]) * p.color_t;
							particle.color[2] = p.color_from[2] + (p.color_to[2] - p.color_from[2]) * p.color_t;
							particle.color_t += delta * particle.color_speed;
						} else {
							particle.color[0] = particle.color_to[0];
							particle.color[1] = particle.color_to[1];
							particle.color[2] = particle.color_to[2];
						}

						particle.offset[0] += particle.velocity[0];
						particle.offset[1] += particle.velocity[1];
						particle.offset[2] += particle.velocity[2];

						particle.scale[0] += particle.scale_increase;
						particle.scale[1] += particle.scale_increase;

						this.particles[i] = particle;

						i++;
					}
				}

				this.particles.length = i;
			}

			emitterEmit(emitter: Emitter, dt: number) {
				this.forward.set(emitter.direction.x, emitter.direction.y, emitter.direction.z).normalize();
				this.right.crossVectors({ x: 0, y: 1, z: 0 } as THREE.Vector3, this.forward).normalize();
				if (this.forward.x <= Number.EPSILON && this.forward.z <= Number.EPSILON) {
					this.right.set(0, 0, -1);
				}
				this._up.crossVectors(this.forward, this.right).normalize();
				this.basis.makeBasis(this.right, this._up, this.forward);

				const randAzimuth = Utils.lerp(emitter.azimuth.min, emitter.azimuth.max, Math.random());
				const randElevation = Utils.lerp(emitter.elevation.min, emitter.elevation.max, Math.random());
				const angleOffset = Math.PI * 0.5;
				const speed = Utils.lerp(emitter.speed.min, emitter.speed.max, Math.random()) * dt;

				this.velocity
					.setFromSphericalCoords(1, angleOffset - randElevation, -randAzimuth)
					.normalize()
					.applyMatrix4(this.basis)
					.multiplyScalar(speed);

				const brightness = Utils.lerp(emitter.brightness.min, emitter.brightness.max, Math.random());

				const offset = {
					x: emitter.shape.width * Math.random() - emitter.shape.width * 0.5,
					y: emitter.shape.height * Math.random() - emitter.shape.height * 0.5,
					z: emitter.shape.depth * Math.random() - emitter.shape.depth * 0.5,
				};

				const targetAngle = -emitter.target.body.rotation.y;
				const tempX = offset.x;
				offset.x = offset.x * Math.cos(targetAngle) - offset.z * Math.sin(targetAngle);
				offset.z = tempX * Math.sin(targetAngle) + offset.z * Math.cos(targetAngle);

				const position = {
					x: emitter.position.x + offset.x,
					y: emitter.position.y + offset.y,
					z: emitter.position.z + offset.z,
				};

				const lifetime = Utils.lerp(emitter.lifetime.min, emitter.lifetime.max, Math.random());

				this.particles.push({
					offset: [position.x, position.y, position.z],
					velocity: [this.velocity.x, this.velocity.y, this.velocity.z],
					lifetime: lifetime,
					live: lifetime,
					scale: [emitter.scale.x * emitter.scale.start, emitter.scale.y * emitter.scale.start],
					scale_increase: emitter.scale.step,
					rotation: Utils.lerp(emitter.rotation.min, emitter.rotation.max, Math.random()),
					color: [1, 1, 1, emitter.opacity.start],
					color_from: [
						emitter.color.start[0] * brightness,
						emitter.color.start[1] * brightness,
						emitter.color.start[2] * brightness,
					],
					color_to: [
						emitter.color.end[0] * brightness,
						emitter.color.end[1] * brightness,
						emitter.color.end[2] * brightness,
					],
					color_speed: Utils.lerp(emitter.color_speed.min, emitter.color_speed.max, Math.random()),
					color_t: 0,
					blend: emitter.blend,
					texture: emitter.texture,
					opacity_from: emitter.opacity.start,
					opacity_to: emitter.opacity.end,
				});
			}

			startEmitter(emitter: Emitter) {
				const e = emitter as EmitterInternal;
				if (e) {
					e.emitting = true;
					e.elapsed = 0;
				}
			}

			stopEmitter(emitter: Emitter) {
				const e = emitter as EmitterInternal;
				if (e) {
					e.emitting = false;
				}
			}

			destroyEmittersWithTarget(target: Unit) {
				const emitterIndicesMarkedForDestroy = [];

				for (let i = 0; i < this.emitters.length; i++) {
					if (this.emitters[i].target === target) {
						emitterIndicesMarkedForDestroy.push(i);
					}
				}

				for (const idx of emitterIndicesMarkedForDestroy) {
					this.emitters.splice(idx, 1);
				}
			}
		}

		const vs = `
  attribute vec3 offset;
  attribute vec2 scale;
  attribute float rotation;
  attribute vec4 color;
  attribute float blend;
  attribute int texture;

  uniform float time;

  varying vec2 vUv;
  varying vec4 vColor;
  varying float vBlend;
  flat varying int vTexture;

  void main() {
    vUv = uv;
    vColor = color;
    vBlend = blend;
    vTexture = texture;

    float angle = time * rotation;
    vec2 vRotated = vec2(position.x * cos(angle) - position.y * sin(angle), position.y * cos(angle) + position.x * sin(angle));

    // https://www.opengl-tutorial.org/intermediate-tutorials/billboards-particles/billboards/
    vec3 cameraRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 cameraUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 pos = offset + cameraRight * vRotated.x * scale.x + cameraUp * vRotated.y * scale.y;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

		const fs = `
  uniform sampler2D textures[16];

  varying vec2 vUv;
  varying vec4 vColor;
  varying float vBlend;
  flat varying int vTexture;

  void main() {
    if (vTexture == 0) gl_FragColor = texture2D(textures[0], vUv) * vColor;
    else if (vTexture == 1) gl_FragColor = texture2D(textures[1], vUv) * vColor;
    else if (vTexture == 2) gl_FragColor = texture2D(textures[2], vUv) * vColor;
    else if (vTexture == 3) gl_FragColor = texture2D(textures[3], vUv) * vColor;
    else if (vTexture == 4) gl_FragColor = texture2D(textures[4], vUv) * vColor;
    else if (vTexture == 5) gl_FragColor = texture2D(textures[5], vUv) * vColor;
    else if (vTexture == 6) gl_FragColor = texture2D(textures[6], vUv) * vColor;
    else if (vTexture == 7) gl_FragColor = texture2D(textures[7], vUv) * vColor;
    else if (vTexture == 8) gl_FragColor = texture2D(textures[8], vUv) * vColor;
    else if (vTexture == 9) gl_FragColor = texture2D(textures[9], vUv) * vColor;
    else if (vTexture == 10) gl_FragColor = texture2D(textures[10], vUv) * vColor;
    else if (vTexture == 11) gl_FragColor = texture2D(textures[11], vUv) * vColor;
    else if (vTexture == 12) gl_FragColor = texture2D(textures[12], vUv) * vColor;
    else if (vTexture == 13) gl_FragColor = texture2D(textures[13], vUv) * vColor;
    else if (vTexture == 14) gl_FragColor = texture2D(textures[14], vUv) * vColor;
    else if (vTexture == 15) gl_FragColor = texture2D(textures[15], vUv) * vColor;

    gl_FragColor.rgb *= gl_FragColor.a;
	gl_FragColor.a *= vBlend;

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

		export type Emitter = {
			particleTypeId: string;
			position: { x: number; y: number; z: number };
			target: Unit | undefined;
			direction: { x: number; y: number; z: number };
			azimuth: { min: number; max: number };
			elevation: { min: number; max: number };
			shape: { width: number; height: number; depth: number };
			addInterval: number;
			lifetime: { min: number; max: number };
			rotation: { min: number; max: number };
			speed: { min: number; max: number };
			scale: { x: number; y: number; start: number; step: number };
			color: { start: number[]; end: number[] };
			color_speed: { min: number; max: number };
			brightness: { min: number; max: number };
			opacity: { start: number; end: number };
			blend: number;
			texture: THREE.Texture;
			emitting: boolean;
			duration: number;
		};

		export type EmitterInternal = {
			elapsed: number;
			accumulator: number;
			hasTarget: boolean;
		} & Emitter;
	}
}
