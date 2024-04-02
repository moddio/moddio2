/// <reference path="Box2D.d.ts" />
declare namespace Box2D {
	/**
	 * merge in an extra {@link b2RopeDef} property; we were unable to describe this (pointer to array of floats)
	 * with WebIDL, so created bindings to it more manually.
	 */
	export interface b2RopeDef {
		/** pointer to float */
		masses: number;
		/** @return pointer to float */
		get_masses(): number;
		/** @param masses pointer to float */
		set_masses(masses: Box2D.WrapperObject | number): void;
	}

	/**
	 * Compute the point states given two manifolds. The states pertain to the transition from manifold1
	 * to manifold2. So state1 is either persist or remove while state2 is either add or persist.
	 * @param state1 a b2PointState enum value
	 * @param state2 a b2PointState enum value
	 */
	export const b2GetPointStates: (
		state1: number,
		state2: number,
		manifold1: Box2D.b2Manifold | number,
		manifold2: Box2D.b2Manifold | number
	) => void;

	/** Compute the collision manifold between two circles. */
	export const b2CollideCircles: (
		manifold: Box2D.b2Manifold | number,
		circleA: Box2D.b2CircleShape | number,
		xfA: Box2D.b2Transform | number,
		circleB: Box2D.b2CircleShape | number,
		xfB: Box2D.b2Transform | number
	) => void;

	/** Compute the collision manifold between a polygon and a circle. */
	export const b2CollidePolygonAndCircle: (
		manifold: Box2D.b2Manifold | number,
		polygonA: Box2D.b2PolygonShape | number,
		xfA: Box2D.b2Transform | number,
		circleB: Box2D.b2CircleShape | number,
		xfB: Box2D.b2Transform | number
	) => void;

	/** Compute the collision manifold between two polygons. */
	export const b2CollidePolygons: (
		manifold: Box2D.b2Manifold | number,
		polygonA: Box2D.b2PolygonShape | number,
		xfA: Box2D.b2Transform | number,
		polygonB: Box2D.b2PolygonShape | number,
		xfB: Box2D.b2Transform | number
	) => void;

	/** Compute the collision manifold between an edge and a circle. */
	export const b2CollideEdgeAndCircle: (
		manifold: Box2D.b2Manifold | number,
		edgeA: Box2D.b2EdgeShape | number,
		xfA: Box2D.b2Transform | number,
		circleB: Box2D.b2CircleShape | number,
		xfB: Box2D.b2Transform | number
	) => void;

	/** Compute the collision manifold between an edge and a polygon. */
	export const b2CollideEdgeAndPolygon: (
		manifold: Box2D.b2Manifold | number,
		edgeA: Box2D.b2EdgeShape | number,
		xfA: Box2D.b2Transform | number,
		polygonB: Box2D.b2PolygonShape | number,
		xfB: Box2D.b2Transform | number
	) => void;

	/** Clipping for contact manifolds. */
	export const b2ClipSegmentToLine: (
		vOut: Box2D.b2ClipVertex | number,
		vIn: Box2D.b2ClipVertex | number,
		normal: Box2D.b2Vec2 | number,
		offset: number,
		vertexIndexA: number
	) => number;

	export const b2TestOverlap: {
		/** determine if two AABBs overlap */
		(a: Box2D.b2AABB | number, b: Box2D.b2AABB | number): boolean;
		/** determine if two generic shapes overlap */
		(
			shapeA: Box2D.b2Shape | number,
			indexA: number,
			shapeB: Box2D.b2Shape | number,
			indexB: number,
			xfA: Box2D.b2Transform | number,
			xfB: Box2D.b2Transform | number
		): boolean;
	};

	/**
	 * Utility to compute linear stiffness values frequency and damping ratio.
	 * The result will be written-out into the {@link stiffness} and {@link damping} parameters you provide.
	 * @example
	 * const { _malloc, _free, b2LinearStiffness, HEAPF32 } = box2D;
	 * // allocate two 4-byte floats on emscripten heap
	 * const output_p = _malloc(Float32Array.BYTES_PER_ELEMENT * 2);
	 * // give Box2D pointers to our floats on the heap, so it can mutate them
	 * b2LinearStiffness(output_p, output_p + Float32Array.BYTES_PER_ELEMENT, 0.9, 0.3, bodyA, bodyB)
	 * // create a Float32Array view over our heap offset, destructure two floats out of it
	 * const [stiffness, damping] = HEAPF32.subarray(output_p >> 2)
	 * // free the memory we allocated
	 * _free(output_p);
	 */
	export const b2LinearStiffness: (
		stiffness: Box2D.WrapperObject | number,
		damping: Box2D.WrapperObject | number,
		frequencyHertz: number,
		dampingRatio: number,
		bodyA: Box2D.b2Body | number,
		bodyB: Box2D.b2Body | number
	) => void;

