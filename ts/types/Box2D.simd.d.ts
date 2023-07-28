// these typings are provided in case you wish to bypass the entrypoint
// and import the SIMD flavour of box2d-wasm directly.
declare const module: typeof import('box2d-wasm');
export default module;