var TweenComponent = TaroEntity.extend({
	classId: 'TweenComponent',
	componentId: 'tween',

	init: function (parentEntity) {
		var self = this;

		self._entity = parentEntity;
		self.queue = [];
		self.keyFrames = [];
		self.offset = { x: 0, y: 0, rotate: 0 }; // x, y, angle

		self.tweens = {
			idle: {
				// idle
				type: 'translate',
				loopCount: -1, // loop infinitely
				keyFrames: [
					[0, [0, 0, 0]],
					[400, [0, -2, 0]],
					[800, [0, 0, 0]],
				],
			},
			wobble: {
				type: 'swing',
				loopCount: 1,
				keyFrames: [
					[0, [0, 0, 0]],
					[50, [0, 0, 0.1]],
					[100, [0, 0, -0.1]],
					[50, [0, 0, 0]],
				],
			},
			poke: {
				type: 'translate',
				loopCount: 1,
				keyFrames: [
					[0, [0, 0, 0]],
					[60, [0, 50, 0]],
					[180, [0, 0, 0]],
				],
			},
			recoil: {
				type: 'translate',
				loopCount: 1,
				keyFrames: [
					[0, [0, 0, 0]],
					[20, [0, -10, 0]],
					[150, [0, 0, 0]],
				],
			},
			swingCW: {
				type: 'swing',
				loopCount: 1,
				keyFrames: [
					[0, [0, 0, 0]],
					[100, [0, 0, 3.14]],
					[250, [0, 0, 0]],
				],
			},
			swingCCW: {
				type: 'swing',
				loopCount: 1,
				keyFrames: [
					[0, [0, 0, 0]],
					[100, [0, 0, -3.14]],
					[250, [0, 0, 0]],
				],
			},
		};
	},

	/* queue a new tween. if a matching tweenId exists among the previously queued tweens, remove that matching tween.
	 * @param {angle} the reference angle to apply tweening to.
	 * for example, if it's an item poking, then reference angle should be item's facing angle.
	 * If it's a tree that's being hit, then reference angle should be angle between tree and the item
	 */
	// queueTween: function(tweenId, angle) {
	//     console.log("tweenQueuing", tweenId)
	//     for (var i=0; i < this.queue.length; i++) {
	//         var tween = this.queue[i]
	//         if (tween[1] == tweenId) { // remove duplicate tween
	//             this.queue.splice(i, 1);
	//         }
	//     }
	//     this.queue.push([taro._currentTime, tweenId, this.tweens[tweenId], angle])
	//     this.isTweening = true;
	// },

	start: function (tweenId, angle, customTween) {
		// use customTween (e.g. change item)
		if (customTween) {
			var tween = customTween;
		} else {
			// pre-defined tween
			if (!this.tweens[tweenId]) {
				this.stop();
				return;
			}

			var tween = rfdc()(this.tweens[tweenId]);
		}

		// if (tweenId == 'swingCW' || tweenId == 'swingCCW') {
		//     this.keyFrames[1] = [100, [this._entity.height(), this._entity.height()/2, 3.14]]
		// }
		this.tweenId = tweenId;
		this.keyFrames = tween.keyFrames;
		this.type = tween.type;
		this.loopCount = tween.loopCount;
		this.angle = angle;

		this.startTime = Date.now();
		this.offset = { x: 0, y: 0, rotate: 0 };
		this.lastFrame = this.keyFrames.shift();
		this.nextFrame = this.keyFrames[0];
		this.isTweening = true;
	},

	stop: function () {
		this.tweenId = undefined;
		this.isTweening = false;
	},

	// traverse through all queued tweens, and compute combined offset values (x, y, angle)
	update: function () {
		var angle = this.angle;
		var now = Date.now();
		if (angle == undefined) {
			angle = this._entity._rotate.z;
		}

		if (this.keyFrames.length > 0) {
			var nextFrameEndsAt = this.startTime + this.nextFrame[0];
			if (now < nextFrameEndsAt) {
				var x = this.lastFrame[1][0];
				var y = this.lastFrame[1][1];
				var rotate = this.lastFrame[1][2];
				var targetX = this.nextFrame[1][0];
				var targetY = this.nextFrame[1][1];
				var targetRotate = this.nextFrame[1][2];

				// if entity is flipped, then flip the keyFrames as well
				if (this._entity._stats.flip == 1) {
					x = -this.lastFrame[1][0];
					targetX = -this.nextFrame[1][0];
					rotate = -this.lastFrame[1][2];
					targetRotate = -this.nextFrame[1][2];
				}

				var interpolatedX = this._entity.interpolateValue(x, targetX, this.startTime, now, nextFrameEndsAt);
				var interpolatedY = this._entity.interpolateValue(y, targetY, this.startTime, now, nextFrameEndsAt);
				var interpolatedRotate = this.interpolateValue(rotate, targetRotate, this.startTime, now, nextFrameEndsAt);

				// for smooth transitioning from 3.14 to -3.14
				if (Math.abs(targetRotate - rotate) > Math.PI) {
					if (targetRotate > rotate) rotate += Math.PI * 2;
					else rotate -= Math.PI * 2;
				}

				this.offset.rotate = interpolatedRotate;

				if (this._entity._category == 'item' && this._entity._stats.currentBody) {
					if (this._entity._stats.currentBody.jointType == 'weldJoint') {
						var ownerUnit = this._entity.getOwnerUnit();
						if (ownerUnit) {
							rotate = ownerUnit._rotate.z;
						}
					}
					// if item is rotating, and is carried by a unit, then compute its new rotation axis using its itemAnchor and unit anchor.
					if (this.offset.rotate != 0) {
						rotate = this._entity._rotate.z;

						var before = this._entity.getAnchoredOffset(rotate);
						var after = this._entity.getAnchoredOffset(rotate + interpolatedRotate);
						this.offset.x = after.x - before.x;
						this.offset.y = after.y - before.y;
						return;
					}
				}

				interpolatedRotate += angle;
				this.offset.x = interpolatedX * Math.cos(interpolatedRotate) + interpolatedY * Math.sin(interpolatedRotate);
				this.offset.y = interpolatedX * Math.sin(interpolatedRotate) - interpolatedY * Math.cos(interpolatedRotate);
			} else {
				this.lastFrame = this.keyFrames.shift();
				this.nextFrame = this.keyFrames[0];
				this.startTime = now;
			}
		} else {
			// repeat infinite tween
			if (this.loopCount == -1) {
				this.start(this.tweenId);
				return;
			}
			this.offset = { x: 0, y: 0, rotate: 0 };
			this.isTweening = false;
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TweenComponent;
}
