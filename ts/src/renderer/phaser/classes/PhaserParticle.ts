class PhaserParticle extends Phaser.GameObjects.Particles.ParticleEmitter {
	target: string;
	particleId: string;
	scene: GameScene;

	constructor(scene: GameScene, particle: Particle) {
		let particleData = taro.game.data.particleTypes[particle.particleId];
		//@ts-ignore //there seems to be an issue with phaser's type def for particleEmitter
		super(
			scene,
			//@ts-ignore
			particle.position.x,
			//@ts-ignore
			particle.position.y,
			//@ts-ignore
			`particle/${particleData.url}`,
			//@ts-ignore
			PhaserParticle.createConfig(scene, particleData, particle.angle)
		);

		if (particle.entityId) {
			let entity = scene.findEntity(particle.entityId);
			if (entity) {
				entity.attachedParticles.push(this);
				this.target = particle.entityId;
				this.startFollow(entity.gameObject);
			}
		}

		this.scene = scene;
		this.particleId = particle.particleId;

		this.setDepth(particleData['z-index'].depth);
		scene.entityLayers[particleData['z-index'].layer - 1].add(this);
	}

	static createConfig(
		scene: GameScene,
		data: ParticleData,
		angle: number
	): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
		if (data) {
			let frame = scene.textures.getFrame(`particle/${data.url}`);
			let config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
				angle: (particle, key, value) => {
					let direction = Math.floor(Math.random() * (data.angle.max - data.angle.min + 1) + data.angle.min) + angle;
					particle.angle = data.fixedRotation ? 0 : direction;
					return direction - 90;
				},
				rotate: (particle, key, value) => {
					return value;
				},
				speed: { min: data.speed.min, max: data.speed.max },
				lifespan: data.lifeBase,
				alpha: { start: 1, end: data.deathOpacityBase },
				name: data.name,
				duration: data.duration,
				frequency: data.emitFrequency,
				scaleX: data.dimensions.width / frame.width,
				scaleY: data.dimensions.height / frame.height,
				emitting: false,
			};

			if (data.emitZone && data.emitZone.x && data.emitZone.y) {
				config.emitZone = new Phaser.GameObjects.Particles.Zones.RandomZone(
					new Phaser.Geom.Rectangle(-data.emitZone.x / 2, -data.emitZone.y / 2, data.emitZone.x, data.emitZone.y)
				);
			}

			return config;
		}
	}
}