	/**
	 * Utility to compute rotational stiffness values frequency and damping ratio.
	 * The result will be written-out into the {@link stiffness} and {@link damping} parameters you provide.
	 * @example
	 * const { _malloc, _free, b2AngularStiffness, HEAPF32 } = box2D;
	 * // allocate two 4-byte floats on emscripten heap
	 * const output_p = _malloc(Float32Array.BYTES_PER_ELEMENT * 2);
	 * // give Box2D pointers to our floats on the heap, so it can mutate them
	 * b2AngularStiffness(output_p, output_p + Float32Array.BYTES_PER_ELEMENT, 0.9, 0.3, bodyA, bodyB)
	 * // create a Float32Array view over our heap offset, destructure two floats out of it
	 * const [stiffness, damping] = HEAPF32.subarray(output_p >> 2)
	 * // free the memory we allocated
	 * _free(output_p);
	 */
	export const b2AngularStiffness: (
		stiffness: Box2D.WrapperObject | number,
		damping: Box2D.WrapperObject | number,
		frequencyHertz: number,
		dampingRatio: number,
		bodyA: Box2D.b2Body | number,
		bodyB: Box2D.b2Body | number
	) => void;

	/**
	 * If Box2D sends you a number, but you know it's (for example) a pointer to
	 * an array of {@link b2Vec2}: use this to convert the pointer to JS objects.
	 * @param array_p pointer to (subclass of {@link WrapperObject})
	 * @param numElements length of array
	 * @param elementSize size of an instance of the array element (in bytes)
	 * @param ctor constructor for the array element
	 */
	export const reifyArray: <
		TargetClass extends typeof WrapperObject & {
			new (...args: any[]): InstanceType<TargetClass>;
		} = typeof WrapperObject,
	>(
		array_p: number,
		numElements: number,
		elementSize: number,
		ctor: TargetClass
	) => InstanceType<TargetClass>[];

	export interface Point {
		x: number;
		y: number;
	}
	/**
	 * If you need to give to Box2D an array of Box2D.b2Vec2: use this to turn JS objects
	 * into a Box2D.b2Vec2 object (which can be used to locate an array of b2Vec2s).
	 * @param points
	 * @return Tuple containing 0: A Box2D.b2Vec2 object, whose pointer can be taken to locate an array of b2Vec2s. 1: A destructor.
	 */
	export const pointsToVec2Array: (points: Point[]) => [vectors: Box2D.b2Vec2, destroy: () => void];
	/**
	 * If you need to give to Box2D an array of Box2D.b2Vec2: use this to turn JS objects
	 * into a Box2D.b2Vec2 object (which can be used to locate an array of b2Vec2s).
	 * @param tuples
	 * @return Tuple containing 0: A Box2D.b2Vec2 object, whose pointer can be taken to locate an array of b2Vec2s. 1: A destructor.
	 */
	export const tuplesToVec2Array: (tuples: [x: number, y: number][]) => [vectors: Box2D.b2Vec2, destroy: () => void];

	/**
	 * If you need to give to Box2D an array of floats: use this to turn JS numbers
	 * into a Box2D.WrapperObject (which can be used to locate an array of floats).
	 * @param floats
	 * @return Tuple containing 0: A Box2D.WrapperObject object, whose pointer can be taken to locate an array of floats. 1: A destructor.
	 */
	export const toFloatArray: (floats: number[]) => [wrapper: Box2D.WrapperObject, destroy: () => void];

	/**
	 * Reveals the size (in bytes) of the instance constructed by any Box2D.WrapperObject subclass.
	 * Works by creating two instances, and calculating the difference between their pointers.
	 * This is not a *good* way to do this. For exploration only!
	 * @param ctor constructor for a subclass of Box2D.WrapperObject
	 * @return Size of the element which ctor constructs
	 */
	export const sizeof: <
		TargetClass extends typeof WrapperObject & {
			new (...args: any[]): InstanceType<TargetClass>;
		},
	>(
		ctor: TargetClass
	) => number;

