var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Physics3dComponent extends TaroEventingClass {
    //
    constructor(entity, options, callback) {
        // core functionality / inherited
        super();
        // TODO: discern 2d/3d in engine and serve sources dynamically
        //		 so we can name these physics
        this.classId = 'Physics3dComponent';
        this.componentId = 'physics3d';
        // engine will always be rapier
        this.engine = 'RAPIER';
        this._entity = entity;
        this._options = options;
        this._callback = callback;
        this._init();
    }
    _init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield RAPIER.init();
            // decide whether to init with Vector3.Zero or default earth gravity
            this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
            this._callback();
        });
    }
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Physics3dComponent;
}
//# sourceMappingURL=Physics3dComponent.js.map