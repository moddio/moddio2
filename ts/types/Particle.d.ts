interface ParticleData {
	// Original settings, some are used for 3D as well as 2D
	deathOpacityBase: number;
	dimensions: {
		width: number;
		height: number;
	};
	lifeBase: number;
	emitZone?: {
		x: number;
		y: number;
		z: number;
	};
	name: string;
	emitFrequency: number;
	duration: number;
	url: string;
	'z-index': {
		layer: number;
		depth: number;
		offset: number;
	};
	angle: {
		min: number;
		max: number;
	};
	speed: {
		min: number;
		max: number;
	};
	fixedRotation: boolean;

	// 3D settings
	lifetime?: { min: number; max: number };
	direction?: { x: number; y: number; z: number };
	azimuth?: { min: number; max: number };
	elevation?: { min: number; max: number };
	rotation?: { min: number; max: number };
	scale?: { x: number; y: number; start: number; step: number };
	colorStart?: string;
	colorEnd?: string;
	colorSpeed?: { min: number; max: number };
	brightness?: { min: number; max: number };
	opacity?: { start: number; end: number };
}

interface Particle {
	position: {
		x: number;
		y: number;
	};
	particleId: string;
	angle: number;
	entityId?: string;
}