	/**
	 * If you need to give to Box2D an output param: use this to allocate the memory. We wrap it in a
	 * Box2D.WrapperObject subclass instance, so that you can read its members once Box2D fills them in.
	 * @param ctor constructor for the array element
	 * @param elementSizeBytes Size of array element in bytes
	 * @param {number} [elements=1] Number of array elements to allocate
	 * @return Tuple containing 0: Instance of Box2D.WrapperObject subclass (i.e. your ctor), whose pointer can be taken to locate your memory. 1: A destructor.
	 */
	export const allocateArray: <
		TargetClass extends typeof WrapperObject & {
			new (...args: any[]): InstanceType<TargetClass>;
		},
	>(
		ctor: TargetClass,
		elementSizeBytes: number,
		elements?: number
	) => [wrapper: InstanceType<TargetClass>, destroy: () => void];

	/**
	 * Calling `new` on an Emscripten object does two things:
	 * - allocates memory on the emscripten heap with {@link Box2D.malloc}()
	 * - creates an Emscripten-wrapped JS object using {@link Box2D.wrapPointer}().
	 *
	 * When you're done with the Emscripten-wrapped JS object, you should {@link Box2D.destroy}() it.
	 * destroy() does two things:
	 * - invokes the class's __destroy__, which performs {@link Box2D.free}()
	 *   - this frees the dynamically-allocated memory from the WASM heap
	 * - deletes from the class's cache, the reference it retains to the Emscripten-wrapped JS object
	 *   - this eliminates a JS memory leak
	 *
	 * There's a couple of gaps here.
	 * - how should we clean up after we ourselves invoke wrapPointer()?
	 * - how should we clean up after we receive an Emscripten-wrapped JS object from a method?
	 *
	 * LeakMitigator provides helper methods to solve those gaps.
	 *
	 * @example
	 * import Box2DFactory from 'box2d-wasm';
	 * import { LeakMitigator } from 'box2d-wasm';
	 * const { b2BodyDef, b2Vec2, b2World, getPointer }: typeof Box2D & EmscriptenModule = await Box2DFactory()
	 * const { freeLeaked, recordLeak } = new LeakMitigator()
	 *
	 * // we invoked `new`; we should `destroy()` when we're done with it
	 * const gravity = new b2Vec2(0, 10)
	 *
	 * // b2World takes a copy-by-value of gravity; we are done with it
	 * const world = new b2World(gravity)
	 * // free from WASM heap + delete cached JS reference
	 * destroy(gravity)
	 *
	 * const bd_ground = new b2BodyDef()
	 *
	 * // world#CreateBody() returns a JS object built via wrapPointer
	 * // b2Body::__cache__ retains a reference to the object
	 * const ground: Box2D.b2Body = recordLeak(world.CreateBody(bd_ground))
	 *
	 * // if we have created all the bodies we need from this template, we are free to destroy it.
	 * // world#CreateBody() does not retain any reference to it (it accepts b2BodyDef via copy-by-value)
	 * destroy(bd_ground)
	 *
	 * // fast-forward to later, where we tear down the Box2D experiment...
	 *
	 * for (let body: Box2D.b2Body = world.GetBodyList(); getPointer(body) !== getPointer(NULL); body = body.GetNext()) {
	 *   // this b2Body was created with b2World#CreateBody(), so Box2D manages the memory, not us.
	 *   // we should not use destroy(body). instead we should use b2World#DestroyBody()
	 *   // this also destroys all fixtures on the body.
	 *   world.DestroyBody(body);
	 * }
	 *
	 * // delete from the __cache__ of applicable b2* classes:
	 * // every JS object reference that this LeakMitigator recorded
	 * freeLeaked()
	 */
	export class LeakMitigator {
		private readonly instances: Map<typeof Box2D.WrapperObject, Set<Box2D.WrapperObject>>;

		/**
		 * Convenience method to free an object from an Emscripten class's __cache__
		 */
		static freeFromCache: (instance: Box2D.WrapperObject, b2Class?: typeof Box2D.WrapperObject) => void;

		/**
		 * wrap this around any Emscripten method which returns an object.
		 * records the instance, so that we can free it from cache later
		 */
		recordLeak: <Instance extends Box2D.WrapperObject>(
			instance: Instance,
			b2Class?: typeof Box2D.WrapperObject
		) => Instance;

		/**
		 * prefer this over {@link Box2D.wrapPointer}.
		 * records the instance that's created, so that we can free it from cache later
		 */
		safeWrapPointer: <
			TargetClass extends typeof Box2D.WrapperObject &
				(new (...args: any[]) => InstanceType<TargetClass>) = typeof Box2D.WrapperObject,
		>(
			pointer: number,
			targetType?: TargetClass
		) => InstanceType<TargetClass>;

		/**
		 * access the cache structure of each Emscripten class for which we recorded instances,
		 * then free from cache every instance that we recorded.
		 */
		freeLeaked: () => void;
	}
}
