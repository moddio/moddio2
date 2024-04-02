export class RigidBody {
    constructor(_aabb: any, mass: any, friction: any, restitution: any, gravMult: any, onCollide: any, autoStep: any);
    aabb: any;
    mass: any;
    friction: any;
    restitution: any;
    gravityMultiplier: any;
    onCollide: any;
    autoStep: boolean;
    airDrag: number;
    fluidDrag: number;
    onStep: any;
    velocity: any;
    resting: number[];
    inFluid: boolean;
    /** @internal */
    _ratioInFluid: number;
    /** @internal */
    _forces: any;
    /** @internal */
    _impulses: any;
    /** @internal */
    _sleepFrameCount: number;
    setPosition(p: any): void;
    getPosition(): any;
    applyForce(f: any): void;
    applyImpulse(i: any): void;
    /** @internal */
    _markActive(): void;
    atRestX(): number;
    atRestY(): number;
    atRestZ(): number;
}
