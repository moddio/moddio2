namespace Renderer {
	export namespace Three {
		export class Mapper {
			static ProgressBar(attr: AttributeData, config: ProgressBarParams = {}) {
				if (attr.dimensions) {
					config.width = attr.dimensions.width;
					config.height = attr.dimensions.height;
				}

				if (!isNaN(attr.cornerRounding)) {
					config.radius = attr.cornerRounding;
				}

				if (attr.backgroundColor) {
					config.bgColor = attr.backgroundColor;
				}

				if (attr.color) {
					config.fgColor = attr.color;
				}

				if (attr.strokeColor) {
					config.strokeColor = attr.strokeColor;
				}

				if (attr.strokeThickness) {
					config.strokeThickness = attr.strokeThickness;
				}

				if (typeof attr.value === 'number') {
					config.value = attr.value;
				}

				if (attr.max) {
					config.max = attr.max;
				}

				if (attr.displayValue) {
					config.displayValue = attr.displayValue;
				}

				if (attr.decimalPlaces) {
					config.decimalPlaces = attr.decimalPlaces;
				}

				if (attr.trailingZeros) {
					config.trailingZeros = attr.trailingZeros;
				}

				if (attr.fontSize) {
					config.fontSize = attr.fontSize;
				}

				if (attr.letterSpacing) {
					config.letterSpacing = attr.letterSpacing;
				}

				if (attr.anchorPosition) {
					const isAbove = attr.anchorPosition === 'above-unit';
					config.anchorPosition = isAbove ? 'above' : 'below';
				} else {
					config.anchorPosition = 'below';
				}

				return config;
			}
		}
	}
}
