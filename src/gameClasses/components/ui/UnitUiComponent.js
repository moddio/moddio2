var UnitUiComponent = TaroEntity.extend({
	classId: 'UnitUiComponent',
	componentId: 'unitUi',

	init: function (entity, options) {
		var self = this;
		self._entity = entity;
	},

	updateAllAttributeBars: function () {
        console.log('updateAllAttributeBars')
		var self = this;

		var attributes = self._entity._stats.attributes; // get unit's attribute types
		// assign "type" variable to attributes
		for (var attributeId in attributes) {
			attributes[attributeId].type = attributeId;
		}

		if (taro.isClient && taro.network.id() == self._entity._stats.clientId) {
			// var attributeContainerComponent = self._entity.getAttributeBarContainer()
			var ownerPlayer = self._entity.getOwner();
			var belongsToSelectedUnit = ownerPlayer && ownerPlayer._stats && ownerPlayer._stats.selectedUnitId === self._entity.id();

			if (belongsToSelectedUnit) {
				$('#attribute-bars').html('');
			}

			var isAttributeBarPresent = false;
            taro.client.emit('update-all-attributes', attributes);
			for (var attributeTypeId in attributes) {
				// if (attributeContainerComponent) {
				// 	attributeContainerComponent.updateBar(attributeTypeId, attributes[attributeTypeId])
				// }

				if (belongsToSelectedUnit) {
					var attribute = attributes[attributeTypeId];
					if (
						attribute.isVisible && (
							attribute.isVisible === true || // for old deprecated method of showing attr bar
							(attribute.isVisible.indexOf && attribute.isVisible.indexOf('centerBar') > -1)
						)
					) {
                        console.log('attribute present', attribute)
                        //taro.client.emit('attribute', attribute);
						isAttributeBarPresent = true;
						var width = (attribute.value / attribute.max) * 100;

						var bar = $('<div/>', {
							class: 'progress'
						}).append(
							$('<div/>', {
								class: `label progress-label player-${attributeTypeId}`,
								style: 'position: absolute; margin-top: 3px; width: 100%; color: black; font-size: 14px'
							})
						).append(
							$('<div/>', {
								class: `player-max-${attributeTypeId} progress-bar progress-bar-info`,
								role: 'progressbar',
								'aria-valuemin': '0',
								'aria-valuemax': '100',
								style: `width: ${width}%;font-weight:bold;transition:none; background-color:${attribute.color}`
							})
						);

						$('#attribute-bars').append(bar);
					}
				}

				self._entity.attribute.refresh();
			}
			if (isAttributeBarPresent) {
				$('#attribute-bars').css({
					minWidth: '200px'
				});
			}
		}
	},
	removeAllAttributeBars: function () {
		var self = this;
		if (taro.isClient && taro.network.id() == self._entity._stats.clientId) {
			$('#attribute-bars').html('');
		}
	},
	// update one attribute bar
	updateAttributeBar: function (attr) {
        console.log('updateAttributeBar', attr)
		var self = this;

		// only update attributes for this unit
		if (self._entity && self._entity._stats.clientId != taro.network.id()) {
			return;
		}
		var attributeTypes = taro.game.data.attributeTypes;
		if (attributeTypes == undefined || attr == undefined)
			return;

		var name = attributeTypes[attr.type] ? attributeTypes[attr.type].name : attr.name;

		// self._entity.updateAttributeBar(attr); // updating UnitBars from HTML Bar???

		if (
			attr.isVisible && (
				attr.isVisible === true || // for old deprecated method of showing attr bar
				(attr.isVisible.indexOf && attr.isVisible.indexOf('centerBar') > -1)
			)
		) {
			if (attr.value % 1 === 0) {
				attr.value = parseInt(attr.value);
			} else {
				if (attr.decimalPlaces != undefined && attr.decimalPlaces != null) {
					var decimalPlace = parseInt(attr.decimalPlaces);
					if (decimalPlace != NaN) {
						attr.value = parseFloat(attr.value).toFixed(decimalPlace);
					} else {
						attr.value = parseFloat(attr.value).toFixed(2);
					}
				} else {
					attr.value = parseFloat(attr.value).toFixed(2);
				}
			}

			var value = null;
			if (attr.dataType === 'time') {
				value = taro.game.secondsToHms(attr.value);
			} else {
				value = attr.value;
			}

			$(`.player-${attr.type}`).text(attr.displayValue ? `${name}: ${value}/${parseFloat(attr.max).toFixed(0)}` : name);
			var widthInPercent = (attr.value / attr.max) * 100;

			$(`.player-max-${attr.type}`).stop().animate({
				width: `${widthInPercent}%`
			});

            taro.client.emit('update-attribute-bar', attr);
		}
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = UnitUiComponent; }
