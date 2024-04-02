declare namespace Phaser {
	namespace Textures {
		namespace Parsers {
			function SpriteSheet(
				texture: Phaser.Textures.Texture,
				sourceIndex: number,
				x: number,
				y: number,
				width: number,
				height: number,
				config: {
					frameWidth: number;
					frameHeight?: number;
					startFrame?: number;
					endFrame?: number;
					margin?: number;
					spacing?: number;
				}
			): Phaser.Textures.Texture;
		}
	}
}
