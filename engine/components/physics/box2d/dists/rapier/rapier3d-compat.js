'use strict';
var RAPIER = (() => {
	let A;
	if (typeof exports !== 'object') {
		var exports = {};
	}
	Object.defineProperty(exports, '__esModule', { value: !0 });
	const I = new Array(128).fill(void 0);
	I.push(void 0, null, !0, !1);
	let g = I.length;
	function C(A) {
		g === I.length && I.push(I.length + 1);
		const C = g;
		return (g = I[C]), (I[C] = A), C;
	}
	function B(A) {
		return I[A];
	}
	function Q(A) {
		const C = B(A);
		return (
			(function (A) {
				A < 132 || ((I[A] = g), (g = A));
			})(A),
			C
		);
	}
	function E(A) {
		return null == A;
	}
	let i = null;
	function D() {
		return (null !== i && 0 !== i.byteLength) || (i = new Float64Array(A.memory.buffer)), i;
	}
	let o = null;
	function G() {
		return (null !== o && 0 !== o.byteLength) || (o = new Int32Array(A.memory.buffer)), o;
	}
	const w =
		'undefined' != typeof TextDecoder
			? new TextDecoder('utf-8', { ignoreBOM: !0, fatal: !0 })
			: {
					decode: () => {
						throw Error('TextDecoder not available');
					},
				};
	'undefined' != typeof TextDecoder && w.decode();
	let S = null;
	function k(I, g) {
		return (
			(I >>>= 0),
			w.decode(((null !== S && 0 !== S.byteLength) || (S = new Uint8Array(A.memory.buffer)), S).subarray(I, I + g))
		);
	}
	function a(A, I) {
		if (!(A instanceof I)) throw new Error(`expected instance of ${I.name}`);
		return A.ptr;
	}
	let h = null;
	function K() {
		return (null !== h && 0 !== h.byteLength) || (h = new Float32Array(A.memory.buffer)), h;
	}
	let U = 128;
	function J(A) {
		if (1 == U) throw new Error('out of js stack');
		return (I[--U] = A), U;
	}
	function y(A, I) {
		return (A >>>= 0), K().subarray(A / 4, A / 4 + I);
	}
	let N = null;
	function M() {
		return (null !== N && 0 !== N.byteLength) || (N = new Uint32Array(A.memory.buffer)), N;
	}
	let F = 0;
	function q(A, I) {
		const g = I(4 * A.length, 4) >>> 0;
		return K().set(A, g / 4), (F = A.length), g;
	}
	function R(A, I) {
		const g = I(4 * A.length, 4) >>> 0;
		return M().set(A, g / 4), (F = A.length), g;
	}
	function s(I, g) {
		try {
			return I.apply(this, g);
		} catch (I) {
			A.__wbindgen_exn_store(C(I));
		}
	}
	Object.freeze({
		Dynamic: 0,
		0: 'Dynamic',
		Fixed: 1,
		1: 'Fixed',
		KinematicPositionBased: 2,
		2: 'KinematicPositionBased',
		KinematicVelocityBased: 3,
		3: 'KinematicVelocityBased',
	}),
		Object.freeze({ Vertex: 0, 0: 'Vertex', Edge: 1, 1: 'Edge', Face: 2, 2: 'Face', Unknown: 3, 3: 'Unknown' }),
		Object.freeze({ AccelerationBased: 0, 0: 'AccelerationBased', ForceBased: 1, 1: 'ForceBased' });
	const c = Object.freeze({
			Ball: 0,
			0: 'Ball',
			Cuboid: 1,
			1: 'Cuboid',
			Capsule: 2,
			2: 'Capsule',
			Segment: 3,
			3: 'Segment',
			Polyline: 4,
			4: 'Polyline',
			Triangle: 5,
			5: 'Triangle',
			TriMesh: 6,
			6: 'TriMesh',
			HeightField: 7,
			7: 'HeightField',
			Compound: 8,
			8: 'Compound',
			ConvexPolyhedron: 9,
			9: 'ConvexPolyhedron',
			Cylinder: 10,
			10: 'Cylinder',
			Cone: 11,
			11: 'Cone',
			RoundCuboid: 12,
			12: 'RoundCuboid',
			RoundTriangle: 13,
			13: 'RoundTriangle',
			RoundCylinder: 14,
			14: 'RoundCylinder',
			RoundCone: 15,
			15: 'RoundCone',
			RoundConvexPolyhedron: 16,
			16: 'RoundConvexPolyhedron',
			HalfSpace: 17,
			17: 'HalfSpace',
		}),
		Y = Object.freeze({
			X: 0,
			0: 'X',
			Y: 1,
			1: 'Y',
			Z: 2,
			2: 'Z',
			AngX: 3,
			3: 'AngX',
			AngY: 4,
			4: 'AngY',
			AngZ: 5,
			5: 'AngZ',
		}),
		H = Object.freeze({
			Revolute: 0,
			0: 'Revolute',
			Fixed: 1,
			1: 'Fixed',
			Prismatic: 2,
			2: 'Prismatic',
			Rope: 3,
			3: 'Rope',
			Spring: 4,
			4: 'Spring',
			Spherical: 5,
			5: 'Spherical',
			Generic: 6,
			6: 'Generic',
		});
	class l {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(l.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawbroadphase_free(I);
		}
		constructor() {
			const I = A.rawbroadphase_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
	}
	class L {
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawccdsolver_free(I);
		}
		constructor() {
			const I = A.rawccdsolver_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
	}
	class t {
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawcharactercollision_free(I);
		}
		constructor() {
			const I = A.rawcharactercollision_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		handle() {
			return A.rawcharactercollision_handle(this.__wbg_ptr);
		}
		translationDeltaApplied() {
			const I = A.rawcharactercollision_translationDeltaApplied(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		translationDeltaRemaining() {
			const I = A.rawcharactercollision_translationDeltaRemaining(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		toi() {
			return A.rawcharactercollision_toi(this.__wbg_ptr);
		}
		worldWitness1() {
			const I = A.rawcharactercollision_worldWitness1(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		worldWitness2() {
			const I = A.rawcharactercollision_worldWitness2(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		worldNormal1() {
			const I = A.rawcharactercollision_worldNormal1(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		worldNormal2() {
			const I = A.rawcharactercollision_worldNormal2(this.__wbg_ptr);
			return DA.__wrap(I);
		}
	}
	class p {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(p.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawcolliderset_free(I);
		}
		coTranslation(I) {
			const g = A.rawcolliderset_coTranslation(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		coRotation(I) {
			const g = A.rawcolliderset_coRotation(this.__wbg_ptr, I);
			return IA.__wrap(g);
		}
		coSetTranslation(I, g, C, B) {
			A.rawcolliderset_coSetTranslation(this.__wbg_ptr, I, g, C, B);
		}
		coSetTranslationWrtParent(I, g, C, B) {
			A.rawcolliderset_coSetTranslationWrtParent(this.__wbg_ptr, I, g, C, B);
		}
		coSetRotation(I, g, C, B, Q) {
			A.rawcolliderset_coSetRotation(this.__wbg_ptr, I, g, C, B, Q);
		}
		coSetRotationWrtParent(I, g, C, B, Q) {
			A.rawcolliderset_coSetRotationWrtParent(this.__wbg_ptr, I, g, C, B, Q);
		}
		coIsSensor(I) {
			return 0 !== A.rawcolliderset_coIsSensor(this.__wbg_ptr, I);
		}
		coShapeType(I) {
			return A.rawcolliderset_coShapeType(this.__wbg_ptr, I);
		}
		coHalfspaceNormal(I) {
			const g = A.rawcolliderset_coHalfspaceNormal(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		coHalfExtents(I) {
			const g = A.rawcolliderset_coHalfExtents(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		coSetHalfExtents(I, g) {
			a(g, DA), A.rawcolliderset_coSetHalfExtents(this.__wbg_ptr, I, g.__wbg_ptr);
		}
		coRadius(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawcolliderset_coRadius(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		coSetRadius(I, g) {
			A.rawcolliderset_coSetRadius(this.__wbg_ptr, I, g);
		}
		coHalfHeight(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawcolliderset_coHalfHeight(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		coSetHalfHeight(I, g) {
			A.rawcolliderset_coSetHalfHeight(this.__wbg_ptr, I, g);
		}
		coRoundRadius(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawcolliderset_coRoundRadius(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		coSetRoundRadius(I, g) {
			A.rawcolliderset_coSetRoundRadius(this.__wbg_ptr, I, g);
		}
		coVertices(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawcolliderset_coVertices(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = G()[B / 4 + 1];
				let Q;
				return 0 !== g && ((Q = y(g, C).slice()), A.__wbindgen_free(g, 4 * C, 4)), Q;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		coIndices(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawcolliderset_coIndices(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = G()[B / 4 + 1];
				let Q;
				return (
					0 !== g &&
						((Q = (function (A, I) {
							return (A >>>= 0), M().subarray(A / 4, A / 4 + I);
						})(g, C).slice()),
						A.__wbindgen_free(g, 4 * C, 4)),
					Q
				);
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		coHeightfieldHeights(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawcolliderset_coHeightfieldHeights(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = G()[B / 4 + 1];
				let Q;
				return 0 !== g && ((Q = y(g, C).slice()), A.__wbindgen_free(g, 4 * C, 4)), Q;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		coHeightfieldScale(I) {
			const g = A.rawcolliderset_coHeightfieldScale(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		coHeightfieldNRows(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawcolliderset_coHeightfieldNRows(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = G()[B / 4 + 1];
				return 0 === g ? void 0 : C >>> 0;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		coHeightfieldNCols(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawcolliderset_coHeightfieldNCols(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = G()[B / 4 + 1];
				return 0 === g ? void 0 : C >>> 0;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		coParent(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawcolliderset_coParent(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = D()[B / 8 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		coSetEnabled(I, g) {
			A.rawcolliderset_coSetEnabled(this.__wbg_ptr, I, g);
		}
		coIsEnabled(I) {
			return 0 !== A.rawcolliderset_coIsEnabled(this.__wbg_ptr, I);
		}
		coFriction(I) {
			return A.rawcolliderset_coFriction(this.__wbg_ptr, I);
		}
		coRestitution(I) {
			return A.rawcolliderset_coRestitution(this.__wbg_ptr, I);
		}
		coDensity(I) {
			return A.rawcolliderset_coDensity(this.__wbg_ptr, I);
		}
		coMass(I) {
			return A.rawcolliderset_coMass(this.__wbg_ptr, I);
		}
		coVolume(I) {
			return A.rawcolliderset_coVolume(this.__wbg_ptr, I);
		}
		coCollisionGroups(I) {
			return A.rawcolliderset_coCollisionGroups(this.__wbg_ptr, I) >>> 0;
		}
		coSolverGroups(I) {
			return A.rawcolliderset_coSolverGroups(this.__wbg_ptr, I) >>> 0;
		}
		coActiveHooks(I) {
			return A.rawcolliderset_coActiveHooks(this.__wbg_ptr, I) >>> 0;
		}
		coActiveCollisionTypes(I) {
			return A.rawcolliderset_coActiveCollisionTypes(this.__wbg_ptr, I);
		}
		coActiveEvents(I) {
			return A.rawcolliderset_coActiveEvents(this.__wbg_ptr, I) >>> 0;
		}
		coContactForceEventThreshold(I) {
			return A.rawcolliderset_coContactForceEventThreshold(this.__wbg_ptr, I);
		}
		coContainsPoint(I, g) {
			a(g, DA);
			return 0 !== A.rawcolliderset_coContainsPoint(this.__wbg_ptr, I, g.__wbg_ptr);
		}
		coCastShape(I, g, C, B, Q, E, i, D) {
			a(g, DA), a(C, BA), a(B, DA), a(Q, IA), a(E, DA);
			const o = A.rawcolliderset_coCastShape(
				this.__wbg_ptr,
				I,
				g.__wbg_ptr,
				C.__wbg_ptr,
				B.__wbg_ptr,
				Q.__wbg_ptr,
				E.__wbg_ptr,
				i,
				D
			);
			return 0 === o ? void 0 : iA.__wrap(o);
		}
		coCastCollider(I, g, C, B, Q, E) {
			a(g, DA), a(B, DA);
			const i = A.rawcolliderset_coCastCollider(this.__wbg_ptr, I, g.__wbg_ptr, C, B.__wbg_ptr, Q, E);
			return 0 === i ? void 0 : QA.__wrap(i);
		}
		coIntersectsShape(I, g, C, B) {
			a(g, BA), a(C, DA), a(B, IA);
			return 0 !== A.rawcolliderset_coIntersectsShape(this.__wbg_ptr, I, g.__wbg_ptr, C.__wbg_ptr, B.__wbg_ptr);
		}
		coContactShape(I, g, C, B, Q) {
			a(g, BA), a(C, DA), a(B, IA);
			const E = A.rawcolliderset_coContactShape(this.__wbg_ptr, I, g.__wbg_ptr, C.__wbg_ptr, B.__wbg_ptr, Q);
			return 0 === E ? void 0 : EA.__wrap(E);
		}
		coContactCollider(I, g, C) {
			const B = A.rawcolliderset_coContactCollider(this.__wbg_ptr, I, g, C);
			return 0 === B ? void 0 : EA.__wrap(B);
		}
		coProjectPoint(I, g, C) {
			a(g, DA);
			const B = A.rawcolliderset_coProjectPoint(this.__wbg_ptr, I, g.__wbg_ptr, C);
			return u.__wrap(B);
		}
		coIntersectsRay(I, g, C, B) {
			a(g, DA), a(C, DA);
			return 0 !== A.rawcolliderset_coIntersectsRay(this.__wbg_ptr, I, g.__wbg_ptr, C.__wbg_ptr, B);
		}
		coCastRay(I, g, C, B, Q) {
			a(g, DA), a(C, DA);
			return A.rawcolliderset_coCastRay(this.__wbg_ptr, I, g.__wbg_ptr, C.__wbg_ptr, B, Q);
		}
		coCastRayAndGetNormal(I, g, C, B, Q) {
			a(g, DA), a(C, DA);
			const E = A.rawcolliderset_coCastRayAndGetNormal(this.__wbg_ptr, I, g.__wbg_ptr, C.__wbg_ptr, B, Q);
			return 0 === E ? void 0 : $.__wrap(E);
		}
		coSetSensor(I, g) {
			A.rawcolliderset_coSetSensor(this.__wbg_ptr, I, g);
		}
		coSetRestitution(I, g) {
			A.rawcolliderset_coSetRestitution(this.__wbg_ptr, I, g);
		}
		coSetFriction(I, g) {
			A.rawcolliderset_coSetFriction(this.__wbg_ptr, I, g);
		}
		coFrictionCombineRule(I) {
			return A.rawcolliderset_coFrictionCombineRule(this.__wbg_ptr, I) >>> 0;
		}
		coSetFrictionCombineRule(I, g) {
			A.rawcolliderset_coSetFrictionCombineRule(this.__wbg_ptr, I, g);
		}
		coRestitutionCombineRule(I) {
			return A.rawcolliderset_coRestitutionCombineRule(this.__wbg_ptr, I) >>> 0;
		}
		coSetRestitutionCombineRule(I, g) {
			A.rawcolliderset_coSetRestitutionCombineRule(this.__wbg_ptr, I, g);
		}
		coSetCollisionGroups(I, g) {
			A.rawcolliderset_coSetCollisionGroups(this.__wbg_ptr, I, g);
		}
		coSetSolverGroups(I, g) {
			A.rawcolliderset_coSetSolverGroups(this.__wbg_ptr, I, g);
		}
		coSetActiveHooks(I, g) {
			A.rawcolliderset_coSetActiveHooks(this.__wbg_ptr, I, g);
		}
		coSetActiveEvents(I, g) {
			A.rawcolliderset_coSetActiveEvents(this.__wbg_ptr, I, g);
		}
		coSetActiveCollisionTypes(I, g) {
			A.rawcolliderset_coSetActiveCollisionTypes(this.__wbg_ptr, I, g);
		}
		coSetShape(I, g) {
			a(g, BA), A.rawcolliderset_coSetShape(this.__wbg_ptr, I, g.__wbg_ptr);
		}
		coSetContactForceEventThreshold(I, g) {
			A.rawcolliderset_coSetContactForceEventThreshold(this.__wbg_ptr, I, g);
		}
		coSetDensity(I, g) {
			A.rawcolliderset_coSetDensity(this.__wbg_ptr, I, g);
		}
		coSetMass(I, g) {
			A.rawcolliderset_coSetMass(this.__wbg_ptr, I, g);
		}
		coSetMassProperties(I, g, C, B, Q) {
			a(C, DA),
				a(B, DA),
				a(Q, IA),
				A.rawcolliderset_coSetMassProperties(this.__wbg_ptr, I, g, C.__wbg_ptr, B.__wbg_ptr, Q.__wbg_ptr);
		}
		constructor() {
			const I = A.rawcolliderset_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		len() {
			return A.rawcolliderset_len(this.__wbg_ptr) >>> 0;
		}
		contains(I) {
			return 0 !== A.rawcolliderset_contains(this.__wbg_ptr, I);
		}
		createCollider(I, g, C, B, Q, E, i, o, w, S, k, h, K, U, J, y, N, M, F, q, R, s, c, Y) {
			try {
				const L = A.__wbindgen_add_to_stack_pointer(-16);
				a(g, BA),
					a(C, DA),
					a(B, IA),
					a(i, DA),
					a(o, DA),
					a(w, IA),
					a(Y, AA),
					A.rawcolliderset_createCollider(
						L,
						this.__wbg_ptr,
						I,
						g.__wbg_ptr,
						C.__wbg_ptr,
						B.__wbg_ptr,
						Q,
						E,
						i.__wbg_ptr,
						o.__wbg_ptr,
						w.__wbg_ptr,
						S,
						k,
						h,
						K,
						U,
						J,
						y,
						N,
						M,
						F,
						q,
						R,
						s,
						c,
						Y.__wbg_ptr
					);
				var H = G()[L / 4 + 0],
					l = D()[L / 8 + 1];
				return 0 === H ? void 0 : l;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		remove(I, g, C, B) {
			a(g, m), a(C, AA), A.rawcolliderset_remove(this.__wbg_ptr, I, g.__wbg_ptr, C.__wbg_ptr, B);
		}
		isHandleValid(I) {
			return 0 !== A.rawcolliderset_contains(this.__wbg_ptr, I);
		}
		forEachColliderHandle(g) {
			try {
				A.rawcolliderset_forEachColliderHandle(this.__wbg_ptr, J(g));
			} finally {
				I[U++] = void 0;
			}
		}
	}
	class e {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(e.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawcontactforceevent_free(I);
		}
		collider1() {
			return A.rawcharactercollision_handle(this.__wbg_ptr);
		}
		collider2() {
			return A.rawcontactforceevent_collider2(this.__wbg_ptr);
		}
		total_force() {
			const I = A.rawcontactforceevent_total_force(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		total_force_magnitude() {
			return A.rawcontactforceevent_total_force_magnitude(this.__wbg_ptr);
		}
		max_force_direction() {
			const I = A.rawcontactforceevent_max_force_direction(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		max_force_magnitude() {
			return A.rawcontactforceevent_max_force_magnitude(this.__wbg_ptr);
		}
	}
	class r {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(r.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawcontactmanifold_free(I);
		}
		normal() {
			const I = A.rawcontactmanifold_normal(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		local_n1() {
			const I = A.rawcontactmanifold_local_n1(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		local_n2() {
			const I = A.rawcontactmanifold_local_n2(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		subshape1() {
			return A.rawcontactmanifold_subshape1(this.__wbg_ptr) >>> 0;
		}
		subshape2() {
			return A.rawcontactmanifold_subshape2(this.__wbg_ptr) >>> 0;
		}
		num_contacts() {
			return A.rawcontactmanifold_num_contacts(this.__wbg_ptr) >>> 0;
		}
		contact_local_p1(I) {
			const g = A.rawcontactmanifold_contact_local_p1(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		contact_local_p2(I) {
			const g = A.rawcontactmanifold_contact_local_p2(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		contact_dist(I) {
			return A.rawcontactmanifold_contact_dist(this.__wbg_ptr, I);
		}
		contact_fid1(I) {
			return A.rawcontactmanifold_contact_fid1(this.__wbg_ptr, I) >>> 0;
		}
		contact_fid2(I) {
			return A.rawcontactmanifold_contact_fid2(this.__wbg_ptr, I) >>> 0;
		}
		contact_impulse(I) {
			return A.rawcontactmanifold_contact_impulse(this.__wbg_ptr, I);
		}
		contact_tangent_impulse_x(I) {
			return A.rawcontactmanifold_contact_tangent_impulse_x(this.__wbg_ptr, I);
		}
		contact_tangent_impulse_y(I) {
			return A.rawcontactmanifold_contact_tangent_impulse_y(this.__wbg_ptr, I);
		}
		num_solver_contacts() {
			return A.rawcontactmanifold_num_solver_contacts(this.__wbg_ptr) >>> 0;
		}
		solver_contact_point(I) {
			const g = A.rawcontactmanifold_solver_contact_point(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		solver_contact_dist(I) {
			return A.rawcontactmanifold_solver_contact_dist(this.__wbg_ptr, I);
		}
		solver_contact_friction(I) {
			return A.rawcontactmanifold_solver_contact_friction(this.__wbg_ptr, I);
		}
		solver_contact_restitution(I) {
			return A.rawcontactmanifold_solver_contact_restitution(this.__wbg_ptr, I);
		}
		solver_contact_tangent_velocity(I) {
			const g = A.rawcontactmanifold_solver_contact_tangent_velocity(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
	}
	class d {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(d.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawcontactpair_free(I);
		}
		collider1() {
			return A.rawcontactpair_collider1(this.__wbg_ptr);
		}
		collider2() {
			return A.rawcontactpair_collider2(this.__wbg_ptr);
		}
		numContactManifolds() {
			return A.rawcontactpair_numContactManifolds(this.__wbg_ptr) >>> 0;
		}
		contactManifold(I) {
			const g = A.rawcontactpair_contactManifold(this.__wbg_ptr, I);
			return 0 === g ? void 0 : r.__wrap(g);
		}
	}
	class T {
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawdebugrenderpipeline_free(I);
		}
		constructor() {
			const I = A.rawdebugrenderpipeline_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		vertices() {
			return Q(A.rawdebugrenderpipeline_vertices(this.__wbg_ptr));
		}
		colors() {
			return Q(A.rawdebugrenderpipeline_colors(this.__wbg_ptr));
		}
		render(I, g, C, B, Q) {
			a(I, AA),
				a(g, p),
				a(C, W),
				a(B, f),
				a(Q, X),
				A.rawdebugrenderpipeline_render(
					this.__wbg_ptr,
					I.__wbg_ptr,
					g.__wbg_ptr,
					C.__wbg_ptr,
					B.__wbg_ptr,
					Q.__wbg_ptr
				);
		}
	}
	class n {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(n.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawdeserializedworld_free(I);
		}
		takeGravity() {
			const I = A.rawdeserializedworld_takeGravity(this.__wbg_ptr);
			return 0 === I ? void 0 : DA.__wrap(I);
		}
		takeIntegrationParameters() {
			const I = A.rawdeserializedworld_takeIntegrationParameters(this.__wbg_ptr);
			return 0 === I ? void 0 : x.__wrap(I);
		}
		takeIslandManager() {
			const I = A.rawdeserializedworld_takeIslandManager(this.__wbg_ptr);
			return 0 === I ? void 0 : m.__wrap(I);
		}
		takeBroadPhase() {
			const I = A.rawdeserializedworld_takeBroadPhase(this.__wbg_ptr);
			return 0 === I ? void 0 : l.__wrap(I);
		}
		takeNarrowPhase() {
			const I = A.rawdeserializedworld_takeNarrowPhase(this.__wbg_ptr);
			return 0 === I ? void 0 : X.__wrap(I);
		}
		takeBodies() {
			const I = A.rawdeserializedworld_takeBodies(this.__wbg_ptr);
			return 0 === I ? void 0 : AA.__wrap(I);
		}
		takeColliders() {
			const I = A.rawdeserializedworld_takeColliders(this.__wbg_ptr);
			return 0 === I ? void 0 : p.__wrap(I);
		}
		takeImpulseJoints() {
			const I = A.rawdeserializedworld_takeImpulseJoints(this.__wbg_ptr);
			return 0 === I ? void 0 : W.__wrap(I);
		}
		takeMultibodyJoints() {
			const I = A.rawdeserializedworld_takeMultibodyJoints(this.__wbg_ptr);
			return 0 === I ? void 0 : f.__wrap(I);
		}
	}
	class O {
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawdynamicraycastvehiclecontroller_free(I);
		}
		constructor(I) {
			const g = A.rawdynamicraycastvehiclecontroller_new(I);
			return (this.__wbg_ptr = g >>> 0), this;
		}
		current_vehicle_speed() {
			return A.rawdynamicraycastvehiclecontroller_current_vehicle_speed(this.__wbg_ptr);
		}
		chassis() {
			return A.rawdynamicraycastvehiclecontroller_chassis(this.__wbg_ptr);
		}
		index_up_axis() {
			return A.rawdynamicraycastvehiclecontroller_index_up_axis(this.__wbg_ptr) >>> 0;
		}
		set_index_up_axis(I) {
			A.rawdynamicraycastvehiclecontroller_set_index_up_axis(this.__wbg_ptr, I);
		}
		index_forward_axis() {
			return A.rawdynamicraycastvehiclecontroller_index_forward_axis(this.__wbg_ptr) >>> 0;
		}
		set_index_forward_axis(I) {
			A.rawdynamicraycastvehiclecontroller_set_index_forward_axis(this.__wbg_ptr, I);
		}
		add_wheel(I, g, C, B, Q) {
			a(I, DA),
				a(g, DA),
				a(C, DA),
				A.rawdynamicraycastvehiclecontroller_add_wheel(this.__wbg_ptr, I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr, B, Q);
		}
		num_wheels() {
			return A.rawdynamicraycastvehiclecontroller_num_wheels(this.__wbg_ptr) >>> 0;
		}
		update_vehicle(g, C, B, Q, i, D, o) {
			try {
				a(C, AA),
					a(B, p),
					a(Q, v),
					A.rawdynamicraycastvehiclecontroller_update_vehicle(
						this.__wbg_ptr,
						g,
						C.__wbg_ptr,
						B.__wbg_ptr,
						Q.__wbg_ptr,
						i,
						!E(D),
						E(D) ? 0 : D,
						J(o)
					);
			} finally {
				I[U++] = void 0;
			}
		}
		wheel_chassis_connection_point_cs(I) {
			const g = A.rawdynamicraycastvehiclecontroller_wheel_chassis_connection_point_cs(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		set_wheel_chassis_connection_point_cs(I, g) {
			a(g, DA),
				A.rawdynamicraycastvehiclecontroller_set_wheel_chassis_connection_point_cs(this.__wbg_ptr, I, g.__wbg_ptr);
		}
		wheel_suspension_rest_length(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_suspension_rest_length(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_suspension_rest_length(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_suspension_rest_length(this.__wbg_ptr, I, g);
		}
		wheel_max_suspension_travel(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_max_suspension_travel(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_max_suspension_travel(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_max_suspension_travel(this.__wbg_ptr, I, g);
		}
		wheel_radius(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_radius(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_radius(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_radius(this.__wbg_ptr, I, g);
		}
		wheel_suspension_stiffness(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_suspension_stiffness(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_suspension_stiffness(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_suspension_stiffness(this.__wbg_ptr, I, g);
		}
		wheel_suspension_compression(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_suspension_compression(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_suspension_compression(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_suspension_compression(this.__wbg_ptr, I, g);
		}
		wheel_suspension_relaxation(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_suspension_relaxation(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_suspension_relaxation(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_suspension_relaxation(this.__wbg_ptr, I, g);
		}
		wheel_max_suspension_force(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_max_suspension_force(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_max_suspension_force(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_max_suspension_force(this.__wbg_ptr, I, g);
		}
		wheel_brake(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_brake(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_brake(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_brake(this.__wbg_ptr, I, g);
		}
		wheel_steering(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_steering(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_steering(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_steering(this.__wbg_ptr, I, g);
		}
		wheel_engine_force(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_engine_force(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_engine_force(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_engine_force(this.__wbg_ptr, I, g);
		}
		wheel_direction_cs(I) {
			const g = A.rawdynamicraycastvehiclecontroller_wheel_direction_cs(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		set_wheel_direction_cs(I, g) {
			a(g, DA), A.rawdynamicraycastvehiclecontroller_set_wheel_direction_cs(this.__wbg_ptr, I, g.__wbg_ptr);
		}
		wheel_axle_cs(I) {
			const g = A.rawdynamicraycastvehiclecontroller_wheel_axle_cs(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		set_wheel_axle_cs(I, g) {
			a(g, DA), A.rawdynamicraycastvehiclecontroller_set_wheel_axle_cs(this.__wbg_ptr, I, g.__wbg_ptr);
		}
		wheel_friction_slip(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_friction_slip(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_friction_slip(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_friction_slip(this.__wbg_ptr, I, g);
		}
		wheel_side_friction_stiffness(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_side_friction_stiffness(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		set_wheel_side_friction_stiffness(I, g) {
			A.rawdynamicraycastvehiclecontroller_set_wheel_side_friction_stiffness(this.__wbg_ptr, I, g);
		}
		wheel_rotation(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_rotation(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		wheel_forward_impulse(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_forward_impulse(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		wheel_side_impulse(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_side_impulse(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		wheel_suspension_force(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_suspension_force(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		wheel_contact_normal_ws(I) {
			const g = A.rawdynamicraycastvehiclecontroller_wheel_contact_normal_ws(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		wheel_contact_point_ws(I) {
			const g = A.rawdynamicraycastvehiclecontroller_wheel_contact_point_ws(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		wheel_suspension_length(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_suspension_length(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = K()[B / 4 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		wheel_hard_point_ws(I) {
			const g = A.rawdynamicraycastvehiclecontroller_wheel_hard_point_ws(this.__wbg_ptr, I);
			return 0 === g ? void 0 : DA.__wrap(g);
		}
		wheel_is_in_contact(I) {
			return 0 !== A.rawdynamicraycastvehiclecontroller_wheel_is_in_contact(this.__wbg_ptr, I);
		}
		wheel_ground_object(I) {
			try {
				const B = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawdynamicraycastvehiclecontroller_wheel_ground_object(B, this.__wbg_ptr, I);
				var g = G()[B / 4 + 0],
					C = D()[B / 8 + 1];
				return 0 === g ? void 0 : C;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
	}
	class Z {
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_raweventqueue_free(I);
		}
		constructor(I) {
			const g = A.raweventqueue_new(I);
			return (this.__wbg_ptr = g >>> 0), this;
		}
		drainCollisionEvents(g) {
			try {
				A.raweventqueue_drainCollisionEvents(this.__wbg_ptr, J(g));
			} finally {
				I[U++] = void 0;
			}
		}
		drainContactForceEvents(g) {
			try {
				A.raweventqueue_drainContactForceEvents(this.__wbg_ptr, J(g));
			} finally {
				I[U++] = void 0;
			}
		}
		clear() {
			A.raweventqueue_clear(this.__wbg_ptr);
		}
	}
	class b {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(b.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawgenericjoint_free(I);
		}
		static generic(I, g, C, B) {
			a(I, DA), a(g, DA), a(C, DA);
			const Q = A.rawgenericjoint_generic(I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr, B);
			return 0 === Q ? void 0 : b.__wrap(Q);
		}
		static spring(I, g, C, B, Q) {
			a(B, DA), a(Q, DA);
			const E = A.rawgenericjoint_spring(I, g, C, B.__wbg_ptr, Q.__wbg_ptr);
			return b.__wrap(E);
		}
		static rope(I, g, C) {
			a(g, DA), a(C, DA);
			const B = A.rawgenericjoint_rope(I, g.__wbg_ptr, C.__wbg_ptr);
			return b.__wrap(B);
		}
		static spherical(I, g) {
			a(I, DA), a(g, DA);
			const C = A.rawgenericjoint_spherical(I.__wbg_ptr, g.__wbg_ptr);
			return b.__wrap(C);
		}
		static prismatic(I, g, C, B, Q, E) {
			a(I, DA), a(g, DA), a(C, DA);
			const i = A.rawgenericjoint_prismatic(I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr, B, Q, E);
			return 0 === i ? void 0 : b.__wrap(i);
		}
		static fixed(I, g, C, B) {
			a(I, DA), a(g, IA), a(C, DA), a(B, IA);
			const Q = A.rawgenericjoint_fixed(I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr, B.__wbg_ptr);
			return b.__wrap(Q);
		}
		static revolute(I, g, C) {
			a(I, DA), a(g, DA), a(C, DA);
			const B = A.rawgenericjoint_revolute(I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr);
			return 0 === B ? void 0 : b.__wrap(B);
		}
	}
	class W {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(W.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawimpulsejointset_free(I);
		}
		jointType(I) {
			return A.rawimpulsejointset_jointType(this.__wbg_ptr, I);
		}
		jointBodyHandle1(I) {
			return A.rawimpulsejointset_jointBodyHandle1(this.__wbg_ptr, I);
		}
		jointBodyHandle2(I) {
			return A.rawimpulsejointset_jointBodyHandle2(this.__wbg_ptr, I);
		}
		jointFrameX1(I) {
			const g = A.rawimpulsejointset_jointFrameX1(this.__wbg_ptr, I);
			return IA.__wrap(g);
		}
		jointFrameX2(I) {
			const g = A.rawimpulsejointset_jointFrameX2(this.__wbg_ptr, I);
			return IA.__wrap(g);
		}
		jointAnchor1(I) {
			const g = A.rawimpulsejointset_jointAnchor1(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		jointAnchor2(I) {
			const g = A.rawimpulsejointset_jointAnchor2(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		jointSetAnchor1(I, g) {
			a(g, DA), A.rawimpulsejointset_jointSetAnchor1(this.__wbg_ptr, I, g.__wbg_ptr);
		}
		jointSetAnchor2(I, g) {
			a(g, DA), A.rawimpulsejointset_jointSetAnchor2(this.__wbg_ptr, I, g.__wbg_ptr);
		}
		jointContactsEnabled(I) {
			return 0 !== A.rawimpulsejointset_jointContactsEnabled(this.__wbg_ptr, I);
		}
		jointSetContactsEnabled(I, g) {
			A.rawimpulsejointset_jointSetContactsEnabled(this.__wbg_ptr, I, g);
		}
		jointLimitsEnabled(I, g) {
			return 0 !== A.rawimpulsejointset_jointLimitsEnabled(this.__wbg_ptr, I, g);
		}
		jointLimitsMin(I, g) {
			return A.rawimpulsejointset_jointLimitsMin(this.__wbg_ptr, I, g);
		}
		jointLimitsMax(I, g) {
			return A.rawimpulsejointset_jointLimitsMax(this.__wbg_ptr, I, g);
		}
		jointSetLimits(I, g, C, B) {
			A.rawimpulsejointset_jointSetLimits(this.__wbg_ptr, I, g, C, B);
		}
		jointConfigureMotorModel(I, g, C) {
			A.rawimpulsejointset_jointConfigureMotorModel(this.__wbg_ptr, I, g, C);
		}
		jointConfigureMotorVelocity(I, g, C, B) {
			A.rawimpulsejointset_jointConfigureMotorVelocity(this.__wbg_ptr, I, g, C, B);
		}
		jointConfigureMotorPosition(I, g, C, B, Q) {
			A.rawimpulsejointset_jointConfigureMotorPosition(this.__wbg_ptr, I, g, C, B, Q);
		}
		jointConfigureMotor(I, g, C, B, Q, E) {
			A.rawimpulsejointset_jointConfigureMotor(this.__wbg_ptr, I, g, C, B, Q, E);
		}
		constructor() {
			const I = A.rawimpulsejointset_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		createJoint(I, g, C, B) {
			a(I, b);
			return A.rawimpulsejointset_createJoint(this.__wbg_ptr, I.__wbg_ptr, g, C, B);
		}
		remove(I, g) {
			A.rawimpulsejointset_remove(this.__wbg_ptr, I, g);
		}
		len() {
			return A.rawimpulsejointset_len(this.__wbg_ptr) >>> 0;
		}
		contains(I) {
			return 0 !== A.rawimpulsejointset_contains(this.__wbg_ptr, I);
		}
		forEachJointHandle(g) {
			try {
				A.rawimpulsejointset_forEachJointHandle(this.__wbg_ptr, J(g));
			} finally {
				I[U++] = void 0;
			}
		}
		forEachJointAttachedToRigidBody(g, C) {
			try {
				A.rawimpulsejointset_forEachJointAttachedToRigidBody(this.__wbg_ptr, g, J(C));
			} finally {
				I[U++] = void 0;
			}
		}
	}
	class x {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(x.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawintegrationparameters_free(I);
		}
		constructor() {
			const I = A.rawintegrationparameters_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		get dt() {
			return A.rawintegrationparameters_dt(this.__wbg_ptr);
		}
		get erp() {
			return A.rawintegrationparameters_erp(this.__wbg_ptr);
		}
		get allowedLinearError() {
			return A.rawcontactforceevent_total_force_magnitude(this.__wbg_ptr);
		}
		get predictionDistance() {
			return A.rawdynamicraycastvehiclecontroller_current_vehicle_speed(this.__wbg_ptr);
		}
		get numSolverIterations() {
			return A.rawintegrationparameters_numSolverIterations(this.__wbg_ptr) >>> 0;
		}
		get numAdditionalFrictionIterations() {
			return A.rawintegrationparameters_numAdditionalFrictionIterations(this.__wbg_ptr) >>> 0;
		}
		get numInternalPgsIterations() {
			return A.rawintegrationparameters_numInternalPgsIterations(this.__wbg_ptr) >>> 0;
		}
		get minIslandSize() {
			return A.rawdynamicraycastvehiclecontroller_index_up_axis(this.__wbg_ptr) >>> 0;
		}
		get maxCcdSubsteps() {
			return A.rawdynamicraycastvehiclecontroller_index_forward_axis(this.__wbg_ptr) >>> 0;
		}
		set dt(I) {
			A.rawintegrationparameters_set_dt(this.__wbg_ptr, I);
		}
		set erp(I) {
			A.rawintegrationparameters_set_erp(this.__wbg_ptr, I);
		}
		set allowedLinearError(I) {
			A.rawintegrationparameters_set_allowedLinearError(this.__wbg_ptr, I);
		}
		set predictionDistance(I) {
			A.rawintegrationparameters_set_predictionDistance(this.__wbg_ptr, I);
		}
		set numSolverIterations(I) {
			A.rawintegrationparameters_set_numSolverIterations(this.__wbg_ptr, I);
		}
		set numAdditionalFrictionIterations(I) {
			A.rawintegrationparameters_set_numAdditionalFrictionIterations(this.__wbg_ptr, I);
		}
		set numInternalPgsIterations(I) {
			A.rawintegrationparameters_set_numInternalPgsIterations(this.__wbg_ptr, I);
		}
		set minIslandSize(I) {
			A.rawdynamicraycastvehiclecontroller_set_index_up_axis(this.__wbg_ptr, I);
		}
		set maxCcdSubsteps(I) {
			A.rawdynamicraycastvehiclecontroller_set_index_forward_axis(this.__wbg_ptr, I);
		}
		switchToStandardPgsSolver() {
			A.rawintegrationparameters_switchToStandardPgsSolver(this.__wbg_ptr);
		}
		switchToSmallStepsPgsSolver() {
			A.rawintegrationparameters_switchToSmallStepsPgsSolver(this.__wbg_ptr);
		}
	}
	class m {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(m.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawislandmanager_free(I);
		}
		constructor() {
			const I = A.rawislandmanager_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		forEachActiveRigidBodyHandle(g) {
			try {
				A.rawislandmanager_forEachActiveRigidBodyHandle(this.__wbg_ptr, J(g));
			} finally {
				I[U++] = void 0;
			}
		}
	}
	class j {
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawkinematiccharactercontroller_free(I);
		}
		constructor(I) {
			const g = A.rawkinematiccharactercontroller_new(I);
			return (this.__wbg_ptr = g >>> 0), this;
		}
		up() {
			const I = A.rawcharactercollision_translationDeltaApplied(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		setUp(I) {
			a(I, DA), A.rawkinematiccharactercontroller_setUp(this.__wbg_ptr, I.__wbg_ptr);
		}
		offset() {
			return A.rawintegrationparameters_dt(this.__wbg_ptr);
		}
		setOffset(I) {
			A.rawkinematiccharactercontroller_setOffset(this.__wbg_ptr, I);
		}
		slideEnabled() {
			return 0 !== A.rawkinematiccharactercontroller_slideEnabled(this.__wbg_ptr);
		}
		setSlideEnabled(I) {
			A.rawkinematiccharactercontroller_setSlideEnabled(this.__wbg_ptr, I);
		}
		autostepMaxHeight() {
			try {
				const C = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawkinematiccharactercontroller_autostepMaxHeight(C, this.__wbg_ptr);
				var I = G()[C / 4 + 0],
					g = K()[C / 4 + 1];
				return 0 === I ? void 0 : g;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		autostepMinWidth() {
			try {
				const C = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawkinematiccharactercontroller_autostepMinWidth(C, this.__wbg_ptr);
				var I = G()[C / 4 + 0],
					g = K()[C / 4 + 1];
				return 0 === I ? void 0 : g;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		autostepIncludesDynamicBodies() {
			const I = A.rawkinematiccharactercontroller_autostepIncludesDynamicBodies(this.__wbg_ptr);
			return 16777215 === I ? void 0 : 0 !== I;
		}
		autostepEnabled() {
			return 0 !== A.rawkinematiccharactercontroller_autostepEnabled(this.__wbg_ptr);
		}
		enableAutostep(I, g, C) {
			A.rawkinematiccharactercontroller_enableAutostep(this.__wbg_ptr, I, g, C);
		}
		disableAutostep() {
			A.rawkinematiccharactercontroller_disableAutostep(this.__wbg_ptr);
		}
		maxSlopeClimbAngle() {
			return A.rawkinematiccharactercontroller_maxSlopeClimbAngle(this.__wbg_ptr);
		}
		setMaxSlopeClimbAngle(I) {
			A.rawkinematiccharactercontroller_setMaxSlopeClimbAngle(this.__wbg_ptr, I);
		}
		minSlopeSlideAngle() {
			return A.rawkinematiccharactercontroller_minSlopeSlideAngle(this.__wbg_ptr);
		}
		setMinSlopeSlideAngle(I) {
			A.rawkinematiccharactercontroller_setMinSlopeSlideAngle(this.__wbg_ptr, I);
		}
		snapToGroundDistance() {
			try {
				const C = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawkinematiccharactercontroller_snapToGroundDistance(C, this.__wbg_ptr);
				var I = G()[C / 4 + 0],
					g = K()[C / 4 + 1];
				return 0 === I ? void 0 : g;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
		enableSnapToGround(I) {
			A.rawkinematiccharactercontroller_enableSnapToGround(this.__wbg_ptr, I);
		}
		disableSnapToGround() {
			A.rawkinematiccharactercontroller_disableSnapToGround(this.__wbg_ptr);
		}
		snapToGroundEnabled() {
			return 0 !== A.rawkinematiccharactercontroller_snapToGroundEnabled(this.__wbg_ptr);
		}
		computeColliderMovement(g, C, B, Q, i, D, o, G, w, S, k) {
			try {
				a(C, AA),
					a(B, p),
					a(Q, v),
					a(D, DA),
					A.rawkinematiccharactercontroller_computeColliderMovement(
						this.__wbg_ptr,
						g,
						C.__wbg_ptr,
						B.__wbg_ptr,
						Q.__wbg_ptr,
						i,
						D.__wbg_ptr,
						o,
						!E(G),
						E(G) ? 0 : G,
						w,
						!E(S),
						E(S) ? 0 : S,
						J(k)
					);
			} finally {
				I[U++] = void 0;
			}
		}
		computedMovement() {
			const I = A.rawkinematiccharactercontroller_computedMovement(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		computedGrounded() {
			return 0 !== A.rawkinematiccharactercontroller_computedGrounded(this.__wbg_ptr);
		}
		numComputedCollisions() {
			return A.rawkinematiccharactercontroller_numComputedCollisions(this.__wbg_ptr) >>> 0;
		}
		computedCollision(I, g) {
			a(g, t);
			return 0 !== A.rawkinematiccharactercontroller_computedCollision(this.__wbg_ptr, I, g.__wbg_ptr);
		}
	}
	class f {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(f.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawmultibodyjointset_free(I);
		}
		jointType(I) {
			return A.rawmultibodyjointset_jointType(this.__wbg_ptr, I);
		}
		jointFrameX1(I) {
			const g = A.rawmultibodyjointset_jointFrameX1(this.__wbg_ptr, I);
			return IA.__wrap(g);
		}
		jointFrameX2(I) {
			const g = A.rawmultibodyjointset_jointFrameX2(this.__wbg_ptr, I);
			return IA.__wrap(g);
		}
		jointAnchor1(I) {
			const g = A.rawmultibodyjointset_jointAnchor1(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		jointAnchor2(I) {
			const g = A.rawmultibodyjointset_jointAnchor2(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		jointContactsEnabled(I) {
			return 0 !== A.rawmultibodyjointset_jointContactsEnabled(this.__wbg_ptr, I);
		}
		jointSetContactsEnabled(I, g) {
			A.rawmultibodyjointset_jointSetContactsEnabled(this.__wbg_ptr, I, g);
		}
		jointLimitsEnabled(I, g) {
			return 0 !== A.rawmultibodyjointset_jointLimitsEnabled(this.__wbg_ptr, I, g);
		}
		jointLimitsMin(I, g) {
			return A.rawmultibodyjointset_jointLimitsMin(this.__wbg_ptr, I, g);
		}
		jointLimitsMax(I, g) {
			return A.rawmultibodyjointset_jointLimitsMax(this.__wbg_ptr, I, g);
		}
		constructor() {
			const I = A.rawmultibodyjointset_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		createJoint(I, g, C, B) {
			a(I, b);
			return A.rawmultibodyjointset_createJoint(this.__wbg_ptr, I.__wbg_ptr, g, C, B);
		}
		remove(I, g) {
			A.rawmultibodyjointset_remove(this.__wbg_ptr, I, g);
		}
		contains(I) {
			return 0 !== A.rawmultibodyjointset_contains(this.__wbg_ptr, I);
		}
		forEachJointHandle(g) {
			try {
				A.rawmultibodyjointset_forEachJointHandle(this.__wbg_ptr, J(g));
			} finally {
				I[U++] = void 0;
			}
		}
		forEachJointAttachedToRigidBody(g, C) {
			try {
				A.rawmultibodyjointset_forEachJointAttachedToRigidBody(this.__wbg_ptr, g, J(C));
			} finally {
				I[U++] = void 0;
			}
		}
	}
	class X {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(X.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawnarrowphase_free(I);
		}
		constructor() {
			const I = A.rawnarrowphase_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		contact_pairs_with(I, g) {
			A.rawnarrowphase_contact_pairs_with(this.__wbg_ptr, I, C(g));
		}
		contact_pair(I, g) {
			const C = A.rawnarrowphase_contact_pair(this.__wbg_ptr, I, g);
			return 0 === C ? void 0 : d.__wrap(C);
		}
		intersection_pairs_with(I, g) {
			A.rawnarrowphase_intersection_pairs_with(this.__wbg_ptr, I, C(g));
		}
		intersection_pair(I, g) {
			return 0 !== A.rawnarrowphase_intersection_pair(this.__wbg_ptr, I, g);
		}
	}
	class V {
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawphysicspipeline_free(I);
		}
		constructor() {
			const I = A.rawphysicspipeline_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		step(I, g, C, B, Q, E, i, D, o, G) {
			a(I, DA),
				a(g, x),
				a(C, m),
				a(B, l),
				a(Q, X),
				a(E, AA),
				a(i, p),
				a(D, W),
				a(o, f),
				a(G, L),
				A.rawphysicspipeline_step(
					this.__wbg_ptr,
					I.__wbg_ptr,
					g.__wbg_ptr,
					C.__wbg_ptr,
					B.__wbg_ptr,
					Q.__wbg_ptr,
					E.__wbg_ptr,
					i.__wbg_ptr,
					D.__wbg_ptr,
					o.__wbg_ptr,
					G.__wbg_ptr
				);
		}
		stepWithEvents(I, g, B, Q, E, i, D, o, G, w, S, k, h, K) {
			a(I, DA),
				a(g, x),
				a(B, m),
				a(Q, l),
				a(E, X),
				a(i, AA),
				a(D, p),
				a(o, W),
				a(G, f),
				a(w, L),
				a(S, Z),
				A.rawphysicspipeline_stepWithEvents(
					this.__wbg_ptr,
					I.__wbg_ptr,
					g.__wbg_ptr,
					B.__wbg_ptr,
					Q.__wbg_ptr,
					E.__wbg_ptr,
					i.__wbg_ptr,
					D.__wbg_ptr,
					o.__wbg_ptr,
					G.__wbg_ptr,
					w.__wbg_ptr,
					S.__wbg_ptr,
					C(k),
					C(h),
					C(K)
				);
		}
	}
	class P {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(P.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawpointcolliderprojection_free(I);
		}
		colliderHandle() {
			return A.rawpointcolliderprojection_colliderHandle(this.__wbg_ptr);
		}
		point() {
			const I = A.rawpointcolliderprojection_point(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		isInside() {
			return 0 !== A.rawpointcolliderprojection_isInside(this.__wbg_ptr);
		}
		featureType() {
			return A.rawpointcolliderprojection_featureType(this.__wbg_ptr);
		}
		featureId() {
			try {
				const C = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawpointcolliderprojection_featureId(C, this.__wbg_ptr);
				var I = G()[C / 4 + 0],
					g = G()[C / 4 + 1];
				return 0 === I ? void 0 : g >>> 0;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
	}
	class u {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(u.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawpointprojection_free(I);
		}
		point() {
			const I = A.rawpointprojection_point(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		isInside() {
			return 0 !== A.rawpointprojection_isInside(this.__wbg_ptr);
		}
	}
	class v {
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawquerypipeline_free(I);
		}
		constructor() {
			const I = A.rawquerypipeline_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		update(I, g) {
			a(I, AA), a(g, p), A.rawquerypipeline_update(this.__wbg_ptr, I.__wbg_ptr, g.__wbg_ptr);
		}
		castRay(g, C, B, Q, i, D, o, G, w, S, k) {
			try {
				a(g, AA), a(C, p), a(B, DA), a(Q, DA);
				const h = A.rawquerypipeline_castRay(
					this.__wbg_ptr,
					g.__wbg_ptr,
					C.__wbg_ptr,
					B.__wbg_ptr,
					Q.__wbg_ptr,
					i,
					D,
					o,
					!E(G),
					E(G) ? 0 : G,
					!E(w),
					E(w) ? 0 : w,
					!E(S),
					E(S) ? 0 : S,
					J(k)
				);
				return 0 === h ? void 0 : _.__wrap(h);
			} finally {
				I[U++] = void 0;
			}
		}
		castRayAndGetNormal(g, C, B, Q, i, D, o, G, w, S, k) {
			try {
				a(g, AA), a(C, p), a(B, DA), a(Q, DA);
				const h = A.rawquerypipeline_castRayAndGetNormal(
					this.__wbg_ptr,
					g.__wbg_ptr,
					C.__wbg_ptr,
					B.__wbg_ptr,
					Q.__wbg_ptr,
					i,
					D,
					o,
					!E(G),
					E(G) ? 0 : G,
					!E(w),
					E(w) ? 0 : w,
					!E(S),
					E(S) ? 0 : S,
					J(k)
				);
				return 0 === h ? void 0 : z.__wrap(h);
			} finally {
				I[U++] = void 0;
			}
		}
		intersectionsWithRay(g, C, B, Q, i, D, o, G, w, S, k, h) {
			try {
				a(g, AA),
					a(C, p),
					a(B, DA),
					a(Q, DA),
					A.rawquerypipeline_intersectionsWithRay(
						this.__wbg_ptr,
						g.__wbg_ptr,
						C.__wbg_ptr,
						B.__wbg_ptr,
						Q.__wbg_ptr,
						i,
						D,
						J(o),
						G,
						!E(w),
						E(w) ? 0 : w,
						!E(S),
						E(S) ? 0 : S,
						!E(k),
						E(k) ? 0 : k,
						J(h)
					);
			} finally {
				(I[U++] = void 0), (I[U++] = void 0);
			}
		}
		intersectionWithShape(g, C, B, Q, i, o, w, S, k, h) {
			try {
				const N = A.__wbindgen_add_to_stack_pointer(-16);
				a(g, AA),
					a(C, p),
					a(B, DA),
					a(Q, IA),
					a(i, BA),
					A.rawquerypipeline_intersectionWithShape(
						N,
						this.__wbg_ptr,
						g.__wbg_ptr,
						C.__wbg_ptr,
						B.__wbg_ptr,
						Q.__wbg_ptr,
						i.__wbg_ptr,
						o,
						!E(w),
						E(w) ? 0 : w,
						!E(S),
						E(S) ? 0 : S,
						!E(k),
						E(k) ? 0 : k,
						J(h)
					);
				var K = G()[N / 4 + 0],
					y = D()[N / 8 + 1];
				return 0 === K ? void 0 : y;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16), (I[U++] = void 0);
			}
		}
		projectPoint(g, C, B, Q, i, D, o, G, w) {
			try {
				a(g, AA), a(C, p), a(B, DA);
				const S = A.rawquerypipeline_projectPoint(
					this.__wbg_ptr,
					g.__wbg_ptr,
					C.__wbg_ptr,
					B.__wbg_ptr,
					Q,
					i,
					!E(D),
					E(D) ? 0 : D,
					!E(o),
					E(o) ? 0 : o,
					!E(G),
					E(G) ? 0 : G,
					J(w)
				);
				return 0 === S ? void 0 : P.__wrap(S);
			} finally {
				I[U++] = void 0;
			}
		}
		projectPointAndGetFeature(g, C, B, Q, i, D, o, G) {
			try {
				a(g, AA), a(C, p), a(B, DA);
				const w = A.rawquerypipeline_projectPointAndGetFeature(
					this.__wbg_ptr,
					g.__wbg_ptr,
					C.__wbg_ptr,
					B.__wbg_ptr,
					Q,
					!E(i),
					E(i) ? 0 : i,
					!E(D),
					E(D) ? 0 : D,
					!E(o),
					E(o) ? 0 : o,
					J(G)
				);
				return 0 === w ? void 0 : P.__wrap(w);
			} finally {
				I[U++] = void 0;
			}
		}
		intersectionsWithPoint(g, C, B, Q, i, D, o, G, w) {
			try {
				a(g, AA),
					a(C, p),
					a(B, DA),
					A.rawquerypipeline_intersectionsWithPoint(
						this.__wbg_ptr,
						g.__wbg_ptr,
						C.__wbg_ptr,
						B.__wbg_ptr,
						J(Q),
						i,
						!E(D),
						E(D) ? 0 : D,
						!E(o),
						E(o) ? 0 : o,
						!E(G),
						E(G) ? 0 : G,
						J(w)
					);
			} finally {
				(I[U++] = void 0), (I[U++] = void 0);
			}
		}
		castShape(g, C, B, Q, i, D, o, G, w, S, k, h, K) {
			try {
				a(g, AA), a(C, p), a(B, DA), a(Q, IA), a(i, DA), a(D, BA);
				const y = A.rawquerypipeline_castShape(
					this.__wbg_ptr,
					g.__wbg_ptr,
					C.__wbg_ptr,
					B.__wbg_ptr,
					Q.__wbg_ptr,
					i.__wbg_ptr,
					D.__wbg_ptr,
					o,
					G,
					w,
					!E(S),
					E(S) ? 0 : S,
					!E(k),
					E(k) ? 0 : k,
					!E(h),
					E(h) ? 0 : h,
					J(K)
				);
				return 0 === y ? void 0 : QA.__wrap(y);
			} finally {
				I[U++] = void 0;
			}
		}
		intersectionsWithShape(g, C, B, Q, i, D, o, G, w, S, k) {
			try {
				a(g, AA),
					a(C, p),
					a(B, DA),
					a(Q, IA),
					a(i, BA),
					A.rawquerypipeline_intersectionsWithShape(
						this.__wbg_ptr,
						g.__wbg_ptr,
						C.__wbg_ptr,
						B.__wbg_ptr,
						Q.__wbg_ptr,
						i.__wbg_ptr,
						J(D),
						o,
						!E(G),
						E(G) ? 0 : G,
						!E(w),
						E(w) ? 0 : w,
						!E(S),
						E(S) ? 0 : S,
						J(k)
					);
			} finally {
				(I[U++] = void 0), (I[U++] = void 0);
			}
		}
		collidersWithAabbIntersectingAabb(g, C, B) {
			try {
				a(g, DA),
					a(C, DA),
					A.rawquerypipeline_collidersWithAabbIntersectingAabb(this.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr, J(B));
			} finally {
				I[U++] = void 0;
			}
		}
	}
	class z {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(z.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawraycolliderintersection_free(I);
		}
		colliderHandle() {
			return A.rawpointcolliderprojection_colliderHandle(this.__wbg_ptr);
		}
		normal() {
			const I = A.rawraycolliderintersection_normal(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		toi() {
			return A.rawraycolliderintersection_toi(this.__wbg_ptr);
		}
		featureType() {
			return A.rawpointcolliderprojection_featureType(this.__wbg_ptr);
		}
		featureId() {
			try {
				const C = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawpointcolliderprojection_featureId(C, this.__wbg_ptr);
				var I = G()[C / 4 + 0],
					g = G()[C / 4 + 1];
				return 0 === I ? void 0 : g >>> 0;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
	}
	class _ {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(_.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawraycollidertoi_free(I);
		}
		colliderHandle() {
			return A.rawcharactercollision_handle(this.__wbg_ptr);
		}
		toi() {
			return A.rawraycolliderintersection_toi(this.__wbg_ptr);
		}
	}
	class $ {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create($.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawrayintersection_free(I);
		}
		normal() {
			const I = A.rawraycolliderintersection_normal(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		toi() {
			return A.rawraycolliderintersection_toi(this.__wbg_ptr);
		}
		featureType() {
			return A.rawpointcolliderprojection_featureType(this.__wbg_ptr);
		}
		featureId() {
			try {
				const C = A.__wbindgen_add_to_stack_pointer(-16);
				A.rawpointcolliderprojection_featureId(C, this.__wbg_ptr);
				var I = G()[C / 4 + 0],
					g = G()[C / 4 + 1];
				return 0 === I ? void 0 : g >>> 0;
			} finally {
				A.__wbindgen_add_to_stack_pointer(16);
			}
		}
	}
	class AA {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(AA.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawrigidbodyset_free(I);
		}
		rbTranslation(I) {
			const g = A.rawrigidbodyset_rbTranslation(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		rbRotation(I) {
			const g = A.rawrigidbodyset_rbRotation(this.__wbg_ptr, I);
			return IA.__wrap(g);
		}
		rbSleep(I) {
			A.rawrigidbodyset_rbSleep(this.__wbg_ptr, I);
		}
		rbIsSleeping(I) {
			return 0 !== A.rawrigidbodyset_rbIsSleeping(this.__wbg_ptr, I);
		}
		rbIsMoving(I) {
			return 0 !== A.rawrigidbodyset_rbIsMoving(this.__wbg_ptr, I);
		}
		rbNextTranslation(I) {
			const g = A.rawrigidbodyset_rbNextTranslation(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		rbNextRotation(I) {
			const g = A.rawrigidbodyset_rbNextRotation(this.__wbg_ptr, I);
			return IA.__wrap(g);
		}
		rbSetTranslation(I, g, C, B, Q) {
			A.rawrigidbodyset_rbSetTranslation(this.__wbg_ptr, I, g, C, B, Q);
		}
		rbSetRotation(I, g, C, B, Q, E) {
			A.rawrigidbodyset_rbSetRotation(this.__wbg_ptr, I, g, C, B, Q, E);
		}
		rbSetLinvel(I, g, C) {
			a(g, DA), A.rawrigidbodyset_rbSetLinvel(this.__wbg_ptr, I, g.__wbg_ptr, C);
		}
		rbSetAngvel(I, g, C) {
			a(g, DA), A.rawrigidbodyset_rbSetAngvel(this.__wbg_ptr, I, g.__wbg_ptr, C);
		}
		rbSetNextKinematicTranslation(I, g, C, B) {
			A.rawrigidbodyset_rbSetNextKinematicTranslation(this.__wbg_ptr, I, g, C, B);
		}
		rbSetNextKinematicRotation(I, g, C, B, Q) {
			A.rawrigidbodyset_rbSetNextKinematicRotation(this.__wbg_ptr, I, g, C, B, Q);
		}
		rbRecomputeMassPropertiesFromColliders(I, g) {
			a(g, p), A.rawrigidbodyset_rbRecomputeMassPropertiesFromColliders(this.__wbg_ptr, I, g.__wbg_ptr);
		}
		rbSetAdditionalMass(I, g, C) {
			A.rawrigidbodyset_rbSetAdditionalMass(this.__wbg_ptr, I, g, C);
		}
		rbSetAdditionalMassProperties(I, g, C, B, Q, E) {
			a(C, DA),
				a(B, DA),
				a(Q, IA),
				A.rawrigidbodyset_rbSetAdditionalMassProperties(this.__wbg_ptr, I, g, C.__wbg_ptr, B.__wbg_ptr, Q.__wbg_ptr, E);
		}
		rbLinvel(I) {
			const g = A.rawrigidbodyset_rbLinvel(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		rbAngvel(I) {
			const g = A.rawrigidbodyset_rbAngvel(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		rbLockTranslations(I, g, C) {
			A.rawrigidbodyset_rbLockTranslations(this.__wbg_ptr, I, g, C);
		}
		rbSetEnabledTranslations(I, g, C, B, Q) {
			A.rawrigidbodyset_rbSetEnabledTranslations(this.__wbg_ptr, I, g, C, B, Q);
		}
		rbLockRotations(I, g, C) {
			A.rawrigidbodyset_rbLockRotations(this.__wbg_ptr, I, g, C);
		}
		rbSetEnabledRotations(I, g, C, B, Q) {
			A.rawrigidbodyset_rbSetEnabledRotations(this.__wbg_ptr, I, g, C, B, Q);
		}
		rbDominanceGroup(I) {
			return A.rawrigidbodyset_rbDominanceGroup(this.__wbg_ptr, I);
		}
		rbSetDominanceGroup(I, g) {
			A.rawrigidbodyset_rbSetDominanceGroup(this.__wbg_ptr, I, g);
		}
		rbEnableCcd(I, g) {
			A.rawrigidbodyset_rbEnableCcd(this.__wbg_ptr, I, g);
		}
		rbMass(I) {
			return A.rawrigidbodyset_rbMass(this.__wbg_ptr, I);
		}
		rbInvMass(I) {
			return A.rawrigidbodyset_rbInvMass(this.__wbg_ptr, I);
		}
		rbEffectiveInvMass(I) {
			const g = A.rawrigidbodyset_rbEffectiveInvMass(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		rbLocalCom(I) {
			const g = A.rawrigidbodyset_rbLocalCom(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		rbWorldCom(I) {
			const g = A.rawrigidbodyset_rbWorldCom(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		rbInvPrincipalInertiaSqrt(I) {
			const g = A.rawrigidbodyset_rbInvPrincipalInertiaSqrt(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		rbPrincipalInertiaLocalFrame(I) {
			const g = A.rawrigidbodyset_rbPrincipalInertiaLocalFrame(this.__wbg_ptr, I);
			return IA.__wrap(g);
		}
		rbPrincipalInertia(I) {
			const g = A.rawrigidbodyset_rbPrincipalInertia(this.__wbg_ptr, I);
			return DA.__wrap(g);
		}
		rbEffectiveWorldInvInertiaSqrt(I) {
			const g = A.rawrigidbodyset_rbEffectiveWorldInvInertiaSqrt(this.__wbg_ptr, I);
			return gA.__wrap(g);
		}
		rbEffectiveAngularInertia(I) {
			const g = A.rawrigidbodyset_rbEffectiveAngularInertia(this.__wbg_ptr, I);
			return gA.__wrap(g);
		}
		rbWakeUp(I) {
			A.rawrigidbodyset_rbWakeUp(this.__wbg_ptr, I);
		}
		rbIsCcdEnabled(I) {
			return 0 !== A.rawrigidbodyset_rbIsCcdEnabled(this.__wbg_ptr, I);
		}
		rbNumColliders(I) {
			return A.rawrigidbodyset_rbNumColliders(this.__wbg_ptr, I) >>> 0;
		}
		rbCollider(I, g) {
			return A.rawrigidbodyset_rbCollider(this.__wbg_ptr, I, g);
		}
		rbBodyType(I) {
			return A.rawrigidbodyset_rbBodyType(this.__wbg_ptr, I);
		}
		rbSetBodyType(I, g, C) {
			A.rawrigidbodyset_rbSetBodyType(this.__wbg_ptr, I, g, C);
		}
		rbIsFixed(I) {
			return 0 !== A.rawrigidbodyset_rbIsFixed(this.__wbg_ptr, I);
		}
		rbIsKinematic(I) {
			return 0 !== A.rawrigidbodyset_rbIsKinematic(this.__wbg_ptr, I);
		}
		rbIsDynamic(I) {
			return 0 !== A.rawrigidbodyset_rbIsDynamic(this.__wbg_ptr, I);
		}
		rbLinearDamping(I) {
			return A.rawrigidbodyset_rbLinearDamping(this.__wbg_ptr, I);
		}
		rbAngularDamping(I) {
			return A.rawrigidbodyset_rbAngularDamping(this.__wbg_ptr, I);
		}
		rbSetLinearDamping(I, g) {
			A.rawrigidbodyset_rbSetLinearDamping(this.__wbg_ptr, I, g);
		}
		rbSetAngularDamping(I, g) {
			A.rawrigidbodyset_rbSetAngularDamping(this.__wbg_ptr, I, g);
		}
		rbSetEnabled(I, g) {
			A.rawrigidbodyset_rbSetEnabled(this.__wbg_ptr, I, g);
		}
		rbIsEnabled(I) {
			return 0 !== A.rawrigidbodyset_rbIsEnabled(this.__wbg_ptr, I);
		}
		rbGravityScale(I) {
			return A.rawrigidbodyset_rbGravityScale(this.__wbg_ptr, I);
		}
		rbSetGravityScale(I, g, C) {
			A.rawrigidbodyset_rbSetGravityScale(this.__wbg_ptr, I, g, C);
		}
		rbResetForces(I, g) {
			A.rawrigidbodyset_rbResetForces(this.__wbg_ptr, I, g);
		}
		rbResetTorques(I, g) {
			A.rawrigidbodyset_rbResetTorques(this.__wbg_ptr, I, g);
		}
		rbAddForce(I, g, C) {
			a(g, DA), A.rawrigidbodyset_rbAddForce(this.__wbg_ptr, I, g.__wbg_ptr, C);
		}
		rbApplyImpulse(I, g, C) {
			a(g, DA), A.rawrigidbodyset_rbApplyImpulse(this.__wbg_ptr, I, g.__wbg_ptr, C);
		}
		rbAddTorque(I, g, C) {
			a(g, DA), A.rawrigidbodyset_rbAddTorque(this.__wbg_ptr, I, g.__wbg_ptr, C);
		}
		rbApplyTorqueImpulse(I, g, C) {
			a(g, DA), A.rawrigidbodyset_rbApplyTorqueImpulse(this.__wbg_ptr, I, g.__wbg_ptr, C);
		}
		rbAddForceAtPoint(I, g, C, B) {
			a(g, DA), a(C, DA), A.rawrigidbodyset_rbAddForceAtPoint(this.__wbg_ptr, I, g.__wbg_ptr, C.__wbg_ptr, B);
		}
		rbApplyImpulseAtPoint(I, g, C, B) {
			a(g, DA), a(C, DA), A.rawrigidbodyset_rbApplyImpulseAtPoint(this.__wbg_ptr, I, g.__wbg_ptr, C.__wbg_ptr, B);
		}
		rbAdditionalSolverIterations(I) {
			return A.rawrigidbodyset_rbAdditionalSolverIterations(this.__wbg_ptr, I) >>> 0;
		}
		rbSetAdditionalSolverIterations(I, g) {
			A.rawrigidbodyset_rbSetAdditionalSolverIterations(this.__wbg_ptr, I, g);
		}
		rbUserData(I) {
			return A.rawrigidbodyset_rbUserData(this.__wbg_ptr, I) >>> 0;
		}
		rbSetUserData(I, g) {
			A.rawrigidbodyset_rbSetUserData(this.__wbg_ptr, I, g);
		}
		constructor() {
			const I = A.rawrigidbodyset_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		createRigidBody(I, g, C, B, Q, E, i, D, o, G, w, S, k, h, K, U, J, y, N, M, F, q, R, s, c) {
			a(g, DA), a(C, IA), a(i, DA), a(D, DA), a(o, DA), a(G, DA), a(w, IA);
			return A.rawrigidbodyset_createRigidBody(
				this.__wbg_ptr,
				I,
				g.__wbg_ptr,
				C.__wbg_ptr,
				B,
				Q,
				E,
				i.__wbg_ptr,
				D.__wbg_ptr,
				o.__wbg_ptr,
				G.__wbg_ptr,
				w.__wbg_ptr,
				S,
				k,
				h,
				K,
				U,
				J,
				y,
				N,
				M,
				F,
				q,
				R,
				s,
				c
			);
		}
		remove(I, g, C, B, Q) {
			a(g, m),
				a(C, p),
				a(B, W),
				a(Q, f),
				A.rawrigidbodyset_remove(this.__wbg_ptr, I, g.__wbg_ptr, C.__wbg_ptr, B.__wbg_ptr, Q.__wbg_ptr);
		}
		len() {
			return A.rawcolliderset_len(this.__wbg_ptr) >>> 0;
		}
		contains(I) {
			return 0 !== A.rawrigidbodyset_contains(this.__wbg_ptr, I);
		}
		forEachRigidBodyHandle(g) {
			try {
				A.rawrigidbodyset_forEachRigidBodyHandle(this.__wbg_ptr, J(g));
			} finally {
				I[U++] = void 0;
			}
		}
		propagateModifiedBodyPositionsToColliders(I) {
			a(I, p), A.rawrigidbodyset_propagateModifiedBodyPositionsToColliders(this.__wbg_ptr, I.__wbg_ptr);
		}
	}
	class IA {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(IA.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawrotation_free(I);
		}
		constructor(I, g, C, B) {
			const Q = A.rawrotation_new(I, g, C, B);
			return (this.__wbg_ptr = Q >>> 0), this;
		}
		static identity() {
			const I = A.rawrotation_identity();
			return IA.__wrap(I);
		}
		get x() {
			return A.rawrotation_x(this.__wbg_ptr);
		}
		get y() {
			return A.rawintegrationparameters_dt(this.__wbg_ptr);
		}
		get z() {
			return A.rawraycolliderintersection_toi(this.__wbg_ptr);
		}
		get w() {
			return A.rawintegrationparameters_erp(this.__wbg_ptr);
		}
	}
	class gA {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(gA.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawsdpmatrix3_free(I);
		}
		elements() {
			return Q(A.rawsdpmatrix3_elements(this.__wbg_ptr));
		}
	}
	class CA {
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawserializationpipeline_free(I);
		}
		constructor() {
			const I = A.rawserializationpipeline_new();
			return (this.__wbg_ptr = I >>> 0), this;
		}
		serializeAll(I, g, C, B, E, i, D, o, G) {
			a(I, DA), a(g, x), a(C, m), a(B, l), a(E, X), a(i, AA), a(D, p), a(o, W), a(G, f);
			return Q(
				A.rawserializationpipeline_serializeAll(
					this.__wbg_ptr,
					I.__wbg_ptr,
					g.__wbg_ptr,
					C.__wbg_ptr,
					B.__wbg_ptr,
					E.__wbg_ptr,
					i.__wbg_ptr,
					D.__wbg_ptr,
					o.__wbg_ptr,
					G.__wbg_ptr
				)
			);
		}
		deserializeAll(I) {
			const g = A.rawserializationpipeline_deserializeAll(this.__wbg_ptr, C(I));
			return 0 === g ? void 0 : n.__wrap(g);
		}
	}
	class BA {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(BA.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawshape_free(I);
		}
		static cuboid(I, g, C) {
			const B = A.rawshape_cuboid(I, g, C);
			return BA.__wrap(B);
		}
		static roundCuboid(I, g, C, B) {
			const Q = A.rawshape_roundCuboid(I, g, C, B);
			return BA.__wrap(Q);
		}
		static ball(I) {
			const g = A.rawshape_ball(I);
			return BA.__wrap(g);
		}
		static halfspace(I) {
			a(I, DA);
			const g = A.rawshape_halfspace(I.__wbg_ptr);
			return BA.__wrap(g);
		}
		static capsule(I, g) {
			const C = A.rawshape_capsule(I, g);
			return BA.__wrap(C);
		}
		static cylinder(I, g) {
			const C = A.rawshape_cylinder(I, g);
			return BA.__wrap(C);
		}
		static roundCylinder(I, g, C) {
			const B = A.rawshape_roundCylinder(I, g, C);
			return BA.__wrap(B);
		}
		static cone(I, g) {
			const C = A.rawshape_cone(I, g);
			return BA.__wrap(C);
		}
		static roundCone(I, g, C) {
			const B = A.rawshape_roundCone(I, g, C);
			return BA.__wrap(B);
		}
		static polyline(I, g) {
			const C = q(I, A.__wbindgen_malloc),
				B = F,
				Q = R(g, A.__wbindgen_malloc),
				E = F,
				i = A.rawshape_polyline(C, B, Q, E);
			return BA.__wrap(i);
		}
		static trimesh(I, g) {
			const C = q(I, A.__wbindgen_malloc),
				B = F,
				Q = R(g, A.__wbindgen_malloc),
				E = F,
				i = A.rawshape_trimesh(C, B, Q, E);
			return BA.__wrap(i);
		}
		static heightfield(I, g, C, B) {
			const Q = q(C, A.__wbindgen_malloc),
				E = F;
			a(B, DA);
			const i = A.rawshape_heightfield(I, g, Q, E, B.__wbg_ptr);
			return BA.__wrap(i);
		}
		static segment(I, g) {
			a(I, DA), a(g, DA);
			const C = A.rawshape_segment(I.__wbg_ptr, g.__wbg_ptr);
			return BA.__wrap(C);
		}
		static triangle(I, g, C) {
			a(I, DA), a(g, DA), a(C, DA);
			const B = A.rawshape_triangle(I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr);
			return BA.__wrap(B);
		}
		static roundTriangle(I, g, C, B) {
			a(I, DA), a(g, DA), a(C, DA);
			const Q = A.rawshape_roundTriangle(I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr, B);
			return BA.__wrap(Q);
		}
		static convexHull(I) {
			const g = q(I, A.__wbindgen_malloc),
				C = F,
				B = A.rawshape_convexHull(g, C);
			return 0 === B ? void 0 : BA.__wrap(B);
		}
		static roundConvexHull(I, g) {
			const C = q(I, A.__wbindgen_malloc),
				B = F,
				Q = A.rawshape_roundConvexHull(C, B, g);
			return 0 === Q ? void 0 : BA.__wrap(Q);
		}
		static convexMesh(I, g) {
			const C = q(I, A.__wbindgen_malloc),
				B = F,
				Q = R(g, A.__wbindgen_malloc),
				E = F,
				i = A.rawshape_convexMesh(C, B, Q, E);
			return 0 === i ? void 0 : BA.__wrap(i);
		}
		static roundConvexMesh(I, g, C) {
			const B = q(I, A.__wbindgen_malloc),
				Q = F,
				E = R(g, A.__wbindgen_malloc),
				i = F,
				D = A.rawshape_roundConvexMesh(B, Q, E, i, C);
			return 0 === D ? void 0 : BA.__wrap(D);
		}
		castShape(I, g, C, B, Q, E, i, D, o) {
			a(I, DA), a(g, IA), a(C, DA), a(B, BA), a(Q, DA), a(E, IA), a(i, DA);
			const G = A.rawshape_castShape(
				this.__wbg_ptr,
				I.__wbg_ptr,
				g.__wbg_ptr,
				C.__wbg_ptr,
				B.__wbg_ptr,
				Q.__wbg_ptr,
				E.__wbg_ptr,
				i.__wbg_ptr,
				D,
				o
			);
			return 0 === G ? void 0 : iA.__wrap(G);
		}
		intersectsShape(I, g, C, B, Q) {
			a(I, DA), a(g, IA), a(C, BA), a(B, DA), a(Q, IA);
			return (
				0 !==
				A.rawshape_intersectsShape(this.__wbg_ptr, I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr, B.__wbg_ptr, Q.__wbg_ptr)
			);
		}
		contactShape(I, g, C, B, Q, E) {
			a(I, DA), a(g, IA), a(C, BA), a(B, DA), a(Q, IA);
			const i = A.rawshape_contactShape(
				this.__wbg_ptr,
				I.__wbg_ptr,
				g.__wbg_ptr,
				C.__wbg_ptr,
				B.__wbg_ptr,
				Q.__wbg_ptr,
				E
			);
			return 0 === i ? void 0 : EA.__wrap(i);
		}
		containsPoint(I, g, C) {
			a(I, DA), a(g, IA), a(C, DA);
			return 0 !== A.rawshape_containsPoint(this.__wbg_ptr, I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr);
		}
		projectPoint(I, g, C, B) {
			a(I, DA), a(g, IA), a(C, DA);
			const Q = A.rawshape_projectPoint(this.__wbg_ptr, I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr, B);
			return u.__wrap(Q);
		}
		intersectsRay(I, g, C, B, Q) {
			a(I, DA), a(g, IA), a(C, DA), a(B, DA);
			return 0 !== A.rawshape_intersectsRay(this.__wbg_ptr, I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr, B.__wbg_ptr, Q);
		}
		castRay(I, g, C, B, Q, E) {
			a(I, DA), a(g, IA), a(C, DA), a(B, DA);
			return A.rawshape_castRay(this.__wbg_ptr, I.__wbg_ptr, g.__wbg_ptr, C.__wbg_ptr, B.__wbg_ptr, Q, E);
		}
		castRayAndGetNormal(I, g, C, B, Q, E) {
			a(I, DA), a(g, IA), a(C, DA), a(B, DA);
			const i = A.rawshape_castRayAndGetNormal(
				this.__wbg_ptr,
				I.__wbg_ptr,
				g.__wbg_ptr,
				C.__wbg_ptr,
				B.__wbg_ptr,
				Q,
				E
			);
			return 0 === i ? void 0 : $.__wrap(i);
		}
	}
	class QA {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(QA.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawshapecollidertoi_free(I);
		}
		colliderHandle() {
			return A.rawcharactercollision_handle(this.__wbg_ptr);
		}
		toi() {
			return A.rawraycolliderintersection_toi(this.__wbg_ptr);
		}
		witness1() {
			const I = A.rawraycolliderintersection_normal(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		witness2() {
			const I = A.rawshapecollidertoi_witness2(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		normal1() {
			const I = A.rawcharactercollision_translationDeltaApplied(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		normal2() {
			const I = A.rawcharactercollision_translationDeltaRemaining(this.__wbg_ptr);
			return DA.__wrap(I);
		}
	}
	class EA {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(EA.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawshapecontact_free(I);
		}
		distance() {
			return A.rawkinematiccharactercontroller_maxSlopeClimbAngle(this.__wbg_ptr);
		}
		point1() {
			const I = A.rawpointprojection_point(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		point2() {
			const I = A.rawraycolliderintersection_normal(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		normal1() {
			const I = A.rawshapecollidertoi_witness2(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		normal2() {
			const I = A.rawcharactercollision_translationDeltaApplied(this.__wbg_ptr);
			return DA.__wrap(I);
		}
	}
	class iA {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(iA.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawshapetoi_free(I);
		}
		toi() {
			return A.rawrotation_x(this.__wbg_ptr);
		}
		witness1() {
			const I = A.rawshapetoi_witness1(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		witness2() {
			const I = A.rawcontactforceevent_total_force(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		normal1() {
			const I = A.rawshapetoi_normal1(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		normal2() {
			const I = A.rawshapetoi_normal2(this.__wbg_ptr);
			return DA.__wrap(I);
		}
	}
	class DA {
		static __wrap(A) {
			A >>>= 0;
			const I = Object.create(DA.prototype);
			return (I.__wbg_ptr = A), I;
		}
		__destroy_into_raw() {
			const A = this.__wbg_ptr;
			return (this.__wbg_ptr = 0), A;
		}
		free() {
			const I = this.__destroy_into_raw();
			A.__wbg_rawvector_free(I);
		}
		static zero() {
			const I = A.rawvector_zero();
			return DA.__wrap(I);
		}
		constructor(I, g, C) {
			const B = A.rawvector_new(I, g, C);
			return (this.__wbg_ptr = B >>> 0), this;
		}
		get x() {
			return A.rawrotation_x(this.__wbg_ptr);
		}
		set x(I) {
			A.rawvector_set_x(this.__wbg_ptr, I);
		}
		get y() {
			return A.rawintegrationparameters_dt(this.__wbg_ptr);
		}
		set y(I) {
			A.rawintegrationparameters_set_dt(this.__wbg_ptr, I);
		}
		get z() {
			return A.rawraycolliderintersection_toi(this.__wbg_ptr);
		}
		set z(I) {
			A.rawvector_set_z(this.__wbg_ptr, I);
		}
		xyz() {
			const I = A.rawvector_xyz(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		yxz() {
			const I = A.rawvector_yxz(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		zxy() {
			const I = A.rawvector_zxy(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		xzy() {
			const I = A.rawvector_xzy(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		yzx() {
			const I = A.rawvector_yzx(this.__wbg_ptr);
			return DA.__wrap(I);
		}
		zyx() {
			const I = A.rawvector_zyx(this.__wbg_ptr);
			return DA.__wrap(I);
		}
	}
	async function oA(I) {
		if (void 0 !== A) return A;
		void 0 === I && (I = new URL('rapier_wasm3d_bg.wasm', '<deleted>'));
		const g = (function () {
			const I = { wbg: {} };
			return (
				(I.wbg.__wbindgen_number_new = function (A) {
					return C(A);
				}),
				(I.wbg.__wbindgen_boolean_get = function (A) {
					const I = B(A);
					return 'boolean' == typeof I ? (I ? 1 : 0) : 2;
				}),
				(I.wbg.__wbindgen_object_drop_ref = function (A) {
					Q(A);
				}),
				(I.wbg.__wbindgen_number_get = function (A, I) {
					const g = B(I),
						C = 'number' == typeof g ? g : void 0;
					(D()[A / 8 + 1] = E(C) ? 0 : C), (G()[A / 4 + 0] = !E(C));
				}),
				(I.wbg.__wbindgen_is_function = function (A) {
					return 'function' == typeof B(A);
				}),
				(I.wbg.__wbg_rawraycolliderintersection_new = function (A) {
					return C(z.__wrap(A));
				}),
				(I.wbg.__wbg_rawcontactforceevent_new = function (A) {
					return C(e.__wrap(A));
				}),
				(I.wbg.__wbg_call_01734de55d61e11d = function () {
					return s(function (A, I, g) {
						return C(B(A).call(B(I), B(g)));
					}, arguments);
				}),
				(I.wbg.__wbg_call_4c92f6aec1e1d6e6 = function () {
					return s(function (A, I, g, Q) {
						return C(B(A).call(B(I), B(g), B(Q)));
					}, arguments);
				}),
				(I.wbg.__wbg_call_776890ca77946e2f = function () {
					return s(function (A, I, g, Q, E) {
						return C(B(A).call(B(I), B(g), B(Q), B(E)));
					}, arguments);
				}),
				(I.wbg.__wbg_bind_60a9a80cada2f33c = function (A, I, g, Q) {
					return C(B(A).bind(B(I), B(g), B(Q)));
				}),
				(I.wbg.__wbg_buffer_085ec1f694018c4f = function (A) {
					return C(B(A).buffer);
				}),
				(I.wbg.__wbg_newwithbyteoffsetandlength_6da8e527659b86aa = function (A, I, g) {
					return C(new Uint8Array(B(A), I >>> 0, g >>> 0));
				}),
				(I.wbg.__wbg_new_8125e318e6245eed = function (A) {
					return C(new Uint8Array(B(A)));
				}),
				(I.wbg.__wbg_set_5cf90238115182c3 = function (A, I, g) {
					B(A).set(B(I), g >>> 0);
				}),
				(I.wbg.__wbg_length_72e2208bbc0efc61 = function (A) {
					return B(A).length;
				}),
				(I.wbg.__wbg_newwithbyteoffsetandlength_69193e31c844b792 = function (A, I, g) {
					return C(new Float32Array(B(A), I >>> 0, g >>> 0));
				}),
				(I.wbg.__wbg_set_6146c51d49a2c0df = function (A, I, g) {
					B(A).set(B(I), g >>> 0);
				}),
				(I.wbg.__wbg_length_d7327c75a759af37 = function (A) {
					return B(A).length;
				}),
				(I.wbg.__wbg_newwithlength_68d29ab115d0099c = function (A) {
					return C(new Float32Array(A >>> 0));
				}),
				(I.wbg.__wbindgen_throw = function (A, I) {
					throw new Error(k(A, I));
				}),
				(I.wbg.__wbindgen_memory = function () {
					return C(A.memory);
				}),
				I
			);
		})();
		('string' == typeof I ||
			('function' == typeof Request && I instanceof Request) ||
			('function' == typeof URL && I instanceof URL)) &&
			(I = fetch(I));
		const { instance: w, module: a } = await (async function (A, I) {
			if ('function' == typeof Response && A instanceof Response) {
				if ('function' == typeof WebAssembly.instantiateStreaming)
					try {
						return await WebAssembly.instantiateStreaming(A, I);
					} catch (I) {
						if ('application/wasm' == A.headers.get('Content-Type')) throw I;
						console.warn(
							'`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n',
							I
						);
					}
				const g = await A.arrayBuffer();
				return await WebAssembly.instantiate(g, I);
			}
			{
				const g = await WebAssembly.instantiate(A, I);
				return g instanceof WebAssembly.Instance ? { instance: g, module: A } : g;
			}
		})(await I, g);
		return (function (I, g) {
			return (
				(A = I.exports), (oA.__wbindgen_wasm_module = g), (h = null), (i = null), (o = null), (N = null), (S = null), A
			);
		})(w, a);
	}
	class GA {
		constructor(A, I, g) {
			(this.x = A), (this.y = I), (this.z = g);
		}
	}
	class wA {
		static new(A, I, g) {
			return new GA(A, I, g);
		}
		static intoRaw(A) {
			return new DA(A.x, A.y, A.z);
		}
		static zeros() {
			return wA.new(0, 0, 0);
		}
		static fromRaw(A) {
			if (!A) return null;
			let I = wA.new(A.x, A.y, A.z);
			return A.free(), I;
		}
		static copy(A, I) {
			(A.x = I.x), (A.y = I.y), (A.z = I.z);
		}
	}
	class SA {
		constructor(A, I, g, C) {
			(this.x = A), (this.y = I), (this.z = g), (this.w = C);
		}
	}
	class kA {
		static identity() {
			return new SA(0, 0, 0, 1);
		}
		static fromRaw(A) {
			if (!A) return null;
			let I = new SA(A.x, A.y, A.z, A.w);
			return A.free(), I;
		}
		static intoRaw(A) {
			return new IA(A.x, A.y, A.z, A.w);
		}
		static copy(A, I) {
			(A.x = I.x), (A.y = I.y), (A.z = I.z), (A.w = I.w);
		}
	}
	class aA {
		constructor(A) {
			this.elements = A;
		}
		get m11() {
			return this.elements[0];
		}
		get m12() {
			return this.elements[1];
		}
		get m21() {
			return this.m12;
		}
		get m13() {
			return this.elements[2];
		}
		get m31() {
			return this.m13;
		}
		get m22() {
			return this.elements[3];
		}
		get m23() {
			return this.elements[4];
		}
		get m32() {
			return this.m23;
		}
		get m33() {
			return this.elements[5];
		}
	}
	class hA {
		static fromRaw(A) {
			const I = new aA(A.elements());
			return A.free(), I;
		}
	}
	var KA, UA, JA, yA, NA, MA, FA, qA, RA, sA, cA, YA, HA;
	(exports.RigidBodyType = void 0),
		((KA = exports.RigidBodyType || (exports.RigidBodyType = {}))[(KA.Dynamic = 0)] = 'Dynamic'),
		(KA[(KA.Fixed = 1)] = 'Fixed'),
		(KA[(KA.KinematicPositionBased = 2)] = 'KinematicPositionBased'),
		(KA[(KA.KinematicVelocityBased = 3)] = 'KinematicVelocityBased');
	class lA {
		constructor(A, I, g) {
			(this.rawSet = A), (this.colliderSet = I), (this.handle = g);
		}
		finalizeDeserialization(A) {
			this.colliderSet = A;
		}
		isValid() {
			return this.rawSet.contains(this.handle);
		}
		lockTranslations(A, I) {
			return this.rawSet.rbLockTranslations(this.handle, A, I);
		}
		lockRotations(A, I) {
			return this.rawSet.rbLockRotations(this.handle, A, I);
		}
		setEnabledTranslations(A, I, g, C) {
			return this.rawSet.rbSetEnabledTranslations(this.handle, A, I, g, C);
		}
		restrictTranslations(A, I, g, C) {
			this.setEnabledTranslations(A, I, g, C);
		}
		setEnabledRotations(A, I, g, C) {
			return this.rawSet.rbSetEnabledRotations(this.handle, A, I, g, C);
		}
		restrictRotations(A, I, g, C) {
			this.setEnabledRotations(A, I, g, C);
		}
		dominanceGroup() {
			return this.rawSet.rbDominanceGroup(this.handle);
		}
		setDominanceGroup(A) {
			this.rawSet.rbSetDominanceGroup(this.handle, A);
		}
		additionalSolverIterations() {
			return this.rawSet.rbAdditionalSolverIterations(this.handle);
		}
		setAdditionalSolverIterations(A) {
			this.rawSet.rbSetAdditionalSolverIterations(this.handle, A);
		}
		enableCcd(A) {
			this.rawSet.rbEnableCcd(this.handle, A);
		}
		translation() {
			let A = this.rawSet.rbTranslation(this.handle);
			return wA.fromRaw(A);
		}
		rotation() {
			let A = this.rawSet.rbRotation(this.handle);
			return kA.fromRaw(A);
		}
		nextTranslation() {
			let A = this.rawSet.rbNextTranslation(this.handle);
			return wA.fromRaw(A);
		}
		nextRotation() {
			let A = this.rawSet.rbNextRotation(this.handle);
			return kA.fromRaw(A);
		}
		setTranslation(A, I) {
			this.rawSet.rbSetTranslation(this.handle, A.x, A.y, A.z, I);
		}
		setLinvel(A, I) {
			let g = wA.intoRaw(A);
			this.rawSet.rbSetLinvel(this.handle, g, I), g.free();
		}
		gravityScale() {
			return this.rawSet.rbGravityScale(this.handle);
		}
		setGravityScale(A, I) {
			this.rawSet.rbSetGravityScale(this.handle, A, I);
		}
		setRotation(A, I) {
			this.rawSet.rbSetRotation(this.handle, A.x, A.y, A.z, A.w, I);
		}
		setAngvel(A, I) {
			let g = wA.intoRaw(A);
			this.rawSet.rbSetAngvel(this.handle, g, I), g.free();
		}
		setNextKinematicTranslation(A) {
			this.rawSet.rbSetNextKinematicTranslation(this.handle, A.x, A.y, A.z);
		}
		setNextKinematicRotation(A) {
			this.rawSet.rbSetNextKinematicRotation(this.handle, A.x, A.y, A.z, A.w);
		}
		linvel() {
			return wA.fromRaw(this.rawSet.rbLinvel(this.handle));
		}
		angvel() {
			return wA.fromRaw(this.rawSet.rbAngvel(this.handle));
		}
		mass() {
			return this.rawSet.rbMass(this.handle);
		}
		effectiveInvMass() {
			return wA.fromRaw(this.rawSet.rbEffectiveInvMass(this.handle));
		}
		invMass() {
			return this.rawSet.rbInvMass(this.handle);
		}
		localCom() {
			return wA.fromRaw(this.rawSet.rbLocalCom(this.handle));
		}
		worldCom() {
			return wA.fromRaw(this.rawSet.rbWorldCom(this.handle));
		}
		invPrincipalInertiaSqrt() {
			return wA.fromRaw(this.rawSet.rbInvPrincipalInertiaSqrt(this.handle));
		}
		principalInertia() {
			return wA.fromRaw(this.rawSet.rbPrincipalInertia(this.handle));
		}
		principalInertiaLocalFrame() {
			return kA.fromRaw(this.rawSet.rbPrincipalInertiaLocalFrame(this.handle));
		}
		effectiveWorldInvInertiaSqrt() {
			return hA.fromRaw(this.rawSet.rbEffectiveWorldInvInertiaSqrt(this.handle));
		}
		effectiveAngularInertia() {
			return hA.fromRaw(this.rawSet.rbEffectiveAngularInertia(this.handle));
		}
		sleep() {
			this.rawSet.rbSleep(this.handle);
		}
		wakeUp() {
			this.rawSet.rbWakeUp(this.handle);
		}
		isCcdEnabled() {
			return this.rawSet.rbIsCcdEnabled(this.handle);
		}
		numColliders() {
			return this.rawSet.rbNumColliders(this.handle);
		}
		collider(A) {
			return this.colliderSet.get(this.rawSet.rbCollider(this.handle, A));
		}
		setEnabled(A) {
			this.rawSet.rbSetEnabled(this.handle, A);
		}
		isEnabled() {
			return this.rawSet.rbIsEnabled(this.handle);
		}
		bodyType() {
			return this.rawSet.rbBodyType(this.handle);
		}
		setBodyType(A, I) {
			return this.rawSet.rbSetBodyType(this.handle, A, I);
		}
		isSleeping() {
			return this.rawSet.rbIsSleeping(this.handle);
		}
		isMoving() {
			return this.rawSet.rbIsMoving(this.handle);
		}
		isFixed() {
			return this.rawSet.rbIsFixed(this.handle);
		}
		isKinematic() {
			return this.rawSet.rbIsKinematic(this.handle);
		}
		isDynamic() {
			return this.rawSet.rbIsDynamic(this.handle);
		}
		linearDamping() {
			return this.rawSet.rbLinearDamping(this.handle);
		}
		angularDamping() {
			return this.rawSet.rbAngularDamping(this.handle);
		}
		setLinearDamping(A) {
			this.rawSet.rbSetLinearDamping(this.handle, A);
		}
		recomputeMassPropertiesFromColliders() {
			this.rawSet.rbRecomputeMassPropertiesFromColliders(this.handle, this.colliderSet.raw);
		}
		setAdditionalMass(A, I) {
			this.rawSet.rbSetAdditionalMass(this.handle, A, I);
		}
		setAdditionalMassProperties(A, I, g, C, B) {
			let Q = wA.intoRaw(I),
				E = wA.intoRaw(g),
				i = kA.intoRaw(C);
			this.rawSet.rbSetAdditionalMassProperties(this.handle, A, Q, E, i, B), Q.free(), E.free(), i.free();
		}
		setAngularDamping(A) {
			this.rawSet.rbSetAngularDamping(this.handle, A);
		}
		resetForces(A) {
			this.rawSet.rbResetForces(this.handle, A);
		}
		resetTorques(A) {
			this.rawSet.rbResetTorques(this.handle, A);
		}
		addForce(A, I) {
			const g = wA.intoRaw(A);
			this.rawSet.rbAddForce(this.handle, g, I), g.free();
		}
		applyImpulse(A, I) {
			const g = wA.intoRaw(A);
			this.rawSet.rbApplyImpulse(this.handle, g, I), g.free();
		}
		addTorque(A, I) {
			const g = wA.intoRaw(A);
			this.rawSet.rbAddTorque(this.handle, g, I), g.free();
		}
		applyTorqueImpulse(A, I) {
			const g = wA.intoRaw(A);
			this.rawSet.rbApplyTorqueImpulse(this.handle, g, I), g.free();
		}
		addForceAtPoint(A, I, g) {
			const C = wA.intoRaw(A),
				B = wA.intoRaw(I);
			this.rawSet.rbAddForceAtPoint(this.handle, C, B, g), C.free(), B.free();
		}
		applyImpulseAtPoint(A, I, g) {
			const C = wA.intoRaw(A),
				B = wA.intoRaw(I);
			this.rawSet.rbApplyImpulseAtPoint(this.handle, C, B, g), C.free(), B.free();
		}
	}
	class LA {
		constructor(A) {
			(this.enabled = !0),
				(this.status = A),
				(this.translation = wA.zeros()),
				(this.rotation = kA.identity()),
				(this.gravityScale = 1),
				(this.linvel = wA.zeros()),
				(this.mass = 0),
				(this.massOnly = !1),
				(this.centerOfMass = wA.zeros()),
				(this.translationsEnabledX = !0),
				(this.translationsEnabledY = !0),
				(this.angvel = wA.zeros()),
				(this.principalAngularInertia = wA.zeros()),
				(this.angularInertiaLocalFrame = kA.identity()),
				(this.translationsEnabledZ = !0),
				(this.rotationsEnabledX = !0),
				(this.rotationsEnabledY = !0),
				(this.rotationsEnabledZ = !0),
				(this.linearDamping = 0),
				(this.angularDamping = 0),
				(this.canSleep = !0),
				(this.sleeping = !1),
				(this.ccdEnabled = !1),
				(this.dominanceGroup = 0),
				(this.additionalSolverIterations = 0);
		}
		static dynamic() {
			return new LA(exports.RigidBodyType.Dynamic);
		}
		static kinematicPositionBased() {
			return new LA(exports.RigidBodyType.KinematicPositionBased);
		}
		static kinematicVelocityBased() {
			return new LA(exports.RigidBodyType.KinematicVelocityBased);
		}
		static fixed() {
			return new LA(exports.RigidBodyType.Fixed);
		}
		static newDynamic() {
			return new LA(exports.RigidBodyType.Dynamic);
		}
		static newKinematicPositionBased() {
			return new LA(exports.RigidBodyType.KinematicPositionBased);
		}
		static newKinematicVelocityBased() {
			return new LA(exports.RigidBodyType.KinematicVelocityBased);
		}
		static newStatic() {
			return new LA(exports.RigidBodyType.Fixed);
		}
		setDominanceGroup(A) {
			return (this.dominanceGroup = A), this;
		}
		setAdditionalSolverIterations(A) {
			return (this.additionalSolverIterations = A), this;
		}
		setEnabled(A) {
			return (this.enabled = A), this;
		}
		setTranslation(A, I, g) {
			if ('number' != typeof A || 'number' != typeof I || 'number' != typeof g)
				throw TypeError('The translation components must be numbers.');
			return (this.translation = { x: A, y: I, z: g }), this;
		}
		setRotation(A) {
			return kA.copy(this.rotation, A), this;
		}
		setGravityScale(A) {
			return (this.gravityScale = A), this;
		}
		setAdditionalMass(A) {
			return (this.mass = A), (this.massOnly = !0), this;
		}
		setLinvel(A, I, g) {
			if ('number' != typeof A || 'number' != typeof I || 'number' != typeof g)
				throw TypeError('The linvel components must be numbers.');
			return (this.linvel = { x: A, y: I, z: g }), this;
		}
		setAngvel(A) {
			return wA.copy(this.angvel, A), this;
		}
		setAdditionalMassProperties(A, I, g, C) {
			return (
				(this.mass = A),
				wA.copy(this.centerOfMass, I),
				wA.copy(this.principalAngularInertia, g),
				kA.copy(this.angularInertiaLocalFrame, C),
				(this.massOnly = !1),
				this
			);
		}
		enabledTranslations(A, I, g) {
			return (this.translationsEnabledX = A), (this.translationsEnabledY = I), (this.translationsEnabledZ = g), this;
		}
		restrictTranslations(A, I, g) {
			return this.enabledTranslations(A, I, g);
		}
		lockTranslations() {
			return this.enabledTranslations(!1, !1, !1);
		}
		enabledRotations(A, I, g) {
			return (this.rotationsEnabledX = A), (this.rotationsEnabledY = I), (this.rotationsEnabledZ = g), this;
		}
		restrictRotations(A, I, g) {
			return this.enabledRotations(A, I, g);
		}
		lockRotations() {
			return this.restrictRotations(!1, !1, !1);
		}
		setLinearDamping(A) {
			return (this.linearDamping = A), this;
		}
		setAngularDamping(A) {
			return (this.angularDamping = A), this;
		}
		setCanSleep(A) {
			return (this.canSleep = A), this;
		}
		setSleeping(A) {
			return (this.sleeping = A), this;
		}
		setCcdEnabled(A) {
			return (this.ccdEnabled = A), this;
		}
		setUserData(A) {
			return (this.userData = A), this;
		}
	}
	class tA {
		constructor() {
			(this.fconv = new Float64Array(1)),
				(this.uconv = new Uint32Array(this.fconv.buffer)),
				(this.data = new Array()),
				(this.size = 0);
		}
		set(A, I) {
			let g = this.index(A);
			for (; this.data.length <= g; ) this.data.push(null);
			null == this.data[g] && (this.size += 1), (this.data[g] = I);
		}
		len() {
			return this.size;
		}
		delete(A) {
			let I = this.index(A);
			I < this.data.length && (null != this.data[I] && (this.size -= 1), (this.data[I] = null));
		}
		clear() {
			this.data = new Array();
		}
		get(A) {
			let I = this.index(A);
			return I < this.data.length ? this.data[I] : null;
		}
		forEach(A) {
			for (const I of this.data) null != I && A(I);
		}
		getAll() {
			return this.data.filter((A) => null != A);
		}
		index(A) {
			return (this.fconv[0] = A), this.uconv[0];
		}
	}
	class pA {
		constructor(A) {
			(this.raw = A || new AA()),
				(this.map = new tA()),
				A &&
					A.forEachRigidBodyHandle((I) => {
						this.map.set(I, new lA(A, null, I));
					});
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0), this.map && this.map.clear(), (this.map = void 0);
		}
		finalizeDeserialization(A) {
			this.map.forEach((I) => I.finalizeDeserialization(A));
		}
		createRigidBody(A, I) {
			let g = wA.intoRaw(I.translation),
				C = kA.intoRaw(I.rotation),
				B = wA.intoRaw(I.linvel),
				Q = wA.intoRaw(I.centerOfMass),
				E = wA.intoRaw(I.angvel),
				i = wA.intoRaw(I.principalAngularInertia),
				D = kA.intoRaw(I.angularInertiaLocalFrame),
				o = this.raw.createRigidBody(
					I.enabled,
					g,
					C,
					I.gravityScale,
					I.mass,
					I.massOnly,
					Q,
					B,
					E,
					i,
					D,
					I.translationsEnabledX,
					I.translationsEnabledY,
					I.translationsEnabledZ,
					I.rotationsEnabledX,
					I.rotationsEnabledY,
					I.rotationsEnabledZ,
					I.linearDamping,
					I.angularDamping,
					I.status,
					I.canSleep,
					I.sleeping,
					I.ccdEnabled,
					I.dominanceGroup,
					I.additionalSolverIterations
				);
			g.free(), C.free(), B.free(), Q.free(), E.free(), i.free(), D.free();
			const G = new lA(this.raw, A, o);
			return (G.userData = I.userData), this.map.set(o, G), G;
		}
		remove(A, I, g, C, B) {
			for (let I = 0; I < this.raw.rbNumColliders(A); I += 1) g.unmap(this.raw.rbCollider(A, I));
			C.forEachJointHandleAttachedToRigidBody(A, (A) => C.unmap(A)),
				B.forEachJointHandleAttachedToRigidBody(A, (A) => B.unmap(A)),
				this.raw.remove(A, I.raw, g.raw, C.raw, B.raw),
				this.map.delete(A);
		}
		len() {
			return this.map.len();
		}
		contains(A) {
			return null != this.get(A);
		}
		get(A) {
			return this.map.get(A);
		}
		forEach(A) {
			this.map.forEach(A);
		}
		forEachActiveRigidBody(A, I) {
			A.forEachActiveRigidBodyHandle((A) => {
				I(this.get(A));
			});
		}
		getAll() {
			return this.map.getAll();
		}
	}
	class eA {
		constructor(A) {
			this.raw = A || new x();
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
		get dt() {
			return this.raw.dt;
		}
		get erp() {
			return this.raw.erp;
		}
		get allowedLinearError() {
			return this.raw.allowedLinearError;
		}
		get predictionDistance() {
			return this.raw.predictionDistance;
		}
		get numSolverIterations() {
			return this.raw.numSolverIterations;
		}
		get numAdditionalFrictionIterations() {
			return this.raw.numAdditionalFrictionIterations;
		}
		get numInternalPgsIterations() {
			return this.raw.numInternalPgsIterations;
		}
		get minIslandSize() {
			return this.raw.minIslandSize;
		}
		get maxCcdSubsteps() {
			return this.raw.maxCcdSubsteps;
		}
		set dt(A) {
			this.raw.dt = A;
		}
		set erp(A) {
			this.raw.erp = A;
		}
		set allowedLinearError(A) {
			this.raw.allowedLinearError = A;
		}
		set predictionDistance(A) {
			this.raw.predictionDistance = A;
		}
		set numSolverIterations(A) {
			this.raw.numSolverIterations = A;
		}
		set numAdditionalFrictionIterations(A) {
			this.raw.numAdditionalFrictionIterations = A;
		}
		set numInternalPgsIterations(A) {
			this.raw.numInternalPgsIterations = A;
		}
		set minIslandSize(A) {
			this.raw.minIslandSize = A;
		}
		set maxCcdSubsteps(A) {
			this.raw.maxCcdSubsteps = A;
		}
		switchToStandardPgsSolver() {
			this.raw.switchToStandardPgsSolver();
		}
		switchToSmallStepsPgsSolver() {
			this.raw.switchToSmallStepsPgsSolver();
		}
	}
	(exports.JointType = void 0),
		((UA = exports.JointType || (exports.JointType = {}))[(UA.Revolute = 0)] = 'Revolute'),
		(UA[(UA.Fixed = 1)] = 'Fixed'),
		(UA[(UA.Prismatic = 2)] = 'Prismatic'),
		(UA[(UA.Rope = 3)] = 'Rope'),
		(UA[(UA.Spring = 4)] = 'Spring'),
		(UA[(UA.Spherical = 5)] = 'Spherical'),
		(UA[(UA.Generic = 6)] = 'Generic'),
		(exports.MotorModel = void 0),
		((JA = exports.MotorModel || (exports.MotorModel = {}))[(JA.AccelerationBased = 0)] = 'AccelerationBased'),
		(JA[(JA.ForceBased = 1)] = 'ForceBased'),
		(exports.JointAxesMask = void 0),
		((yA = exports.JointAxesMask || (exports.JointAxesMask = {}))[(yA.X = 1)] = 'X'),
		(yA[(yA.Y = 2)] = 'Y'),
		(yA[(yA.Z = 4)] = 'Z'),
		(yA[(yA.AngX = 8)] = 'AngX'),
		(yA[(yA.AngY = 16)] = 'AngY'),
		(yA[(yA.AngZ = 32)] = 'AngZ');
	class rA {
		constructor(A, I, g) {
			(this.rawSet = A), (this.bodySet = I), (this.handle = g);
		}
		static newTyped(A, I, g) {
			switch (A.jointType(g)) {
				case H.Revolute:
					return new bA(A, I, g);
				case H.Prismatic:
					return new ZA(A, I, g);
				case H.Fixed:
					return new TA(A, I, g);
				case H.Spring:
					return new OA(A, I, g);
				case H.Rope:
					return new nA(A, I, g);
				case H.Spherical:
					return new xA(A, I, g);
				case H.Generic:
					return new WA(A, I, g);
				default:
					return new rA(A, I, g);
			}
		}
		finalizeDeserialization(A) {
			this.bodySet = A;
		}
		isValid() {
			return this.rawSet.contains(this.handle);
		}
		body1() {
			return this.bodySet.get(this.rawSet.jointBodyHandle1(this.handle));
		}
		body2() {
			return this.bodySet.get(this.rawSet.jointBodyHandle2(this.handle));
		}
		type() {
			return this.rawSet.jointType(this.handle);
		}
		frameX1() {
			return kA.fromRaw(this.rawSet.jointFrameX1(this.handle));
		}
		frameX2() {
			return kA.fromRaw(this.rawSet.jointFrameX2(this.handle));
		}
		anchor1() {
			return wA.fromRaw(this.rawSet.jointAnchor1(this.handle));
		}
		anchor2() {
			return wA.fromRaw(this.rawSet.jointAnchor2(this.handle));
		}
		setAnchor1(A) {
			const I = wA.intoRaw(A);
			this.rawSet.jointSetAnchor1(this.handle, I), I.free();
		}
		setAnchor2(A) {
			const I = wA.intoRaw(A);
			this.rawSet.jointSetAnchor2(this.handle, I), I.free();
		}
		setContactsEnabled(A) {
			this.rawSet.jointSetContactsEnabled(this.handle, A);
		}
		contactsEnabled() {
			return this.rawSet.jointContactsEnabled(this.handle);
		}
	}
	class dA extends rA {
		limitsEnabled() {
			return this.rawSet.jointLimitsEnabled(this.handle, this.rawAxis());
		}
		limitsMin() {
			return this.rawSet.jointLimitsMin(this.handle, this.rawAxis());
		}
		limitsMax() {
			return this.rawSet.jointLimitsMax(this.handle, this.rawAxis());
		}
		setLimits(A, I) {
			this.rawSet.jointSetLimits(this.handle, this.rawAxis(), A, I);
		}
		configureMotorModel(A) {
			this.rawSet.jointConfigureMotorModel(this.handle, this.rawAxis(), A);
		}
		configureMotorVelocity(A, I) {
			this.rawSet.jointConfigureMotorVelocity(this.handle, this.rawAxis(), A, I);
		}
		configureMotorPosition(A, I, g) {
			this.rawSet.jointConfigureMotorPosition(this.handle, this.rawAxis(), A, I, g);
		}
		configureMotor(A, I, g, C) {
			this.rawSet.jointConfigureMotor(this.handle, this.rawAxis(), A, I, g, C);
		}
	}
	class TA extends rA {}
	class nA extends rA {}
	class OA extends rA {}
	class ZA extends dA {
		rawAxis() {
			return Y.X;
		}
	}
	class bA extends dA {
		rawAxis() {
			return Y.AngX;
		}
	}
	class WA extends rA {}
	class xA extends rA {}
	class mA {
		constructor() {}
		static fixed(A, I, g, C) {
			let B = new mA();
			return (
				(B.anchor1 = A), (B.anchor2 = g), (B.frame1 = I), (B.frame2 = C), (B.jointType = exports.JointType.Fixed), B
			);
		}
		static spring(A, I, g, C, B) {
			let Q = new mA();
			return (
				(Q.anchor1 = C),
				(Q.anchor2 = B),
				(Q.length = A),
				(Q.stiffness = I),
				(Q.damping = g),
				(Q.jointType = exports.JointType.Spring),
				Q
			);
		}
		static rope(A, I, g) {
			let C = new mA();
			return (C.anchor1 = I), (C.anchor2 = g), (C.length = A), (C.jointType = exports.JointType.Rope), C;
		}
		static generic(A, I, g, C) {
			let B = new mA();
			return (
				(B.anchor1 = A), (B.anchor2 = I), (B.axis = g), (B.axesMask = C), (B.jointType = exports.JointType.Generic), B
			);
		}
		static spherical(A, I) {
			let g = new mA();
			return (g.anchor1 = A), (g.anchor2 = I), (g.jointType = exports.JointType.Spherical), g;
		}
		static prismatic(A, I, g) {
			let C = new mA();
			return (C.anchor1 = A), (C.anchor2 = I), (C.axis = g), (C.jointType = exports.JointType.Prismatic), C;
		}
		static revolute(A, I, g) {
			let C = new mA();
			return (C.anchor1 = A), (C.anchor2 = I), (C.axis = g), (C.jointType = exports.JointType.Revolute), C;
		}
		intoRaw() {
			let A,
				I,
				g = wA.intoRaw(this.anchor1),
				C = wA.intoRaw(this.anchor2),
				B = !1,
				Q = 0,
				E = 0;
			switch (this.jointType) {
				case exports.JointType.Fixed:
					let i = kA.intoRaw(this.frame1),
						D = kA.intoRaw(this.frame2);
					(I = b.fixed(g, i, C, D)), i.free(), D.free();
					break;
				case exports.JointType.Spring:
					I = b.spring(this.length, this.stiffness, this.damping, g, C);
					break;
				case exports.JointType.Rope:
					I = b.rope(this.length, g, C);
					break;
				case exports.JointType.Prismatic:
					(A = wA.intoRaw(this.axis)),
						this.limitsEnabled && ((B = !0), (Q = this.limits[0]), (E = this.limits[1])),
						(I = b.prismatic(g, C, A, B, Q, E)),
						A.free();
					break;
				case exports.JointType.Generic:
					A = wA.intoRaw(this.axis);
					let o = this.axesMask;
					I = b.generic(g, C, A, o);
					break;
				case exports.JointType.Spherical:
					I = b.spherical(g, C);
					break;
				case exports.JointType.Revolute:
					(A = wA.intoRaw(this.axis)), (I = b.revolute(g, C, A)), A.free();
			}
			return g.free(), C.free(), I;
		}
	}
	class jA {
		constructor(A) {
			(this.raw = A || new W()),
				(this.map = new tA()),
				A &&
					A.forEachJointHandle((I) => {
						this.map.set(I, rA.newTyped(A, null, I));
					});
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0), this.map && this.map.clear(), (this.map = void 0);
		}
		finalizeDeserialization(A) {
			this.map.forEach((I) => I.finalizeDeserialization(A));
		}
		createJoint(A, I, g, C, B) {
			const Q = I.intoRaw(),
				E = this.raw.createJoint(Q, g, C, B);
			Q.free();
			let i = rA.newTyped(this.raw, A, E);
			return this.map.set(E, i), i;
		}
		remove(A, I) {
			this.raw.remove(A, I), this.unmap(A);
		}
		forEachJointHandleAttachedToRigidBody(A, I) {
			this.raw.forEachJointAttachedToRigidBody(A, I);
		}
		unmap(A) {
			this.map.delete(A);
		}
		len() {
			return this.map.len();
		}
		contains(A) {
			return null != this.get(A);
		}
		get(A) {
			return this.map.get(A);
		}
		forEach(A) {
			this.map.forEach(A);
		}
		getAll() {
			return this.map.getAll();
		}
	}
	class fA {
		constructor(A, I) {
			(this.rawSet = A), (this.handle = I);
		}
		static newTyped(A, I) {
			switch (A.jointType(I)) {
				case H.Revolute:
					return new uA(A, I);
				case H.Prismatic:
					return new PA(A, I);
				case H.Fixed:
					return new VA(A, I);
				case H.Spherical:
					return new vA(A, I);
				default:
					return new fA(A, I);
			}
		}
		isValid() {
			return this.rawSet.contains(this.handle);
		}
		setContactsEnabled(A) {
			this.rawSet.jointSetContactsEnabled(this.handle, A);
		}
		contactsEnabled() {
			return this.rawSet.jointContactsEnabled(this.handle);
		}
	}
	class XA extends fA {}
	class VA extends fA {}
	class PA extends XA {
		rawAxis() {
			return Y.X;
		}
	}
	class uA extends XA {
		rawAxis() {
			return Y.AngX;
		}
	}
	class vA extends fA {}
	class zA {
		constructor(A) {
			(this.raw = A || new f()),
				(this.map = new tA()),
				A &&
					A.forEachJointHandle((A) => {
						this.map.set(A, fA.newTyped(this.raw, A));
					});
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0), this.map && this.map.clear(), (this.map = void 0);
		}
		createJoint(A, I, g, C) {
			const B = A.intoRaw(),
				Q = this.raw.createJoint(B, I, g, C);
			B.free();
			let E = fA.newTyped(this.raw, Q);
			return this.map.set(Q, E), E;
		}
		remove(A, I) {
			this.raw.remove(A, I), this.map.delete(A);
		}
		unmap(A) {
			this.map.delete(A);
		}
		len() {
			return this.map.len();
		}
		contains(A) {
			return null != this.get(A);
		}
		get(A) {
			return this.map.get(A);
		}
		forEach(A) {
			this.map.forEach(A);
		}
		forEachJointHandleAttachedToRigidBody(A, I) {
			this.raw.forEachJointAttachedToRigidBody(A, I);
		}
		getAll() {
			return this.map.getAll();
		}
	}
	(exports.CoefficientCombineRule = void 0),
		((NA = exports.CoefficientCombineRule || (exports.CoefficientCombineRule = {}))[(NA.Average = 0)] = 'Average'),
		(NA[(NA.Min = 1)] = 'Min'),
		(NA[(NA.Multiply = 2)] = 'Multiply'),
		(NA[(NA.Max = 3)] = 'Max');
	class _A {
		constructor(A) {
			this.raw = A || new L();
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
	}
	class $A {
		constructor(A) {
			this.raw = A || new m();
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
		forEachActiveRigidBodyHandle(A) {
			this.raw.forEachActiveRigidBodyHandle(A);
		}
	}
	class AI {
		constructor(A) {
			this.raw = A || new l();
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
	}
	class II {
		constructor(A) {
			(this.raw = A || new X()), (this.tempManifold = new gI(null));
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
		contactPairsWith(A, I) {
			this.raw.contact_pairs_with(A, I);
		}
		intersectionPairsWith(A, I) {
			this.raw.intersection_pairs_with(A, I);
		}
		contactPair(A, I, g) {
			const C = this.raw.contact_pair(A, I);
			if (C) {
				const I = C.collider1() != A;
				let B;
				for (B = 0; B < C.numContactManifolds(); ++B)
					(this.tempManifold.raw = C.contactManifold(B)),
						this.tempManifold.raw && g(this.tempManifold, I),
						this.tempManifold.free();
				C.free();
			}
		}
		intersectionPair(A, I) {
			return this.raw.intersection_pair(A, I);
		}
	}
	class gI {
		constructor(A) {
			this.raw = A;
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
		normal() {
			return wA.fromRaw(this.raw.normal());
		}
		localNormal1() {
			return wA.fromRaw(this.raw.local_n1());
		}
		localNormal2() {
			return wA.fromRaw(this.raw.local_n2());
		}
		subshape1() {
			return this.raw.subshape1();
		}
		subshape2() {
			return this.raw.subshape2();
		}
		numContacts() {
			return this.raw.num_contacts();
		}
		localContactPoint1(A) {
			return wA.fromRaw(this.raw.contact_local_p1(A));
		}
		localContactPoint2(A) {
			return wA.fromRaw(this.raw.contact_local_p2(A));
		}
		contactDist(A) {
			return this.raw.contact_dist(A);
		}
		contactFid1(A) {
			return this.raw.contact_fid1(A);
		}
		contactFid2(A) {
			return this.raw.contact_fid2(A);
		}
		contactImpulse(A) {
			return this.raw.contact_impulse(A);
		}
		contactTangentImpulseX(A) {
			return this.raw.contact_tangent_impulse_x(A);
		}
		contactTangentImpulseY(A) {
			return this.raw.contact_tangent_impulse_y(A);
		}
		numSolverContacts() {
			return this.raw.num_solver_contacts();
		}
		solverContactPoint(A) {
			return wA.fromRaw(this.raw.solver_contact_point(A));
		}
		solverContactDist(A) {
			return this.raw.solver_contact_dist(A);
		}
		solverContactFriction(A) {
			return this.raw.solver_contact_friction(A);
		}
		solverContactRestitution(A) {
			return this.raw.solver_contact_restitution(A);
		}
		solverContactTangentVelocity(A) {
			return wA.fromRaw(this.raw.solver_contact_tangent_velocity(A));
		}
	}
	class CI {
		constructor(A, I, g, C, B) {
			(this.distance = A), (this.point1 = I), (this.point2 = g), (this.normal1 = C), (this.normal2 = B);
		}
		static fromRaw(A) {
			if (!A) return null;
			const I = new CI(
				A.distance(),
				wA.fromRaw(A.point1()),
				wA.fromRaw(A.point2()),
				wA.fromRaw(A.normal1()),
				wA.fromRaw(A.normal2())
			);
			return A.free(), I;
		}
	}
	(exports.FeatureType = void 0),
		((MA = exports.FeatureType || (exports.FeatureType = {}))[(MA.Vertex = 0)] = 'Vertex'),
		(MA[(MA.Edge = 1)] = 'Edge'),
		(MA[(MA.Face = 2)] = 'Face'),
		(MA[(MA.Unknown = 3)] = 'Unknown');
	class BI {
		constructor(A, I) {
			(this.point = A), (this.isInside = I);
		}
		static fromRaw(A) {
			if (!A) return null;
			const I = new BI(wA.fromRaw(A.point()), A.isInside());
			return A.free(), I;
		}
	}
	class QI {
		constructor(A, I, g, C, B) {
			(this.featureType = exports.FeatureType.Unknown),
				(this.featureId = void 0),
				(this.collider = A),
				(this.point = I),
				(this.isInside = g),
				void 0 !== B && (this.featureId = B),
				void 0 !== C && (this.featureType = C);
		}
		static fromRaw(A, I) {
			if (!I) return null;
			const g = new QI(A.get(I.colliderHandle()), wA.fromRaw(I.point()), I.isInside(), I.featureType(), I.featureId());
			return I.free(), g;
		}
	}
	class EI {
		constructor(A, I) {
			(this.origin = A), (this.dir = I);
		}
		pointAt(A) {
			return {
				x: this.origin.x + this.dir.x * A,
				y: this.origin.y + this.dir.y * A,
				z: this.origin.z + this.dir.z * A,
			};
		}
	}
	class iI {
		constructor(A, I, g, C) {
			(this.featureType = exports.FeatureType.Unknown),
				(this.featureId = void 0),
				(this.toi = A),
				(this.normal = I),
				void 0 !== C && (this.featureId = C),
				void 0 !== g && (this.featureType = g);
		}
		static fromRaw(A) {
			if (!A) return null;
			const I = new iI(A.toi(), wA.fromRaw(A.normal()), A.featureType(), A.featureId());
			return A.free(), I;
		}
	}
	class DI {
		constructor(A, I, g, C, B) {
			(this.featureType = exports.FeatureType.Unknown),
				(this.featureId = void 0),
				(this.collider = A),
				(this.toi = I),
				(this.normal = g),
				void 0 !== B && (this.featureId = B),
				void 0 !== C && (this.featureType = C);
		}
		static fromRaw(A, I) {
			if (!I) return null;
			const g = new DI(A.get(I.colliderHandle()), I.toi(), wA.fromRaw(I.normal()), I.featureType(), I.featureId());
			return I.free(), g;
		}
	}
	class oI {
		constructor(A, I) {
			(this.collider = A), (this.toi = I);
		}
		static fromRaw(A, I) {
			if (!I) return null;
			const g = new oI(A.get(I.colliderHandle()), I.toi());
			return I.free(), g;
		}
	}
	class GI {
		constructor(A, I, g, C, B) {
			(this.toi = A), (this.witness1 = I), (this.witness2 = g), (this.normal1 = C), (this.normal2 = B);
		}
		static fromRaw(A, I) {
			if (!I) return null;
			const g = new GI(
				I.toi(),
				wA.fromRaw(I.witness1()),
				wA.fromRaw(I.witness2()),
				wA.fromRaw(I.normal1()),
				wA.fromRaw(I.normal2())
			);
			return I.free(), g;
		}
	}
	class wI extends GI {
		constructor(A, I, g, C, B, Q) {
			super(I, g, C, B, Q), (this.collider = A);
		}
		static fromRaw(A, I) {
			if (!I) return null;
			const g = new wI(
				A.get(I.colliderHandle()),
				I.toi(),
				wA.fromRaw(I.witness1()),
				wA.fromRaw(I.witness2()),
				wA.fromRaw(I.normal1()),
				wA.fromRaw(I.normal2())
			);
			return I.free(), g;
		}
	}
	class SI {
		static fromRaw(A, I) {
			const g = A.coShapeType(I);
			let C, B, Q, E, i, D, o;
			switch (g) {
				case c.Ball:
					return new kI(A.coRadius(I));
				case c.Cuboid:
					return (C = A.coHalfExtents(I)), new hI(C.x, C.y, C.z);
				case c.RoundCuboid:
					return (C = A.coHalfExtents(I)), (B = A.coRoundRadius(I)), new KI(C.x, C.y, C.z, B);
				case c.Capsule:
					return (i = A.coHalfHeight(I)), (D = A.coRadius(I)), new UI(i, D);
				case c.Segment:
					return (Q = A.coVertices(I)), new JI(wA.new(Q[0], Q[1], Q[2]), wA.new(Q[3], Q[4], Q[5]));
				case c.Polyline:
					return (Q = A.coVertices(I)), (E = A.coIndices(I)), new MI(Q, E);
				case c.Triangle:
					return (
						(Q = A.coVertices(I)), new yI(wA.new(Q[0], Q[1], Q[2]), wA.new(Q[3], Q[4], Q[5]), wA.new(Q[6], Q[7], Q[8]))
					);
				case c.RoundTriangle:
					return (
						(Q = A.coVertices(I)),
						(B = A.coRoundRadius(I)),
						new NI(wA.new(Q[0], Q[1], Q[2]), wA.new(Q[3], Q[4], Q[5]), wA.new(Q[6], Q[7], Q[8]), B)
					);
				case c.HalfSpace:
					return (o = wA.fromRaw(A.coHalfspaceNormal(I))), new aI(o);
				case c.TriMesh:
					return (Q = A.coVertices(I)), (E = A.coIndices(I)), new FI(Q, E);
				case c.HeightField:
					const G = A.coHeightfieldScale(I),
						w = A.coHeightfieldHeights(I),
						S = A.coHeightfieldNRows(I),
						k = A.coHeightfieldNCols(I);
					return new sI(S, k, w, G);
				case c.ConvexPolyhedron:
					return (Q = A.coVertices(I)), (E = A.coIndices(I)), new qI(Q, E);
				case c.RoundConvexPolyhedron:
					return (Q = A.coVertices(I)), (E = A.coIndices(I)), (B = A.coRoundRadius(I)), new RI(Q, E, B);
				case c.Cylinder:
					return (i = A.coHalfHeight(I)), (D = A.coRadius(I)), new cI(i, D);
				case c.RoundCylinder:
					return (i = A.coHalfHeight(I)), (D = A.coRadius(I)), (B = A.coRoundRadius(I)), new YI(i, D, B);
				case c.Cone:
					return (i = A.coHalfHeight(I)), (D = A.coRadius(I)), new HI(i, D);
				case c.RoundCone:
					return (i = A.coHalfHeight(I)), (D = A.coRadius(I)), (B = A.coRoundRadius(I)), new lI(i, D, B);
				default:
					throw new Error('unknown shape type: ' + g);
			}
		}
		castShape(A, I, g, C, B, Q, E, i, D) {
			let o = wA.intoRaw(A),
				G = kA.intoRaw(I),
				w = wA.intoRaw(g),
				S = wA.intoRaw(B),
				k = kA.intoRaw(Q),
				a = wA.intoRaw(E),
				h = this.intoRaw(),
				K = C.intoRaw(),
				U = GI.fromRaw(null, h.castShape(o, G, w, K, S, k, a, i, D));
			return o.free(), G.free(), w.free(), S.free(), k.free(), a.free(), h.free(), K.free(), U;
		}
		intersectsShape(A, I, g, C, B) {
			let Q = wA.intoRaw(A),
				E = kA.intoRaw(I),
				i = wA.intoRaw(C),
				D = kA.intoRaw(B),
				o = this.intoRaw(),
				G = g.intoRaw(),
				w = o.intersectsShape(Q, E, G, i, D);
			return Q.free(), E.free(), i.free(), D.free(), o.free(), G.free(), w;
		}
		contactShape(A, I, g, C, B, Q) {
			let E = wA.intoRaw(A),
				i = kA.intoRaw(I),
				D = wA.intoRaw(C),
				o = kA.intoRaw(B),
				G = this.intoRaw(),
				w = g.intoRaw(),
				S = CI.fromRaw(G.contactShape(E, i, w, D, o, Q));
			return E.free(), i.free(), D.free(), o.free(), G.free(), w.free(), S;
		}
		containsPoint(A, I, g) {
			let C = wA.intoRaw(A),
				B = kA.intoRaw(I),
				Q = wA.intoRaw(g),
				E = this.intoRaw(),
				i = E.containsPoint(C, B, Q);
			return C.free(), B.free(), Q.free(), E.free(), i;
		}
		projectPoint(A, I, g, C) {
			let B = wA.intoRaw(A),
				Q = kA.intoRaw(I),
				E = wA.intoRaw(g),
				i = this.intoRaw(),
				D = BI.fromRaw(i.projectPoint(B, Q, E, C));
			return B.free(), Q.free(), E.free(), i.free(), D;
		}
		intersectsRay(A, I, g, C) {
			let B = wA.intoRaw(I),
				Q = kA.intoRaw(g),
				E = wA.intoRaw(A.origin),
				i = wA.intoRaw(A.dir),
				D = this.intoRaw(),
				o = D.intersectsRay(B, Q, E, i, C);
			return B.free(), Q.free(), E.free(), i.free(), D.free(), o;
		}
		castRay(A, I, g, C, B) {
			let Q = wA.intoRaw(I),
				E = kA.intoRaw(g),
				i = wA.intoRaw(A.origin),
				D = wA.intoRaw(A.dir),
				o = this.intoRaw(),
				G = o.castRay(Q, E, i, D, C, B);
			return Q.free(), E.free(), i.free(), D.free(), o.free(), G;
		}
		castRayAndGetNormal(A, I, g, C, B) {
			let Q = wA.intoRaw(I),
				E = kA.intoRaw(g),
				i = wA.intoRaw(A.origin),
				D = wA.intoRaw(A.dir),
				o = this.intoRaw(),
				G = iI.fromRaw(o.castRayAndGetNormal(Q, E, i, D, C, B));
			return Q.free(), E.free(), i.free(), D.free(), o.free(), G;
		}
	}
	(exports.ShapeType = void 0),
		((FA = exports.ShapeType || (exports.ShapeType = {}))[(FA.Ball = 0)] = 'Ball'),
		(FA[(FA.Cuboid = 1)] = 'Cuboid'),
		(FA[(FA.Capsule = 2)] = 'Capsule'),
		(FA[(FA.Segment = 3)] = 'Segment'),
		(FA[(FA.Polyline = 4)] = 'Polyline'),
		(FA[(FA.Triangle = 5)] = 'Triangle'),
		(FA[(FA.TriMesh = 6)] = 'TriMesh'),
		(FA[(FA.HeightField = 7)] = 'HeightField'),
		(FA[(FA.ConvexPolyhedron = 9)] = 'ConvexPolyhedron'),
		(FA[(FA.Cylinder = 10)] = 'Cylinder'),
		(FA[(FA.Cone = 11)] = 'Cone'),
		(FA[(FA.RoundCuboid = 12)] = 'RoundCuboid'),
		(FA[(FA.RoundTriangle = 13)] = 'RoundTriangle'),
		(FA[(FA.RoundCylinder = 14)] = 'RoundCylinder'),
		(FA[(FA.RoundCone = 15)] = 'RoundCone'),
		(FA[(FA.RoundConvexPolyhedron = 16)] = 'RoundConvexPolyhedron'),
		(FA[(FA.HalfSpace = 17)] = 'HalfSpace');
	class kI extends SI {
		constructor(A) {
			super(), (this.type = exports.ShapeType.Ball), (this.radius = A);
		}
		intoRaw() {
			return BA.ball(this.radius);
		}
	}
	class aI extends SI {
		constructor(A) {
			super(), (this.type = exports.ShapeType.HalfSpace), (this.normal = A);
		}
		intoRaw() {
			let A = wA.intoRaw(this.normal),
				I = BA.halfspace(A);
			return A.free(), I;
		}
	}
	class hI extends SI {
		constructor(A, I, g) {
			super(), (this.type = exports.ShapeType.Cuboid), (this.halfExtents = wA.new(A, I, g));
		}
		intoRaw() {
			return BA.cuboid(this.halfExtents.x, this.halfExtents.y, this.halfExtents.z);
		}
	}
	class KI extends SI {
		constructor(A, I, g, C) {
			super(),
				(this.type = exports.ShapeType.RoundCuboid),
				(this.halfExtents = wA.new(A, I, g)),
				(this.borderRadius = C);
		}
		intoRaw() {
			return BA.roundCuboid(this.halfExtents.x, this.halfExtents.y, this.halfExtents.z, this.borderRadius);
		}
	}
	class UI extends SI {
		constructor(A, I) {
			super(), (this.type = exports.ShapeType.Capsule), (this.halfHeight = A), (this.radius = I);
		}
		intoRaw() {
			return BA.capsule(this.halfHeight, this.radius);
		}
	}
	class JI extends SI {
		constructor(A, I) {
			super(), (this.type = exports.ShapeType.Segment), (this.a = A), (this.b = I);
		}
		intoRaw() {
			let A = wA.intoRaw(this.a),
				I = wA.intoRaw(this.b),
				g = BA.segment(A, I);
			return A.free(), I.free(), g;
		}
	}
	class yI extends SI {
		constructor(A, I, g) {
			super(), (this.type = exports.ShapeType.Triangle), (this.a = A), (this.b = I), (this.c = g);
		}
		intoRaw() {
			let A = wA.intoRaw(this.a),
				I = wA.intoRaw(this.b),
				g = wA.intoRaw(this.c),
				C = BA.triangle(A, I, g);
			return A.free(), I.free(), g.free(), C;
		}
	}
	class NI extends SI {
		constructor(A, I, g, C) {
			super(),
				(this.type = exports.ShapeType.RoundTriangle),
				(this.a = A),
				(this.b = I),
				(this.c = g),
				(this.borderRadius = C);
		}
		intoRaw() {
			let A = wA.intoRaw(this.a),
				I = wA.intoRaw(this.b),
				g = wA.intoRaw(this.c),
				C = BA.roundTriangle(A, I, g, this.borderRadius);
			return A.free(), I.free(), g.free(), C;
		}
	}
	class MI extends SI {
		constructor(A, I) {
			super(),
				(this.type = exports.ShapeType.Polyline),
				(this.vertices = A),
				(this.indices = null != I ? I : new Uint32Array(0));
		}
		intoRaw() {
			return BA.polyline(this.vertices, this.indices);
		}
	}
	class FI extends SI {
		constructor(A, I) {
			super(), (this.type = exports.ShapeType.TriMesh), (this.vertices = A), (this.indices = I);
		}
		intoRaw() {
			return BA.trimesh(this.vertices, this.indices);
		}
	}
	class qI extends SI {
		constructor(A, I) {
			super(), (this.type = exports.ShapeType.ConvexPolyhedron), (this.vertices = A), (this.indices = I);
		}
		intoRaw() {
			return this.indices ? BA.convexMesh(this.vertices, this.indices) : BA.convexHull(this.vertices);
		}
	}
	class RI extends SI {
		constructor(A, I, g) {
			super(),
				(this.type = exports.ShapeType.RoundConvexPolyhedron),
				(this.vertices = A),
				(this.indices = I),
				(this.borderRadius = g);
		}
		intoRaw() {
			return this.indices
				? BA.roundConvexMesh(this.vertices, this.indices, this.borderRadius)
				: BA.roundConvexHull(this.vertices, this.borderRadius);
		}
	}
	class sI extends SI {
		constructor(A, I, g, C) {
			super(),
				(this.type = exports.ShapeType.HeightField),
				(this.nrows = A),
				(this.ncols = I),
				(this.heights = g),
				(this.scale = C);
		}
		intoRaw() {
			let A = wA.intoRaw(this.scale),
				I = BA.heightfield(this.nrows, this.ncols, this.heights, A);
			return A.free(), I;
		}
	}
	class cI extends SI {
		constructor(A, I) {
			super(), (this.type = exports.ShapeType.Cylinder), (this.halfHeight = A), (this.radius = I);
		}
		intoRaw() {
			return BA.cylinder(this.halfHeight, this.radius);
		}
	}
	class YI extends SI {
		constructor(A, I, g) {
			super(),
				(this.type = exports.ShapeType.RoundCylinder),
				(this.borderRadius = g),
				(this.halfHeight = A),
				(this.radius = I);
		}
		intoRaw() {
			return BA.roundCylinder(this.halfHeight, this.radius, this.borderRadius);
		}
	}
	class HI extends SI {
		constructor(A, I) {
			super(), (this.type = exports.ShapeType.Cone), (this.halfHeight = A), (this.radius = I);
		}
		intoRaw() {
			return BA.cone(this.halfHeight, this.radius);
		}
	}
	class lI extends SI {
		constructor(A, I, g) {
			super(),
				(this.type = exports.ShapeType.RoundCone),
				(this.halfHeight = A),
				(this.radius = I),
				(this.borderRadius = g);
		}
		intoRaw() {
			return BA.roundCone(this.halfHeight, this.radius, this.borderRadius);
		}
	}
	class LI {
		constructor(A) {
			this.raw = A || new V();
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
		step(A, I, g, C, B, Q, E, i, D, o, G, w) {
			let S = wA.intoRaw(A);
			G
				? this.raw.stepWithEvents(
						S,
						I.raw,
						g.raw,
						C.raw,
						B.raw,
						Q.raw,
						E.raw,
						i.raw,
						D.raw,
						o.raw,
						G.raw,
						w,
						w ? w.filterContactPair : null,
						w ? w.filterIntersectionPair : null
					)
				: this.raw.step(S, I.raw, g.raw, C.raw, B.raw, Q.raw, E.raw, i.raw, D.raw, o.raw),
				S.free();
		}
	}
	(exports.QueryFilterFlags = void 0),
		((qA = exports.QueryFilterFlags || (exports.QueryFilterFlags = {}))[(qA.EXCLUDE_FIXED = 1)] = 'EXCLUDE_FIXED'),
		(qA[(qA.EXCLUDE_KINEMATIC = 2)] = 'EXCLUDE_KINEMATIC'),
		(qA[(qA.EXCLUDE_DYNAMIC = 4)] = 'EXCLUDE_DYNAMIC'),
		(qA[(qA.EXCLUDE_SENSORS = 8)] = 'EXCLUDE_SENSORS'),
		(qA[(qA.EXCLUDE_SOLIDS = 16)] = 'EXCLUDE_SOLIDS'),
		(qA[(qA.ONLY_DYNAMIC = 3)] = 'ONLY_DYNAMIC'),
		(qA[(qA.ONLY_KINEMATIC = 5)] = 'ONLY_KINEMATIC'),
		(qA[(qA.ONLY_FIXED = 6)] = 'ONLY_FIXED');
	class tI {
		constructor(A) {
			this.raw = A || new v();
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
		update(A, I) {
			this.raw.update(A.raw, I.raw);
		}
		castRay(A, I, g, C, B, Q, E, i, D, o) {
			let G = wA.intoRaw(g.origin),
				w = wA.intoRaw(g.dir),
				S = oI.fromRaw(I, this.raw.castRay(A.raw, I.raw, G, w, C, B, Q, E, i, D, o));
			return G.free(), w.free(), S;
		}
		castRayAndGetNormal(A, I, g, C, B, Q, E, i, D, o) {
			let G = wA.intoRaw(g.origin),
				w = wA.intoRaw(g.dir),
				S = DI.fromRaw(I, this.raw.castRayAndGetNormal(A.raw, I.raw, G, w, C, B, Q, E, i, D, o));
			return G.free(), w.free(), S;
		}
		intersectionsWithRay(A, I, g, C, B, Q, E, i, D, o, G) {
			let w = wA.intoRaw(g.origin),
				S = wA.intoRaw(g.dir);
			this.raw.intersectionsWithRay(A.raw, I.raw, w, S, C, B, (A) => Q(DI.fromRaw(I, A)), E, i, D, o, G),
				w.free(),
				S.free();
		}
		intersectionWithShape(A, I, g, C, B, Q, E, i, D, o) {
			let G = wA.intoRaw(g),
				w = kA.intoRaw(C),
				S = B.intoRaw(),
				k = this.raw.intersectionWithShape(A.raw, I.raw, G, w, S, Q, E, i, D, o);
			return G.free(), w.free(), S.free(), k;
		}
		projectPoint(A, I, g, C, B, Q, E, i, D) {
			let o = wA.intoRaw(g),
				G = QI.fromRaw(I, this.raw.projectPoint(A.raw, I.raw, o, C, B, Q, E, i, D));
			return o.free(), G;
		}
		projectPointAndGetFeature(A, I, g, C, B, Q, E, i) {
			let D = wA.intoRaw(g),
				o = QI.fromRaw(I, this.raw.projectPointAndGetFeature(A.raw, I.raw, D, C, B, Q, E, i));
			return D.free(), o;
		}
		intersectionsWithPoint(A, I, g, C, B, Q, E, i, D) {
			let o = wA.intoRaw(g);
			this.raw.intersectionsWithPoint(A.raw, I.raw, o, C, B, Q, E, i, D), o.free();
		}
		castShape(A, I, g, C, B, Q, E, i, D, o, G, w, S) {
			let k = wA.intoRaw(g),
				a = kA.intoRaw(C),
				h = wA.intoRaw(B),
				K = Q.intoRaw(),
				U = wI.fromRaw(I, this.raw.castShape(A.raw, I.raw, k, a, h, K, E, i, D, o, G, w, S));
			return k.free(), a.free(), h.free(), K.free(), U;
		}
		intersectionsWithShape(A, I, g, C, B, Q, E, i, D, o, G) {
			let w = wA.intoRaw(g),
				S = kA.intoRaw(C),
				k = B.intoRaw();
			this.raw.intersectionsWithShape(A.raw, I.raw, w, S, k, Q, E, i, D, o, G), w.free(), S.free(), k.free();
		}
		collidersWithAabbIntersectingAabb(A, I, g) {
			let C = wA.intoRaw(A),
				B = wA.intoRaw(I);
			this.raw.collidersWithAabbIntersectingAabb(C, B, g), C.free(), B.free();
		}
	}
	class pI {
		constructor(A) {
			this.raw = A || new CA();
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
		serializeAll(A, I, g, C, B, Q, E, i, D) {
			let o = wA.intoRaw(A);
			const G = this.raw.serializeAll(o, I.raw, g.raw, C.raw, B.raw, Q.raw, E.raw, i.raw, D.raw);
			return o.free(), G;
		}
		deserializeAll(A) {
			return OI.fromRaw(this.raw.deserializeAll(A));
		}
	}
	class eI {
		constructor(A, I) {
			(this.vertices = A), (this.colors = I);
		}
	}
	class rI {
		constructor(A) {
			this.raw = A || new T();
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0), (this.vertices = void 0), (this.colors = void 0);
		}
		render(A, I, g, C, B) {
			this.raw.render(A.raw, I.raw, g.raw, C.raw, B.raw),
				(this.vertices = this.raw.vertices()),
				(this.colors = this.raw.colors());
		}
	}
	class dI {}
	class TI {
		constructor(A, I, g, C, B) {
			(this.params = I),
				(this.bodies = g),
				(this.colliders = C),
				(this.queries = B),
				(this.raw = new j(A)),
				(this.rawCharacterCollision = new t()),
				(this._applyImpulsesToDynamicBodies = !1),
				(this._characterMass = null);
		}
		free() {
			this.raw && (this.raw.free(), this.rawCharacterCollision.free()),
				(this.raw = void 0),
				(this.rawCharacterCollision = void 0);
		}
		up() {
			return this.raw.up();
		}
		setUp(A) {
			let I = wA.intoRaw(A);
			return this.raw.setUp(I);
		}
		applyImpulsesToDynamicBodies() {
			return this._applyImpulsesToDynamicBodies;
		}
		setApplyImpulsesToDynamicBodies(A) {
			this._applyImpulsesToDynamicBodies = A;
		}
		characterMass() {
			return this._characterMass;
		}
		setCharacterMass(A) {
			this._characterMass = A;
		}
		offset() {
			return this.raw.offset();
		}
		setOffset(A) {
			this.raw.setOffset(A);
		}
		slideEnabled() {
			return this.raw.slideEnabled();
		}
		setSlideEnabled(A) {
			this.raw.setSlideEnabled(A);
		}
		autostepMaxHeight() {
			return this.raw.autostepMaxHeight();
		}
		autostepMinWidth() {
			return this.raw.autostepMinWidth();
		}
		autostepIncludesDynamicBodies() {
			return this.raw.autostepIncludesDynamicBodies();
		}
		autostepEnabled() {
			return this.raw.autostepEnabled();
		}
		enableAutostep(A, I, g) {
			this.raw.enableAutostep(A, I, g);
		}
		disableAutostep() {
			return this.raw.disableAutostep();
		}
		maxSlopeClimbAngle() {
			return this.raw.maxSlopeClimbAngle();
		}
		setMaxSlopeClimbAngle(A) {
			this.raw.setMaxSlopeClimbAngle(A);
		}
		minSlopeSlideAngle() {
			return this.raw.minSlopeSlideAngle();
		}
		setMinSlopeSlideAngle(A) {
			this.raw.setMinSlopeSlideAngle(A);
		}
		snapToGroundDistance() {
			return this.raw.snapToGroundDistance();
		}
		enableSnapToGround(A) {
			this.raw.enableSnapToGround(A);
		}
		disableSnapToGround() {
			this.raw.disableSnapToGround();
		}
		snapToGroundEnabled() {
			return this.raw.snapToGroundEnabled();
		}
		computeColliderMovement(A, I, g, C, B) {
			let Q = wA.intoRaw(I);
			this.raw.computeColliderMovement(
				this.params.dt,
				this.bodies.raw,
				this.colliders.raw,
				this.queries.raw,
				A.handle,
				Q,
				this._applyImpulsesToDynamicBodies,
				this._characterMass,
				g,
				C,
				this.colliders.castClosure(B)
			),
				Q.free();
		}
		computedMovement() {
			return wA.fromRaw(this.raw.computedMovement());
		}
		computedGrounded() {
			return this.raw.computedGrounded();
		}
		numComputedCollisions() {
			return this.raw.numComputedCollisions();
		}
		computedCollision(A, I) {
			if (this.raw.computedCollision(A, this.rawCharacterCollision)) {
				let A = this.rawCharacterCollision;
				return (
					((I = null != I ? I : new dI()).translationDeltaApplied = wA.fromRaw(A.translationDeltaApplied())),
					(I.translationDeltaRemaining = wA.fromRaw(A.translationDeltaRemaining())),
					(I.toi = A.toi()),
					(I.witness1 = wA.fromRaw(A.worldWitness1())),
					(I.witness2 = wA.fromRaw(A.worldWitness2())),
					(I.normal1 = wA.fromRaw(A.worldNormal1())),
					(I.normal2 = wA.fromRaw(A.worldNormal2())),
					(I.collider = this.colliders.get(A.handle())),
					I
				);
			}
			return null;
		}
	}
	class nI {
		constructor(A, I, g, C) {
			(this.raw = new O(A.handle)), (this.bodies = I), (this.colliders = g), (this.queries = C), (this._chassis = A);
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
		updateVehicle(A, I, g, C) {
			this.raw.update_vehicle(
				A,
				this.bodies.raw,
				this.colliders.raw,
				this.queries.raw,
				I,
				g,
				this.colliders.castClosure(C)
			);
		}
		currentVehicleSpeed() {
			return this.raw.current_vehicle_speed();
		}
		chassis() {
			return this._chassis;
		}
		get indexUpAxis() {
			return this.raw.index_up_axis();
		}
		set indexUpAxis(A) {
			this.raw.set_index_up_axis(A);
		}
		get indexForwardAxis() {
			return this.raw.index_forward_axis();
		}
		set setIndexForwardAxis(A) {
			this.raw.set_index_forward_axis(A);
		}
		addWheel(A, I, g, C, B) {
			let Q = wA.intoRaw(A),
				E = wA.intoRaw(I),
				i = wA.intoRaw(g);
			this.raw.add_wheel(Q, E, i, C, B), Q.free(), E.free(), i.free();
		}
		numWheels() {
			return this.raw.num_wheels();
		}
		wheelChassisConnectionPointCs(A) {
			return wA.fromRaw(this.raw.wheel_chassis_connection_point_cs(A));
		}
		setWheelChassisConnectionPointCs(A, I) {
			let g = wA.intoRaw(I);
			this.raw.set_wheel_chassis_connection_point_cs(A, g), g.free();
		}
		wheelSuspensionRestLength(A) {
			return this.raw.wheel_suspension_rest_length(A);
		}
		setWheelSuspensionRestLength(A, I) {
			this.raw.set_wheel_suspension_rest_length(A, I);
		}
		wheelMaxSuspensionTravel(A) {
			return this.raw.wheel_max_suspension_travel(A);
		}
		setWheelMaxSuspensionTravel(A, I) {
			this.raw.set_wheel_max_suspension_travel(A, I);
		}
		wheelRadius(A) {
			return this.raw.wheel_radius(A);
		}
		setWheelRadius(A, I) {
			this.raw.set_wheel_radius(A, I);
		}
		wheelSuspensionStiffness(A) {
			return this.raw.wheel_suspension_stiffness(A);
		}
		setWheelSuspensionStiffness(A, I) {
			this.raw.set_wheel_suspension_stiffness(A, I);
		}
		wheelSuspensionCompression(A) {
			return this.raw.wheel_suspension_compression(A);
		}
		setWheelSuspensionCompression(A, I) {
			this.raw.set_wheel_suspension_compression(A, I);
		}
		wheelSuspensionRelaxation(A) {
			return this.raw.wheel_suspension_relaxation(A);
		}
		setWheelSuspensionRelaxation(A, I) {
			this.raw.set_wheel_suspension_relaxation(A, I);
		}
		wheelMaxSuspensionForce(A) {
			return this.raw.wheel_max_suspension_force(A);
		}
		setWheelMaxSuspensionForce(A, I) {
			this.raw.set_wheel_max_suspension_force(A, I);
		}
		wheelBrake(A) {
			return this.raw.wheel_brake(A);
		}
		setWheelBrake(A, I) {
			this.raw.set_wheel_brake(A, I);
		}
		wheelSteering(A) {
			return this.raw.wheel_steering(A);
		}
		setWheelSteering(A, I) {
			this.raw.set_wheel_steering(A, I);
		}
		wheelEngineForce(A) {
			return this.raw.wheel_engine_force(A);
		}
		setWheelEngineForce(A, I) {
			this.raw.set_wheel_engine_force(A, I);
		}
		wheelDirectionCs(A) {
			return wA.fromRaw(this.raw.wheel_direction_cs(A));
		}
		setWheelDirectionCs(A, I) {
			let g = wA.intoRaw(I);
			this.raw.set_wheel_direction_cs(A, g), g.free();
		}
		wheelAxleCs(A) {
			return wA.fromRaw(this.raw.wheel_axle_cs(A));
		}
		setWheelAxleCs(A, I) {
			let g = wA.intoRaw(I);
			this.raw.set_wheel_axle_cs(A, g), g.free();
		}
		wheelFrictionSlip(A) {
			return this.raw.wheel_friction_slip(A);
		}
		setWheelFrictionSlip(A, I) {
			this.raw.set_wheel_friction_slip(A, I);
		}
		wheelSideFrictionStiffness(A) {
			return this.raw.wheel_side_friction_stiffness(A);
		}
		setWheelSideFrictionStiffness(A, I) {
			this.raw.set_wheel_side_friction_stiffness(A, I);
		}
		wheelRotation(A) {
			return this.raw.wheel_rotation(A);
		}
		wheelForwardImpulse(A) {
			return this.raw.wheel_forward_impulse(A);
		}
		wheelSideImpulse(A) {
			return this.raw.wheel_side_impulse(A);
		}
		wheelSuspensionForce(A) {
			return this.raw.wheel_suspension_force(A);
		}
		wheelContactNormal(A) {
			return wA.fromRaw(this.raw.wheel_contact_normal_ws(A));
		}
		wheelContactPoint(A) {
			return wA.fromRaw(this.raw.wheel_contact_point_ws(A));
		}
		wheelSuspensionLength(A) {
			return this.raw.wheel_suspension_length(A);
		}
		wheelHardPoint(A) {
			return wA.fromRaw(this.raw.wheel_hard_point_ws(A));
		}
		wheelIsInContact(A) {
			return this.raw.wheel_is_in_contact(A);
		}
		wheelGroundObject(A) {
			return this.colliders.get(this.raw.wheel_ground_object(A));
		}
	}
	class OI {
		constructor(A, I, g, C, B, Q, E, i, D, o, G, w, S, k) {
			(this.gravity = A),
				(this.integrationParameters = new eA(I)),
				(this.islands = new $A(g)),
				(this.broadPhase = new AI(C)),
				(this.narrowPhase = new II(B)),
				(this.bodies = new pA(Q)),
				(this.colliders = new mI(E)),
				(this.impulseJoints = new jA(i)),
				(this.multibodyJoints = new zA(D)),
				(this.ccdSolver = new _A(o)),
				(this.queryPipeline = new tI(G)),
				(this.physicsPipeline = new LI(w)),
				(this.serializationPipeline = new pI(S)),
				(this.debugRenderPipeline = new rI(k)),
				(this.characterControllers = new Set()),
				(this.vehicleControllers = new Set()),
				this.impulseJoints.finalizeDeserialization(this.bodies),
				this.bodies.finalizeDeserialization(this.colliders),
				this.colliders.finalizeDeserialization(this.bodies);
		}
		free() {
			this.integrationParameters.free(),
				this.islands.free(),
				this.broadPhase.free(),
				this.narrowPhase.free(),
				this.bodies.free(),
				this.colliders.free(),
				this.impulseJoints.free(),
				this.multibodyJoints.free(),
				this.ccdSolver.free(),
				this.queryPipeline.free(),
				this.physicsPipeline.free(),
				this.serializationPipeline.free(),
				this.debugRenderPipeline.free(),
				this.characterControllers.forEach((A) => A.free()),
				this.vehicleControllers.forEach((A) => A.free()),
				(this.integrationParameters = void 0),
				(this.islands = void 0),
				(this.broadPhase = void 0),
				(this.narrowPhase = void 0),
				(this.bodies = void 0),
				(this.colliders = void 0),
				(this.ccdSolver = void 0),
				(this.impulseJoints = void 0),
				(this.multibodyJoints = void 0),
				(this.queryPipeline = void 0),
				(this.physicsPipeline = void 0),
				(this.serializationPipeline = void 0),
				(this.debugRenderPipeline = void 0),
				(this.characterControllers = void 0),
				(this.vehicleControllers = void 0);
		}
		static fromRaw(A) {
			return A
				? new OI(
						wA.fromRaw(A.takeGravity()),
						A.takeIntegrationParameters(),
						A.takeIslandManager(),
						A.takeBroadPhase(),
						A.takeNarrowPhase(),
						A.takeBodies(),
						A.takeColliders(),
						A.takeImpulseJoints(),
						A.takeMultibodyJoints()
					)
				: null;
		}
		takeSnapshot() {
			return this.serializationPipeline.serializeAll(
				this.gravity,
				this.integrationParameters,
				this.islands,
				this.broadPhase,
				this.narrowPhase,
				this.bodies,
				this.colliders,
				this.impulseJoints,
				this.multibodyJoints
			);
		}
		static restoreSnapshot(A) {
			return new pI().deserializeAll(A);
		}
		debugRender() {
			return (
				this.debugRenderPipeline.render(
					this.bodies,
					this.colliders,
					this.impulseJoints,
					this.multibodyJoints,
					this.narrowPhase
				),
				new eI(this.debugRenderPipeline.vertices, this.debugRenderPipeline.colors)
			);
		}
		step(A, I) {
			this.physicsPipeline.step(
				this.gravity,
				this.integrationParameters,
				this.islands,
				this.broadPhase,
				this.narrowPhase,
				this.bodies,
				this.colliders,
				this.impulseJoints,
				this.multibodyJoints,
				this.ccdSolver,
				A,
				I
			),
				this.queryPipeline.update(this.bodies, this.colliders);
		}
		propagateModifiedBodyPositionsToColliders() {
			this.bodies.raw.propagateModifiedBodyPositionsToColliders(this.colliders.raw);
		}
		updateSceneQueries() {
			this.propagateModifiedBodyPositionsToColliders(), this.queryPipeline.update(this.bodies, this.colliders);
		}
		get timestep() {
			return this.integrationParameters.dt;
		}
		set timestep(A) {
			this.integrationParameters.dt = A;
		}
		get numSolverIterations() {
			return this.integrationParameters.numSolverIterations;
		}
		set numSolverIterations(A) {
			this.integrationParameters.numSolverIterations = A;
		}
		get numAdditionalFrictionIterations() {
			return this.integrationParameters.numAdditionalFrictionIterations;
		}
		set numAdditionalFrictionIterations(A) {
			this.integrationParameters.numAdditionalFrictionIterations = A;
		}
		get numInternalPgsIterations() {
			return this.integrationParameters.numInternalPgsIterations;
		}
		set numInternalPgsIterations(A) {
			this.integrationParameters.numInternalPgsIterations = A;
		}
		switchToStandardPgsSolver() {
			this.integrationParameters.switchToStandardPgsSolver();
		}
		switchToSmallStepsPgsSolver() {
			this.integrationParameters.switchToSmallStepsPgsSolver();
		}
		createRigidBody(A) {
			return this.bodies.createRigidBody(this.colliders, A);
		}
		createCharacterController(A) {
			let I = new TI(A, this.integrationParameters, this.bodies, this.colliders, this.queryPipeline);
			return this.characterControllers.add(I), I;
		}
		removeCharacterController(A) {
			this.characterControllers.delete(A), A.free();
		}
		createVehicleController(A) {
			let I = new nI(A, this.bodies, this.colliders, this.queryPipeline);
			return this.vehicleControllers.add(I), I;
		}
		removeVehicleController(A) {
			this.vehicleControllers.delete(A), A.free();
		}
		createCollider(A, I) {
			let g = I ? I.handle : void 0;
			return this.colliders.createCollider(this.bodies, A, g);
		}
		createImpulseJoint(A, I, g, C) {
			return this.impulseJoints.createJoint(this.bodies, A, I.handle, g.handle, C);
		}
		createMultibodyJoint(A, I, g, C) {
			return this.multibodyJoints.createJoint(A, I.handle, g.handle, C);
		}
		getRigidBody(A) {
			return this.bodies.get(A);
		}
		getCollider(A) {
			return this.colliders.get(A);
		}
		getImpulseJoint(A) {
			return this.impulseJoints.get(A);
		}
		getMultibodyJoint(A) {
			return this.multibodyJoints.get(A);
		}
		removeRigidBody(A) {
			this.bodies &&
				this.bodies.remove(A.handle, this.islands, this.colliders, this.impulseJoints, this.multibodyJoints);
		}
		removeCollider(A, I) {
			this.colliders && this.colliders.remove(A.handle, this.islands, this.bodies, I);
		}
		removeImpulseJoint(A, I) {
			this.impulseJoints && this.impulseJoints.remove(A.handle, I);
		}
		removeMultibodyJoint(A, I) {
			this.impulseJoints && this.multibodyJoints.remove(A.handle, I);
		}
		forEachCollider(A) {
			this.colliders.forEach(A);
		}
		forEachRigidBody(A) {
			this.bodies.forEach(A);
		}
		forEachActiveRigidBody(A) {
			this.bodies.forEachActiveRigidBody(this.islands, A);
		}
		castRay(A, I, g, C, B, Q, E, i) {
			return this.queryPipeline.castRay(
				this.bodies,
				this.colliders,
				A,
				I,
				g,
				C,
				B,
				Q ? Q.handle : null,
				E ? E.handle : null,
				this.colliders.castClosure(i)
			);
		}
		castRayAndGetNormal(A, I, g, C, B, Q, E, i) {
			return this.queryPipeline.castRayAndGetNormal(
				this.bodies,
				this.colliders,
				A,
				I,
				g,
				C,
				B,
				Q ? Q.handle : null,
				E ? E.handle : null,
				this.colliders.castClosure(i)
			);
		}
		intersectionsWithRay(A, I, g, C, B, Q, E, i, D) {
			this.queryPipeline.intersectionsWithRay(
				this.bodies,
				this.colliders,
				A,
				I,
				g,
				C,
				B,
				Q,
				E ? E.handle : null,
				i ? i.handle : null,
				this.colliders.castClosure(D)
			);
		}
		intersectionWithShape(A, I, g, C, B, Q, E, i) {
			let D = this.queryPipeline.intersectionWithShape(
				this.bodies,
				this.colliders,
				A,
				I,
				g,
				C,
				B,
				Q ? Q.handle : null,
				E ? E.handle : null,
				this.colliders.castClosure(i)
			);
			return null != D ? this.colliders.get(D) : null;
		}
		projectPoint(A, I, g, C, B, Q, E) {
			return this.queryPipeline.projectPoint(
				this.bodies,
				this.colliders,
				A,
				I,
				g,
				C,
				B ? B.handle : null,
				Q ? Q.handle : null,
				this.colliders.castClosure(E)
			);
		}
		projectPointAndGetFeature(A, I, g, C, B, Q) {
			return this.queryPipeline.projectPointAndGetFeature(
				this.bodies,
				this.colliders,
				A,
				I,
				g,
				C ? C.handle : null,
				B ? B.handle : null,
				this.colliders.castClosure(Q)
			);
		}
		intersectionsWithPoint(A, I, g, C, B, Q, E) {
			this.queryPipeline.intersectionsWithPoint(
				this.bodies,
				this.colliders,
				A,
				this.colliders.castClosure(I),
				g,
				C,
				B ? B.handle : null,
				Q ? Q.handle : null,
				this.colliders.castClosure(E)
			);
		}
		castShape(A, I, g, C, B, Q, E, i, D, o, G) {
			return this.queryPipeline.castShape(
				this.bodies,
				this.colliders,
				A,
				I,
				g,
				C,
				B,
				Q,
				E,
				i,
				D ? D.handle : null,
				o ? o.handle : null,
				this.colliders.castClosure(G)
			);
		}
		intersectionsWithShape(A, I, g, C, B, Q, E, i, D) {
			this.queryPipeline.intersectionsWithShape(
				this.bodies,
				this.colliders,
				A,
				I,
				g,
				this.colliders.castClosure(C),
				B,
				Q,
				E ? E.handle : null,
				i ? i.handle : null,
				this.colliders.castClosure(D)
			);
		}
		collidersWithAabbIntersectingAabb(A, I, g) {
			this.queryPipeline.collidersWithAabbIntersectingAabb(A, I, this.colliders.castClosure(g));
		}
		contactPairsWith(A, I) {
			this.narrowPhase.contactPairsWith(A.handle, this.colliders.castClosure(I));
		}
		intersectionPairsWith(A, I) {
			this.narrowPhase.intersectionPairsWith(A.handle, this.colliders.castClosure(I));
		}
		contactPair(A, I, g) {
			this.narrowPhase.contactPair(A.handle, I.handle, g);
		}
		intersectionPair(A, I) {
			return this.narrowPhase.intersectionPair(A.handle, I.handle);
		}
	}
	(exports.ActiveEvents = void 0),
		((RA = exports.ActiveEvents || (exports.ActiveEvents = {}))[(RA.NONE = 0)] = 'NONE'),
		(RA[(RA.COLLISION_EVENTS = 1)] = 'COLLISION_EVENTS'),
		(RA[(RA.CONTACT_FORCE_EVENTS = 2)] = 'CONTACT_FORCE_EVENTS');
	class ZI {
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
		collider1() {
			return this.raw.collider1();
		}
		collider2() {
			return this.raw.collider2();
		}
		totalForce() {
			return wA.fromRaw(this.raw.total_force());
		}
		totalForceMagnitude() {
			return this.raw.total_force_magnitude();
		}
		maxForceDirection() {
			return wA.fromRaw(this.raw.max_force_direction());
		}
		maxForceMagnitude() {
			return this.raw.max_force_magnitude();
		}
	}
	class bI {
		constructor(A, I) {
			this.raw = I || new Z(A);
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0);
		}
		drainCollisionEvents(A) {
			this.raw.drainCollisionEvents(A);
		}
		drainContactForceEvents(A) {
			let I = new ZI();
			this.raw.drainContactForceEvents((g) => {
				(I.raw = g), A(I), I.free();
			});
		}
		clear() {
			this.raw.clear();
		}
	}
	(exports.ActiveHooks = void 0),
		((sA = exports.ActiveHooks || (exports.ActiveHooks = {}))[(sA.NONE = 0)] = 'NONE'),
		(sA[(sA.FILTER_CONTACT_PAIRS = 1)] = 'FILTER_CONTACT_PAIRS'),
		(sA[(sA.FILTER_INTERSECTION_PAIRS = 2)] = 'FILTER_INTERSECTION_PAIRS'),
		(exports.SolverFlags = void 0),
		((cA = exports.SolverFlags || (exports.SolverFlags = {}))[(cA.EMPTY = 0)] = 'EMPTY'),
		(cA[(cA.COMPUTE_IMPULSE = 1)] = 'COMPUTE_IMPULSE'),
		(exports.ActiveCollisionTypes = void 0),
		((YA = exports.ActiveCollisionTypes || (exports.ActiveCollisionTypes = {}))[(YA.DYNAMIC_DYNAMIC = 1)] =
			'DYNAMIC_DYNAMIC'),
		(YA[(YA.DYNAMIC_KINEMATIC = 12)] = 'DYNAMIC_KINEMATIC'),
		(YA[(YA.DYNAMIC_FIXED = 2)] = 'DYNAMIC_FIXED'),
		(YA[(YA.KINEMATIC_KINEMATIC = 52224)] = 'KINEMATIC_KINEMATIC'),
		(YA[(YA.KINEMATIC_FIXED = 8704)] = 'KINEMATIC_FIXED'),
		(YA[(YA.FIXED_FIXED = 32)] = 'FIXED_FIXED'),
		(YA[(YA.DEFAULT = 15)] = 'DEFAULT'),
		(YA[(YA.ALL = 60943)] = 'ALL');
	class WI {
		constructor(A, I, g, C) {
			(this.colliderSet = A), (this.handle = I), (this._parent = g), (this._shape = C);
		}
		finalizeDeserialization(A) {
			null != this.handle && (this._parent = A.get(this.colliderSet.raw.coParent(this.handle)));
		}
		ensureShapeIsCached() {
			this._shape || (this._shape = SI.fromRaw(this.colliderSet.raw, this.handle));
		}
		get shape() {
			return this.ensureShapeIsCached(), this._shape;
		}
		isValid() {
			return this.colliderSet.raw.contains(this.handle);
		}
		translation() {
			return wA.fromRaw(this.colliderSet.raw.coTranslation(this.handle));
		}
		rotation() {
			return kA.fromRaw(this.colliderSet.raw.coRotation(this.handle));
		}
		isSensor() {
			return this.colliderSet.raw.coIsSensor(this.handle);
		}
		setSensor(A) {
			this.colliderSet.raw.coSetSensor(this.handle, A);
		}
		setShape(A) {
			let I = A.intoRaw();
			this.colliderSet.raw.coSetShape(this.handle, I), I.free(), (this._shape = A);
		}
		setEnabled(A) {
			this.colliderSet.raw.coSetEnabled(this.handle, A);
		}
		isEnabled() {
			return this.colliderSet.raw.coIsEnabled(this.handle);
		}
		setRestitution(A) {
			this.colliderSet.raw.coSetRestitution(this.handle, A);
		}
		setFriction(A) {
			this.colliderSet.raw.coSetFriction(this.handle, A);
		}
		frictionCombineRule() {
			return this.colliderSet.raw.coFrictionCombineRule(this.handle);
		}
		setFrictionCombineRule(A) {
			this.colliderSet.raw.coSetFrictionCombineRule(this.handle, A);
		}
		restitutionCombineRule() {
			return this.colliderSet.raw.coRestitutionCombineRule(this.handle);
		}
		setRestitutionCombineRule(A) {
			this.colliderSet.raw.coSetRestitutionCombineRule(this.handle, A);
		}
		setCollisionGroups(A) {
			this.colliderSet.raw.coSetCollisionGroups(this.handle, A);
		}
		setSolverGroups(A) {
			this.colliderSet.raw.coSetSolverGroups(this.handle, A);
		}
		activeHooks() {
			return this.colliderSet.raw.coActiveHooks(this.handle);
		}
		setActiveHooks(A) {
			this.colliderSet.raw.coSetActiveHooks(this.handle, A);
		}
		activeEvents() {
			return this.colliderSet.raw.coActiveEvents(this.handle);
		}
		setActiveEvents(A) {
			this.colliderSet.raw.coSetActiveEvents(this.handle, A);
		}
		activeCollisionTypes() {
			return this.colliderSet.raw.coActiveCollisionTypes(this.handle);
		}
		setContactForceEventThreshold(A) {
			return this.colliderSet.raw.coSetContactForceEventThreshold(this.handle, A);
		}
		contactForceEventThreshold() {
			return this.colliderSet.raw.coContactForceEventThreshold(this.handle);
		}
		setActiveCollisionTypes(A) {
			this.colliderSet.raw.coSetActiveCollisionTypes(this.handle, A);
		}
		setDensity(A) {
			this.colliderSet.raw.coSetDensity(this.handle, A);
		}
		setMass(A) {
			this.colliderSet.raw.coSetMass(this.handle, A);
		}
		setMassProperties(A, I, g, C) {
			let B = wA.intoRaw(I),
				Q = wA.intoRaw(g),
				E = kA.intoRaw(C);
			this.colliderSet.raw.coSetMassProperties(this.handle, A, B, Q, E), B.free(), Q.free(), E.free();
		}
		setTranslation(A) {
			this.colliderSet.raw.coSetTranslation(this.handle, A.x, A.y, A.z);
		}
		setTranslationWrtParent(A) {
			this.colliderSet.raw.coSetTranslationWrtParent(this.handle, A.x, A.y, A.z);
		}
		setRotation(A) {
			this.colliderSet.raw.coSetRotation(this.handle, A.x, A.y, A.z, A.w);
		}
		setRotationWrtParent(A) {
			this.colliderSet.raw.coSetRotationWrtParent(this.handle, A.x, A.y, A.z, A.w);
		}
		shapeType() {
			return this.colliderSet.raw.coShapeType(this.handle);
		}
		halfExtents() {
			return wA.fromRaw(this.colliderSet.raw.coHalfExtents(this.handle));
		}
		setHalfExtents(A) {
			const I = wA.intoRaw(A);
			this.colliderSet.raw.coSetHalfExtents(this.handle, I);
		}
		radius() {
			return this.colliderSet.raw.coRadius(this.handle);
		}
		setRadius(A) {
			this.colliderSet.raw.coSetRadius(this.handle, A);
		}
		roundRadius() {
			return this.colliderSet.raw.coRoundRadius(this.handle);
		}
		setRoundRadius(A) {
			this.colliderSet.raw.coSetRoundRadius(this.handle, A);
		}
		halfHeight() {
			return this.colliderSet.raw.coHalfHeight(this.handle);
		}
		setHalfHeight(A) {
			this.colliderSet.raw.coSetHalfHeight(this.handle, A);
		}
		vertices() {
			return this.colliderSet.raw.coVertices(this.handle);
		}
		indices() {
			return this.colliderSet.raw.coIndices(this.handle);
		}
		heightfieldHeights() {
			return this.colliderSet.raw.coHeightfieldHeights(this.handle);
		}
		heightfieldScale() {
			let A = this.colliderSet.raw.coHeightfieldScale(this.handle);
			return wA.fromRaw(A);
		}
		heightfieldNRows() {
			return this.colliderSet.raw.coHeightfieldNRows(this.handle);
		}
		heightfieldNCols() {
			return this.colliderSet.raw.coHeightfieldNCols(this.handle);
		}
		parent() {
			return this._parent;
		}
		friction() {
			return this.colliderSet.raw.coFriction(this.handle);
		}
		restitution() {
			return this.colliderSet.raw.coRestitution(this.handle);
		}
		density() {
			return this.colliderSet.raw.coDensity(this.handle);
		}
		mass() {
			return this.colliderSet.raw.coMass(this.handle);
		}
		volume() {
			return this.colliderSet.raw.coVolume(this.handle);
		}
		collisionGroups() {
			return this.colliderSet.raw.coCollisionGroups(this.handle);
		}
		solverGroups() {
			return this.colliderSet.raw.coSolverGroups(this.handle);
		}
		containsPoint(A) {
			let I = wA.intoRaw(A),
				g = this.colliderSet.raw.coContainsPoint(this.handle, I);
			return I.free(), g;
		}
		projectPoint(A, I) {
			let g = wA.intoRaw(A),
				C = BI.fromRaw(this.colliderSet.raw.coProjectPoint(this.handle, g, I));
			return g.free(), C;
		}
		intersectsRay(A, I) {
			let g = wA.intoRaw(A.origin),
				C = wA.intoRaw(A.dir),
				B = this.colliderSet.raw.coIntersectsRay(this.handle, g, C, I);
			return g.free(), C.free(), B;
		}
		castShape(A, I, g, C, B, Q, E) {
			let i = wA.intoRaw(A),
				D = wA.intoRaw(g),
				o = kA.intoRaw(C),
				G = wA.intoRaw(B),
				w = I.intoRaw(),
				S = GI.fromRaw(this.colliderSet, this.colliderSet.raw.coCastShape(this.handle, i, w, D, o, G, Q, E));
			return i.free(), D.free(), o.free(), G.free(), w.free(), S;
		}
		castCollider(A, I, g, C, B) {
			let Q = wA.intoRaw(A),
				E = wA.intoRaw(g),
				i = wI.fromRaw(this.colliderSet, this.colliderSet.raw.coCastCollider(this.handle, Q, I.handle, E, C, B));
			return Q.free(), E.free(), i;
		}
		intersectsShape(A, I, g) {
			let C = wA.intoRaw(I),
				B = kA.intoRaw(g),
				Q = A.intoRaw(),
				E = this.colliderSet.raw.coIntersectsShape(this.handle, Q, C, B);
			return C.free(), B.free(), Q.free(), E;
		}
		contactShape(A, I, g, C) {
			let B = wA.intoRaw(I),
				Q = kA.intoRaw(g),
				E = A.intoRaw(),
				i = CI.fromRaw(this.colliderSet.raw.coContactShape(this.handle, E, B, Q, C));
			return B.free(), Q.free(), E.free(), i;
		}
		contactCollider(A, I) {
			return CI.fromRaw(this.colliderSet.raw.coContactCollider(this.handle, A.handle, I));
		}
		castRay(A, I, g) {
			let C = wA.intoRaw(A.origin),
				B = wA.intoRaw(A.dir),
				Q = this.colliderSet.raw.coCastRay(this.handle, C, B, I, g);
			return C.free(), B.free(), Q;
		}
		castRayAndGetNormal(A, I, g) {
			let C = wA.intoRaw(A.origin),
				B = wA.intoRaw(A.dir),
				Q = iI.fromRaw(this.colliderSet.raw.coCastRayAndGetNormal(this.handle, C, B, I, g));
			return C.free(), B.free(), Q;
		}
	}
	(exports.MassPropsMode = void 0),
		((HA = exports.MassPropsMode || (exports.MassPropsMode = {}))[(HA.Density = 0)] = 'Density'),
		(HA[(HA.Mass = 1)] = 'Mass'),
		(HA[(HA.MassProps = 2)] = 'MassProps');
	class xI {
		constructor(A) {
			(this.enabled = !0),
				(this.shape = A),
				(this.massPropsMode = exports.MassPropsMode.Density),
				(this.density = 1),
				(this.friction = 0.5),
				(this.restitution = 0),
				(this.rotation = kA.identity()),
				(this.translation = wA.zeros()),
				(this.isSensor = !1),
				(this.collisionGroups = 4294967295),
				(this.solverGroups = 4294967295),
				(this.frictionCombineRule = exports.CoefficientCombineRule.Average),
				(this.restitutionCombineRule = exports.CoefficientCombineRule.Average),
				(this.activeCollisionTypes = exports.ActiveCollisionTypes.DEFAULT),
				(this.activeEvents = exports.ActiveEvents.NONE),
				(this.activeHooks = exports.ActiveHooks.NONE),
				(this.mass = 0),
				(this.centerOfMass = wA.zeros()),
				(this.contactForceEventThreshold = 0),
				(this.principalAngularInertia = wA.zeros()),
				(this.angularInertiaLocalFrame = kA.identity());
		}
		static ball(A) {
			const I = new kI(A);
			return new xI(I);
		}
		static capsule(A, I) {
			const g = new UI(A, I);
			return new xI(g);
		}
		static segment(A, I) {
			const g = new JI(A, I);
			return new xI(g);
		}
		static triangle(A, I, g) {
			const C = new yI(A, I, g);
			return new xI(C);
		}
		static roundTriangle(A, I, g, C) {
			const B = new NI(A, I, g, C);
			return new xI(B);
		}
		static polyline(A, I) {
			const g = new MI(A, I);
			return new xI(g);
		}
		static trimesh(A, I) {
			const g = new FI(A, I);
			return new xI(g);
		}
		static cuboid(A, I, g) {
			const C = new hI(A, I, g);
			return new xI(C);
		}
		static roundCuboid(A, I, g, C) {
			const B = new KI(A, I, g, C);
			return new xI(B);
		}
		static heightfield(A, I, g, C) {
			const B = new sI(A, I, g, C);
			return new xI(B);
		}
		static cylinder(A, I) {
			const g = new cI(A, I);
			return new xI(g);
		}
		static roundCylinder(A, I, g) {
			const C = new YI(A, I, g);
			return new xI(C);
		}
		static cone(A, I) {
			const g = new HI(A, I);
			return new xI(g);
		}
		static roundCone(A, I, g) {
			const C = new lI(A, I, g);
			return new xI(C);
		}
		static convexHull(A) {
			const I = new qI(A, null);
			return new xI(I);
		}
		static convexMesh(A, I) {
			const g = new qI(A, I);
			return new xI(g);
		}
		static roundConvexHull(A, I) {
			const g = new RI(A, null, I);
			return new xI(g);
		}
		static roundConvexMesh(A, I, g) {
			const C = new RI(A, I, g);
			return new xI(C);
		}
		setTranslation(A, I, g) {
			if ('number' != typeof A || 'number' != typeof I || 'number' != typeof g)
				throw TypeError('The translation components must be numbers.');
			return (this.translation = { x: A, y: I, z: g }), this;
		}
		setRotation(A) {
			return kA.copy(this.rotation, A), this;
		}
		setSensor(A) {
			return (this.isSensor = A), this;
		}
		setEnabled(A) {
			return (this.enabled = A), this;
		}
		setDensity(A) {
			return (this.massPropsMode = exports.MassPropsMode.Density), (this.density = A), this;
		}
		setMass(A) {
			return (this.massPropsMode = exports.MassPropsMode.Mass), (this.mass = A), this;
		}
		setMassProperties(A, I, g, C) {
			return (
				(this.massPropsMode = exports.MassPropsMode.MassProps),
				(this.mass = A),
				wA.copy(this.centerOfMass, I),
				wA.copy(this.principalAngularInertia, g),
				kA.copy(this.angularInertiaLocalFrame, C),
				this
			);
		}
		setRestitution(A) {
			return (this.restitution = A), this;
		}
		setFriction(A) {
			return (this.friction = A), this;
		}
		setFrictionCombineRule(A) {
			return (this.frictionCombineRule = A), this;
		}
		setRestitutionCombineRule(A) {
			return (this.restitutionCombineRule = A), this;
		}
		setCollisionGroups(A) {
			return (this.collisionGroups = A), this;
		}
		setSolverGroups(A) {
			return (this.solverGroups = A), this;
		}
		setActiveHooks(A) {
			return (this.activeHooks = A), this;
		}
		setActiveEvents(A) {
			return (this.activeEvents = A), this;
		}
		setActiveCollisionTypes(A) {
			return (this.activeCollisionTypes = A), this;
		}
		setContactForceEventThreshold(A) {
			return (this.contactForceEventThreshold = A), this;
		}
	}
	class mI {
		constructor(A) {
			(this.raw = A || new p()),
				(this.map = new tA()),
				A &&
					A.forEachColliderHandle((A) => {
						this.map.set(A, new WI(this, A, null));
					});
		}
		free() {
			this.raw && this.raw.free(), (this.raw = void 0), this.map && this.map.clear(), (this.map = void 0);
		}
		castClosure(A) {
			return (I) => (A ? A(this.get(I)) : void 0);
		}
		finalizeDeserialization(A) {
			this.map.forEach((I) => I.finalizeDeserialization(A));
		}
		createCollider(A, I, g) {
			let C = null != g && null != g;
			if (C && isNaN(g)) throw Error('Cannot create a collider with a parent rigid-body handle that is not a number.');
			let B = I.shape.intoRaw(),
				Q = wA.intoRaw(I.translation),
				E = kA.intoRaw(I.rotation),
				i = wA.intoRaw(I.centerOfMass),
				D = wA.intoRaw(I.principalAngularInertia),
				o = kA.intoRaw(I.angularInertiaLocalFrame),
				G = this.raw.createCollider(
					I.enabled,
					B,
					Q,
					E,
					I.massPropsMode,
					I.mass,
					i,
					D,
					o,
					I.density,
					I.friction,
					I.restitution,
					I.frictionCombineRule,
					I.restitutionCombineRule,
					I.isSensor,
					I.collisionGroups,
					I.solverGroups,
					I.activeCollisionTypes,
					I.activeHooks,
					I.activeEvents,
					I.contactForceEventThreshold,
					C,
					C ? g : 0,
					A.raw
				);
			B.free(), Q.free(), E.free(), i.free(), D.free(), o.free();
			let w = C ? A.get(g) : null,
				S = new WI(this, G, w, I.shape);
			return this.map.set(G, S), S;
		}
		remove(A, I, g, C) {
			this.raw.remove(A, I.raw, g.raw, C), this.unmap(A);
		}
		unmap(A) {
			this.map.delete(A);
		}
		get(A) {
			return this.map.get(A);
		}
		len() {
			return this.map.len();
		}
		contains(A) {
			return null != this.get(A);
		}
		forEach(A) {
			this.map.forEach(A);
		}
		getAll() {
			return this.map.getAll();
		}
	}
	function jI(A, I, g, C) {
		return new (g || (g = Promise))(function (B, Q) {
			function E(A) {
				try {
					D(C.next(A));
				} catch (A) {
					Q(A);
				}
			}
			function i(A) {
				try {
					D(C.throw(A));
				} catch (A) {
					Q(A);
				}
			}
			function D(A) {
				var I;
				A.done
					? B(A.value)
					: ((I = A.value),
						I instanceof g
							? I
							: new g(function (A) {
									A(I);
								})).then(E, i);
			}
			D((C = C.apply(A, I || [])).next());
		});
	}
	for (
		var fI = {
				byteLength: function (A) {
					var I = _I(A),
						g = I[0],
						C = I[1];
					return (3 * (g + C)) / 4 - C;
				},
				toByteArray: function (A) {
					var I,
						g,
						C = _I(A),
						B = C[0],
						Q = C[1],
						E = new PI(
							(function (A, I, g) {
								return (3 * (I + g)) / 4 - g;
							})(0, B, Q)
						),
						i = 0,
						D = Q > 0 ? B - 4 : B;
					for (g = 0; g < D; g += 4)
						(I =
							(VI[A.charCodeAt(g)] << 18) |
							(VI[A.charCodeAt(g + 1)] << 12) |
							(VI[A.charCodeAt(g + 2)] << 6) |
							VI[A.charCodeAt(g + 3)]),
							(E[i++] = (I >> 16) & 255),
							(E[i++] = (I >> 8) & 255),
							(E[i++] = 255 & I);
					2 === Q && ((I = (VI[A.charCodeAt(g)] << 2) | (VI[A.charCodeAt(g + 1)] >> 4)), (E[i++] = 255 & I));
					1 === Q &&
						((I = (VI[A.charCodeAt(g)] << 10) | (VI[A.charCodeAt(g + 1)] << 4) | (VI[A.charCodeAt(g + 2)] >> 2)),
						(E[i++] = (I >> 8) & 255),
						(E[i++] = 255 & I));
					return E;
				},
				fromByteArray: function (A) {
					for (var I, g = A.length, C = g % 3, B = [], Q = 16383, E = 0, i = g - C; E < i; E += Q)
						B.push($I(A, E, E + Q > i ? i : E + Q));
					1 === C
						? ((I = A[g - 1]), B.push(XI[I >> 2] + XI[(I << 4) & 63] + '=='))
						: 2 === C &&
							((I = (A[g - 2] << 8) + A[g - 1]), B.push(XI[I >> 10] + XI[(I >> 4) & 63] + XI[(I << 2) & 63] + '='));
					return B.join('');
				},
			},
			XI = [],
			VI = [],
			PI = 'undefined' != typeof Uint8Array ? Uint8Array : Array,
			uI = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
			vI = 0,
			zI = uI.length;
		vI < zI;
		++vI
	)
		(XI[vI] = uI[vI]), (VI[uI.charCodeAt(vI)] = vI);
	function _I(A) {
		var I = A.length;
		if (I % 4 > 0) throw new Error('Invalid string. Length must be a multiple of 4');
		var g = A.indexOf('=');
		return -1 === g && (g = I), [g, g === I ? 0 : 4 - (g % 4)];
	}
	function $I(A, I, g) {
		for (var C, B, Q = [], E = I; E < g; E += 3)
			(C = ((A[E] << 16) & 16711680) + ((A[E + 1] << 8) & 65280) + (255 & A[E + 2])),
				Q.push(XI[((B = C) >> 18) & 63] + XI[(B >> 12) & 63] + XI[(B >> 6) & 63] + XI[63 & B]);
		return Q.join('');
	}
	function Ag() {
		return jI(this, void 0, void 0, function* () {
			yield oA(
				fI.toByteArray(
				).buffer
			);
		});
	}
	function Ig() {
		return (function () {
			let I, g;
			try {
				const Q = A.__wbindgen_add_to_stack_pointer(-16);
				A.version(Q);
				var C = G()[Q / 4 + 0],
					B = G()[Q / 4 + 1];
				return (I = C), (g = B), k(C, B);
			} finally {
				A.__wbindgen_add_to_stack_pointer(16), A.__wbindgen_free(I, g, 1);
			}
		})();
	}
	(VI['-'.charCodeAt(0)] = 62), (VI['_'.charCodeAt(0)] = 63);
	var gg = Object.freeze({
		__proto__: null,
		version: Ig,
		Vector3: GA,
		VectorOps: wA,
		Quaternion: SA,
		RotationOps: kA,
		SdpMatrix3: aA,
		SdpMatrix3Ops: hA,
		get RigidBodyType() {
			return exports.RigidBodyType;
		},
		RigidBody: lA,
		RigidBodyDesc: LA,
		RigidBodySet: pA,
		IntegrationParameters: eA,
		get JointType() {
			return exports.JointType;
		},
		get MotorModel() {
			return exports.MotorModel;
		},
		get JointAxesMask() {
			return exports.JointAxesMask;
		},
		ImpulseJoint: rA,
		UnitImpulseJoint: dA,
		FixedImpulseJoint: TA,
		RopeImpulseJoint: nA,
		SpringImpulseJoint: OA,
		PrismaticImpulseJoint: ZA,
		RevoluteImpulseJoint: bA,
		GenericImpulseJoint: WA,
		SphericalImpulseJoint: xA,
		JointData: mA,
		ImpulseJointSet: jA,
		MultibodyJoint: fA,
		UnitMultibodyJoint: XA,
		FixedMultibodyJoint: VA,
		PrismaticMultibodyJoint: PA,
		RevoluteMultibodyJoint: uA,
		SphericalMultibodyJoint: vA,
		MultibodyJointSet: zA,
		get CoefficientCombineRule() {
			return exports.CoefficientCombineRule;
		},
		CCDSolver: _A,
		IslandManager: $A,
		BroadPhase: AI,
		NarrowPhase: II,
		TempContactManifold: gI,
		Shape: SI,
		get ShapeType() {
			return exports.ShapeType;
		},
		Ball: kI,
		HalfSpace: aI,
		Cuboid: hI,
		RoundCuboid: KI,
		Capsule: UI,
		Segment: JI,
		Triangle: yI,
		RoundTriangle: NI,
		Polyline: MI,
		TriMesh: FI,
		ConvexPolyhedron: qI,
		RoundConvexPolyhedron: RI,
		Heightfield: sI,
		Cylinder: cI,
		RoundCylinder: YI,
		Cone: HI,
		RoundCone: lI,
		get ActiveCollisionTypes() {
			return exports.ActiveCollisionTypes;
		},
		Collider: WI,
		get MassPropsMode() {
			return exports.MassPropsMode;
		},
		ColliderDesc: xI,
		ColliderSet: mI,
		get FeatureType() {
			return exports.FeatureType;
		},
		Ray: EI,
		RayIntersection: iI,
		RayColliderIntersection: DI,
		RayColliderToi: oI,
		PointProjection: BI,
		PointColliderProjection: QI,
		ShapeTOI: GI,
		ShapeColliderTOI: wI,
		ShapeContact: CI,
		World: OI,
		PhysicsPipeline: LI,
		SerializationPipeline: pI,
		get ActiveEvents() {
			return exports.ActiveEvents;
		},
		TempContactForceEvent: ZI,
		EventQueue: bI,
		get ActiveHooks() {
			return exports.ActiveHooks;
		},
		get SolverFlags() {
			return exports.SolverFlags;
		},
		DebugRenderBuffers: eI,
		DebugRenderPipeline: rI,
		get QueryFilterFlags() {
			return exports.QueryFilterFlags;
		},
		QueryPipeline: tI,
		init: Ag,
		CharacterCollision: dI,
		KinematicCharacterController: TI,
		DynamicRayCastVehicleController: nI,
	});
	(exports.Ball = kI),
		(exports.BroadPhase = AI),
		(exports.CCDSolver = _A),
		(exports.Capsule = UI),
		(exports.CharacterCollision = dI),
		(exports.Collider = WI),
		(exports.ColliderDesc = xI),
		(exports.ColliderSet = mI),
		(exports.Cone = HI),
		(exports.ConvexPolyhedron = qI),
		(exports.Cuboid = hI),
		(exports.Cylinder = cI),
		(exports.DebugRenderBuffers = eI),
		(exports.DebugRenderPipeline = rI),
		(exports.DynamicRayCastVehicleController = nI),
		(exports.EventQueue = bI),
		(exports.FixedImpulseJoint = TA),
		(exports.FixedMultibodyJoint = VA),
		(exports.GenericImpulseJoint = WA),
		(exports.HalfSpace = aI),
		(exports.Heightfield = sI),
		(exports.ImpulseJoint = rA),
		(exports.ImpulseJointSet = jA),
		(exports.IntegrationParameters = eA),
		(exports.IslandManager = $A),
		(exports.JointData = mA),
		(exports.KinematicCharacterController = TI),
		(exports.MultibodyJoint = fA),
		(exports.MultibodyJointSet = zA),
		(exports.NarrowPhase = II),
		(exports.PhysicsPipeline = LI),
		(exports.PointColliderProjection = QI),
		(exports.PointProjection = BI),
		(exports.Polyline = MI),
		(exports.PrismaticImpulseJoint = ZA),
		(exports.PrismaticMultibodyJoint = PA),
		(exports.Quaternion = SA),
		(exports.QueryPipeline = tI),
		(exports.Ray = EI),
		(exports.RayColliderIntersection = DI),
		(exports.RayColliderToi = oI),
		(exports.RayIntersection = iI),
		(exports.RevoluteImpulseJoint = bA),
		(exports.RevoluteMultibodyJoint = uA),
		(exports.RigidBody = lA),
		(exports.RigidBodyDesc = LA),
		(exports.RigidBodySet = pA),
		(exports.RopeImpulseJoint = nA),
		(exports.RotationOps = kA),
		(exports.RoundCone = lI),
		(exports.RoundConvexPolyhedron = RI),
		(exports.RoundCuboid = KI),
		(exports.RoundCylinder = YI),
		(exports.RoundTriangle = NI),
		(exports.SdpMatrix3 = aA),
		(exports.SdpMatrix3Ops = hA),
		(exports.Segment = JI),
		(exports.SerializationPipeline = pI),
		(exports.Shape = SI),
		(exports.ShapeColliderTOI = wI),
		(exports.ShapeContact = CI),
		(exports.ShapeTOI = GI),
		(exports.SphericalImpulseJoint = xA),
		(exports.SphericalMultibodyJoint = vA),
		(exports.SpringImpulseJoint = OA),
		(exports.TempContactForceEvent = ZI),
		(exports.TempContactManifold = gI),
		(exports.TriMesh = FI),
		(exports.Triangle = yI),
		(exports.UnitImpulseJoint = dA),
		(exports.UnitMultibodyJoint = XA),
		(exports.Vector3 = GA),
		(exports.VectorOps = wA),
		(exports.World = OI),
		(exports.default = gg),
		(exports.init = Ag),
		(exports.version = Ig);
	return exports;
})();

if (typeof exports === 'object' && typeof module === 'object') {
	exports.RAPIER = RAPIER;
} else if (typeof define === 'function' && define['amd']) {
	define([], function () {
		return RAPIER;
	});
} else if (typeof exports === 'object') {
	exports.RAPIER = RAPIER;
}