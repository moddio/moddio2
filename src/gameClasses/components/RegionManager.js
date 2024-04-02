var RegionManager = TaroClass.extend({
	classId: 'RegionManager',
	componentId: 'regionManager',

	init: function () {
		var self = this;
		self.isAddNewRegion = false;
		self.entitiesInRegion = {};

		if (taro.isClient) {
			$('#region-modal-client').on('submit', '#region-form', function (e) {
				e.preventDefault();
				var defaultKey = $('#region-modal-key').val();
				self.submitRegion();
			});

			$('#region-modal-client').on('keypress', function (e) {
				if (e.charCode === 13) {
					e.preventDefault();
					self.submitRegion();
				}
			});

			$('#region-modal-client').on('click', '#region-delete-btn', function (e) {
				e.preventDefault();
				var defaultKey = $('#region-modal-defaultKey').val();
				x;
				var updatedRegion = {
					deleteKey: defaultKey,
				};
				self.updateRegionToDatabase(updatedRegion);
			});
		}
	},

	getRegionById(regionName) {
		return taro.$$('region').find(function (region) {
			if (region && region._stats && region._stats.id === regionName) {
				return true;
			}
		});
	},
	submitRegion: function () {
		var self = this;
		var updatedRegion = {
			dataType: $('#region-modal-datatype').val(),
			key: $('#region-modal-key').val(),
			default: {
				x: parseFloat($('#region-modal-x').val()),
				y: parseFloat($('#region-modal-y').val()),
				width: parseFloat($('#region-modal-width').val()),
				height: parseFloat($('#region-modal-height').val()),
			},
		};
		if ($('#region-modal-key').val() != $('#region-modal-defaultKey').val()) {
			updatedRegion.deleteKey = $('#region-modal-defaultKey').val();
		}
		if (updatedRegion.key.includes('.')) {
			swal('Alert!!!', "cannot create region having '.' in the key", 'error');
			return;
		}
		self.updateRegionToDatabase(updatedRegion);
	},

	updateRegionToDatabase: function (updatedRegion) {
		var self = this;
		var isRegionDeleted = false;
		var region = taro.regionManager.getRegionById(updatedRegion.key);
		var deleteRegion = taro.regionManager.getRegionById(updatedRegion.deleteKey);
		var isRegionSameAsDeleted = region === deleteRegion;

		if (deleteRegion && updatedRegion.deleteKey) {
			delete taro.game.data.variables[updatedRegion.deleteKey];
			deleteRegion.deleteRegion();
			isRegionDeleted = true;
		}
		if (updatedRegion.key) {
			if (region && region._stats) {
				for (var i in region._stats) {
					if (updatedRegion[i]) {
						if (typeof region._stats[i] === 'object') {
							for (var j in region._stats[i]) {
								if (updatedRegion[i][j] != undefined) {
									region._stats[i][j] = updatedRegion[i][j];
								} else {
									updatedRegion[i][j] = region._stats[i][j];
								}
							}
						} else {
							region._stats[i] = updatedRegion[i];
						}
					}
				}

				region.updateDimension();
			} else {
				var updatedRegionKey = updatedRegion.key;
				var copiedRegion = rfdc()(updatedRegion);
				delete copiedRegion.key;
				taro.game.data.variables[updatedRegionKey] = copiedRegion;
				taro.map.createRegions();
			}
		}
		if (taro.isClient) window.updateReactGameState(rfdc()(updatedRegion));
		if (isRegionDeleted) {
			var newRegion = rfdc()(updatedRegion);
			var regionKey = newRegion.key;
			delete newRegion.key;
			taro.game.data.variables[regionKey] = newRegion;
			taro.map.createRegions();
		}

		if (taro.isClient) $('#region-modal-client').modal('hide');
	},
	openRegionModal: function (region, key, isAddNewRegion) {
		if (isAddNewRegion) {
			taro.regionManager.isAddNewRegion = isAddNewRegion;
		}
		if (region && !$('#region-modal-client').hasClass('show')) {
			$('#region-modal-datatype').val(region.dataType);
			$('#region-modal-x').val(region.default.x);
			$('#region-modal-y').val(region.default.y);
			$('#region-modal-width').val(region.default.width);
			$('#region-modal-height').val(region.default.height);
			$('#region-modal-defaultKey').val(key);
			$('#region-modal-key').val(key);
			if (isAddNewRegion) {
				$('#region-update-btn').html("<i class='fa fa-plus'></i> Create</button>");
				$('#region-delete-btn').prop('disabled', true);
			} else {
				taro.regionManager.isAddNewRegion = false;
				$('#region-update-btn').html("<i class='fa fa-floppy-o'></i> Save</button>");
				$('#region-delete-btn').prop('disabled', false);
				// $('#region-modal-key').prop("disabled", true);
			}
			$('button').focus(function () {
				this.blur();
			});
			$('#region-modal-client').modal({
				show: true,
			});
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = RegionManager;
}
