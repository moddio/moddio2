var PhaserJoystick = /** @class */ (function () {
    function PhaserJoystick(scene, x, y, settings) {
        this.x = x;
        this.y = y;
        var radius = this.radius = scene.cameras.main.displayWidth * 0.05;
        var base = scene.add.graphics();
        base.fillStyle(0x18181B, 0.9);
        base.fillCircle(0, 0, radius);
        if (settings.redFireZone) {
            base.beginPath();
            base.lineStyle(radius / 8, 0xff0000);
            base.arc(0, 0, radius / 1.08, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(360), true, 0.02);
            base.strokePath();
            base.closePath();
            base.alpha = 1;
        }
        else {
            base.alpha = 0.5;
        }
        var thumb = scene.add.graphics();
        thumb.fillStyle(0x3f3f46);
        thumb.fillCircle(0, 0, 35 / 2);
        thumb.alpha = 0.9;
        var virtualJoystick = this.virtualJoystick =
            scene.plugins.get('virtual-joystick').add(scene, {
                radius: radius,
                base: base,
                thumb: thumb
            });
        this.updateTransform();
        this.hide();
        virtualJoystick.on('update', function () {
            if (virtualJoystick.pointer) {
                settings.onChange && settings.onChange({
                    angle: -virtualJoystick.angle,
                    power: virtualJoystick.force / radius
                });
            }
            else {
                settings.onEnd && settings.onEnd();
            }
        });
        scene.joysticks.push(this);
        if (scene.joysticks.length > 1) {
            if (scene.joysticks[1].x > scene.joysticks[0].x) {
                scene.joysticks[0].side = 'left';
                scene.joysticks[1].side = 'right';
            }
            else {
                scene.joysticks[0].side = 'right';
                scene.joysticks[1].side = 'left';
            }
        }
    }
    PhaserJoystick.prototype.show = function () {
        this.virtualJoystick.setVisible(true);
    };
    PhaserJoystick.prototype.hide = function () {
        this.virtualJoystick.setVisible(false);
    };
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
        var x = this.x;
        var y = this.y;
        virtualJoystick.radius = this.radius * controls.scaleX;
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