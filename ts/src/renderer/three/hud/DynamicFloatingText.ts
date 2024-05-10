namespace Renderer {
	export namespace Three {
		export class DynamicFloatingText extends Node {
			label: Label;

			constructor(
				x: number,
				y: number,
				z: number,
				text: string,
				color: string,
				duration = 0,
				offsetX = 0,
				offsetY = 0
			) {
				super();

				const label = new Label({ x, y, z, text, color, renderOnTop: true });
				const xOffsetInLabelWidthUnits = offsetX / label.width;
				const yOffsetInLabelHeightUnits = offsetY / label.height;
				label.setCenter(xOffsetInLabelWidthUnits, yOffsetInLabelHeightUnits);
				this.add(label);
				this.label = label;

				new TWEEN.Tween({ opacity: 1 })
					.to({ opacity: 0 }, duration)
					.onUpdate(({ opacity }) => {
						label.setOpacity(opacity);
					})
					.onComplete(() => this.destroy())
					.start();

				const tweenUpNormalizedDuration = 0.3;
				const tweenDownNormalizedDuration = 0.7;
				const tweenUpDuration = duration * tweenUpNormalizedDuration;
				const tweenDownDuration = duration * tweenDownNormalizedDuration;

				// TODO(nick): My vision of the functionality this class should
				// eventually have:
				//
				// X tween
				// Y tween
				// Opacity tween
				// Scale tween
				// Color tween
				// And by default it can use a linear tweening function
				//
				// Right now only the color and the duration can be set in the editor
				// under the 'createDynamicFloatingText' action.

				const randFloatBetween = (min, max) => {
					return Math.random() * (max - min) + min;
				};

				const xMin = 2;
				const xMax = 2;
				const leftOrRight = Math.random() < 0.5 ? -1 : 1;
				const xOffset = Utils.worldToPixel(randFloatBetween(xMin, xMax) * leftOrRight);

				new TWEEN.Tween({ xOffset: 0 })
					.to({ xOffset: xOffset }, duration)
					.onUpdate(({ xOffset }) => {
						const offsetInLabelWidth = xOffset / label.width;
						label.setCenterX(offsetInLabelWidth);
					})
					.start();

				const yMin = 1;
				const yMax = 2;
				// const upOrDown = Math.random() < 0.5 ? -1 : 1;
				const upOrDown = 1;
				const yOffset = Utils.worldToPixel(randFloatBetween(yMin, yMax) * upOrDown);

				new TWEEN.Tween({ yOffset: 0 })
					.to({ yOffset: yOffset }, tweenUpDuration)
					.easing(TWEEN.Easing.Quintic.Out)
					.onUpdate(({ yOffset }) => {
						const offsetInLabelHeights = yOffset / label.height;
						label.setCenterY(offsetInLabelHeights);
					})
					.onComplete(() => {
						new TWEEN.Tween({ yOffset: yOffset })
							.to({ yOffset: 0 }, tweenDownDuration)
							.easing(TWEEN.Easing.Quadratic.In)
							.onUpdate(({ yOffset }) => {
								const offsetInLabelHeights = yOffset / label.height;
								label.setCenterY(offsetInLabelHeights);
							})
							.start();
					})
					.start();
			}

			static create(config: DynamicFloatingTextConfig, zOffset = 0) {
				return new DynamicFloatingText(
					Utils.pixelToWorld(config.x),
					// Will only look good top down orthographic currently; Need to get
					// correct height from engine when the engine uses 3D coords.
					zOffset,
					Utils.pixelToWorld(config.y),
					config.text,
					config.color,
					config.duration
				);
			}
		}

		export type DynamicFloatingTextConfig = { text: string; x: number; y: number; color: string; duration: number };
	}
}
