var dists = {
    defaultEngine: 'PLANCK',
    /**
     * NOTE:
     * use keys as capital letters as obfuscating replaces lowercase keys
     * which in result cause client unable to load any physic engine.
     */
    PLANCK: planckWrapper,
    BOX2DWASM: box2dwasmWrapper,
    BOX2DWEB: box2dwebWrapper,
    BOX2DNINJA: box2dninjaWrapper,
    BOX2DTS: box2dtsWrapper,
    NATIVE: nativeWrapper,
    BOX2D: box2dWrapper,
};
if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
    module.exports = dists;
}
//# sourceMappingURL=dists.js.map