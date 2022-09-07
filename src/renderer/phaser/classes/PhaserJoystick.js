var PhaserJoystick = /** @class */ (function () {
    function PhaserJoystick(scene, x, y, settings) {
        this.x = x;
        this.y = y;
        var radius = 72;
        var base = scene.add.graphics();
        if (settings.redFireZone) {
            base.lineStyle(10, 0xff0000);
            base.fillStyle(0x000000, 0.5);
            base.fillCircle(0, 0, radius);
            base.strokeCircle(0, 0, radius);
        }
        else {
            base.fillStyle(0x000000, 0.5);
            base.fillCircle(0, 0, radius);
            base.alpha = 0.5;
        }
        var thumb = scene.add.graphics();
        thumb.fillStyle(0x000000);
        thumb.fillCircle(0, 0, 35 / 2);
        thumb.alpha = 0.5;
        var virtualJoystick = this.virtualJoystick =
            scene.plugins.get('virtual-joystick').add(scene, {
                radius: radius,
                base: base,
                thumb: thumb
            });
        this.updateTransform();
        virtualJoystick.on('update', function () {
            if (virtualJoystick.pointer) {
                settings.onChange && settings.onChange({
                    angle: -virtualJoystick.angle,
                    power: virtualJoystick.force
                });
            }
            else {
                settings.onEnd && settings.onEnd();
            }
        });
        scene.joysticks.push(this);
    }
    PhaserJoystick.prototype.destroy = function () {
        this.virtualJoystick.destroy();
    };
    /**
     * needed to apply transform as if joystick
     * was child of controls container because
     * virtual joystick plugin does not work
     * well when joystick elements are nested
     **/
    PhaserJoystick.prototype.updateTransform = function () {
        var virtualJoystick = this.virtualJoystick;
        var scene = virtualJoystick.scene;
        var controls = scene.controls;
        var x = (this.x + 32) * controls.scaleX + controls.x;
        var y = (this.y + 12) * controls.scaleY + controls.y;
        var base = virtualJoystick.base;
        base.setScale(controls.scaleX, controls.scaleY);
        base.setPosition(x, y);
        var thumb = virtualJoystick.thumb;
        thumb.setScale(controls.scaleX, controls.scaleY);
        thumb.setPosition(x, y);
    };
    return PhaserJoystick;
}());
//# sourceMappingURL=PhaserJoystick.js.map