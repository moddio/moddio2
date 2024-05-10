namespace Renderer {
	export namespace Three {
		export class FloatingText extends Node {
			constructor(x: number, y: number, z: number, text: string, color: string, offsetX = 0, offsetY = 0) {
				super();

				const label = new Label({ x, y, z, text, color, renderOnTop: true });

				const xOffsetInLabelWidthUnits = offsetX / label.width;
				const yOffsetInLabelHeightUnits = offsetY / label.height;
				label.setCenter(xOffsetInLabelWidthUnits, yOffsetInLabelHeightUnits);
				this.add(label);

				const travelDistancePx = 40;
				const travelDistanceInLabelHeights = travelDistancePx / label.height;

				const center = label.getCenter();

				new TWEEN.Tween({ offset: center.y, opacity: 1 })
					.to({ offset: center.y + travelDistanceInLabelHeights, opacity: 0 }, 2500)
					.onUpdate(({ offset, opacity }) => {
						label.setCenter(0.5, offset);
						label.setOpacity(opacity);
					})
					.onComplete(() => this.destroy())
					.start();
			}

			static create(config: FloatingTextConfig, zOffset = 0) {
				return new FloatingText(
					Utils.pixelToWorld(config.x),
					// Will only look good top down orthographic currently; Need to get
					// correct height from engine when the engine uses 3D coords.
					zOffset,
					Utils.pixelToWorld(config.y),
					config.text,
					config.color
				);
			}
		}

		export type FloatingTextConfig = { text: string; x: number; y: number; color: string };
	}
}
