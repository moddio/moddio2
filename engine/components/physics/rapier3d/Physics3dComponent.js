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
        //
        try {
        }
        catch (e) {
            console.error(e);
        }
    }
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Physics3dComponent;
}
//# sourceMappingURL=Physics3dComponent.js.map