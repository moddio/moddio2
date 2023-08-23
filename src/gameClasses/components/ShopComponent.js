var ShopComponent = TaroEntity.extend({
	classId: 'ShopComponent',
	componentId: 'shop',

	init: function (entity, options) {
		var self = this;

		if (taro.isClient) {
			// $("#confirm-purchase-button").on("click", function() {
			// 	self.purchase(self.itemToBePurchased.id)
			// })

			if (isLoggedIn) {
				self.loadUserPurchases();
			}else{
				self.loadShopItems();
			}

			self.unitSkinCount = {};
			self.itemSkinCount = {};
			self.skinItems = {};
			self.currentPagination = 1;
			self.perPageItems = 20;
			self.currentType = '';
			self.oldModalHTMLBody = '';
			// if (!taro.isMobile) {
			$('.open-modd-shop-button').on('click', function () {
				self.openModdShop();
			});
			// }

			$('.open-coin-shop-button').show().on('click', function () {
				self.openCoinShop();
			});

			$('.shop-navbar .nav-item').on('click', function () {
				$('.shop-navbar .nav-link').each(function () {
					$(this).removeClass('active');
				});
				self.shopType = $(this).find('.nav-link').attr('name');
				self.shopKey = '';
				$('#modd-shop-modal .shop-items').html('');
				$(this).find('.nav-link').addClass('active');
				self.updateModdShop();
			});

			$('.item-shop-navbar .nav-item').on('click', function () {
				if (!$(this.firstElementChild).hasClass('active')) {
					$('.shop-navbar .nav-link').each(function () {
						$(this).removeClass('active');
					});
					var selected = $(this).find('.nav-link').attr('name');

					$('#modd-item-shop-modal .items-shop').html('');
					$(this).find('.nav-link').addClass('active');
					self.openItemShop(self.currentType, selected);
				}
			});

			$('#mod-shop-pagination').on('click', '.skin-pagination', function () {
				var itemDom = $(this);
				var buttonPressed = itemDom[0].dataset.text;
				var totalPages = Math.ceil(self.skinItems.length / self.perPageItems);
				if (buttonPressed === 'next') {
					if (self.currentPagination < totalPages) {
						self.currentPagination++;
					}
				} else if (buttonPressed === 'previous') {
					if (self.currentPagination > 1) {
						self.currentPagination--;
					}
				} else {
					self.currentPagination = parseInt(buttonPressed);
				}
				self.paginationForSkins();
			});

			// purchase items
			$(document).on('click', '.btn-purchase-item', function () {
				// if ($(this).attr("isadblockenabled") === "true") {
				// 	Swal({
				// 		html: "<div class='swal2-title text-warning'><i class='fas fa-sad-tear fa-2x'></i></div><div class='swal2-title'>First, please disable your Adblock</div><div class='swal2-text'>Please support us. Our servers cost money.</div>",
				// 		button: "close",
				// 	});
				// }
				// else {
				var isItemRequirementSetisfied = $(this).attr('requirementsSatisfied') == 'true';
				var isItemAffordable = $(this).attr('isItemAffordable') == 'true';
				var isCoinTxRequired = $(this).attr('isCoinTxRequired') == 'true';
				var itemPrice = $(this).attr('itemPrice');
				var name = $(this).attr('name');
				if (!isItemRequirementSetisfied) {
					self.purchaseWarning('requirement', name);
					return;
				}
				if (!isItemAffordable) {
					self.purchaseWarning('price', name);
					return;
				}

				if (itemPrice && (parseFloat(itemPrice) > 0) && window.userId && window.userId.toString() !== window.gameJson?.data?.defaultData?.owner?.toString()) {
					window.userId && window.trackEvent && window.trackEvent('Coin Purchase', {
						coins: parseFloat(itemPrice),
						distinct_id: window.userId.toString(),
						type: "ingame-item",
						// purchaseId: purchasableId,
						gameId: window.gameId?.toString(),
						status: "initiated",
						isPINsetupCompleted: window.isPinExists
					});
				}

				if (isCoinTxRequired) {
					self.verifyUserPinForPurchase($(this).attr('id'));
				} else {
					self.purchase($(this).attr('id'));
				}
			});

			$(document).on('click', '.btn-purchase-unit', function () {
				$('#modd-item-shop-modal').modal('hide');
				self.purchaseUnit($(this).attr('id'));
				// self.confirmPurchase($(this).attr("id"))
			});
			// listen for item modal close
			$('#modd-item-shop-modal').on('hidden.bs.modal', function () {
				$('.popover').remove();
				taro.client.myPlayer.control.updatePlayerInputStatus();
			});
			// purchase purchasable
			$(document).on('click', '.btn-purchase-purchasable', function () {
				if ($(this).hasClass('disabled')) return;
				var itemDom = $(this);
				var name = itemDom[0].dataset.purchasable;
				var price = isNaN(parseFloat(itemDom[0].dataset.price)) ? itemDom[0].dataset.price : parseFloat(itemDom[0].dataset.price);
				var isUnauthenticated = itemDom[0].dataset.unauthenticated;

				if (isUnauthenticated === 'true' && !(price === 'facebook' || price === 'twitter')) {
					// alert('You should be logged in to purchase the item.');
					window.openLoginOptionFrameModal();
					return;
				}
				var hasSharedDefer = $.Deferred();

				if (price <= 0) {
					promise = $.ajax({
						url: `/api/user/has-shared/${taro.game.data.defaultData.parentGame || taro.client.server.gameId}`,
						dataType: 'html',
						type: 'GET',
						success: function (data) {
							var response = JSON.parse(data);

							if (response.status === 'success') {
								hasSharedDefer.resolve(response.message);
							} else {
								hasSharedDefer.reject(response.message);
							}
						},
						error: function (req, status, err) {
							hasSharedDefer.reject(err);
						}
					});
				} else {
					hasSharedDefer.resolve(true);
				}

				hasSharedDefer.promise()
					.then(function (hasShared) {
						if (hasShared) {
							var itemId = itemDom.attr('id');
							var gameData = taro.game.data.defaultData;

							if (price === 'facebook' || price === 'twitter') {
								var item = { value: gameData._id, type: 'game' };
								var from = 'shopModal';

								if (price === 'facebook') {
									var config = {
										url: location.href,
										caption: `Join me at ${gameData.title}`,
										// fb does not allow whitespaces in image url
										image: gameData.cover ? gameData.cover.replace(' ', '%20') : undefined
									};

									shareOnFacebook(item, from, config, function (response) {
										if (response) {
											$(`[id=${itemId}][data-price=facebook]`).addClass('disabled');
											// if (isUnauthenticated === "true") {
											// 	$('#login-modal').modal('show');
											// } else {
											self.buySkin(itemId, 'facebook');
											// }
										}
									});
								} else if (price === 'twitter') {
									// this event is handled by template.js twitter.bind('tweet') listener
								}
							} else {
								$('#purchasable-purchase-modal').data('purchasable', itemId);
								$('#purchasable-purchase-modal').data('price', price);
								$('#purchasable-purchase-modal').modal('show');
								// if (confirm("Are you sure you want to purchase " + name + " ?")) {
								// 	self.buySkin(itemId);
								// }
							}
						} else {
							$('.share-modal').modal('show');
						}
					})
					.catch(function (err) {
						console.error(err);
					});
			});

			// equip purchasable
			$(document).on('click', 'button.btn-equip', function () {
				var button = $(this);

				$.ajax({
					url: `/api/user/equip/${taro.game.data.defaultData.parentGame || taro.client.server.gameId}/${button.attr('id')}`,
					dataType: 'html',
					type: 'POST',
					success: function (data) {
						var response = JSON.parse(data);

						if (response.status == 'success') {
							self.updateModdShop();
							if (!taro.client.myPlayer._stats.purchasables || !(taro.client.myPlayer._stats.purchasables instanceof Array)) taro.client.myPlayer._stats.purchasables = [];
							var equipedPurchasable = response.message;
							// taro.client.myPlayer._stats.purchasables.push(equipedPurchasable);
							var myUnit = taro.$(taro.client.myPlayer._stats.selectedUnitId);
							taro.network.send('equipSkin', equipedPurchasable);
							// myUnit.equipSkin();
						} else if (response.status == 'error') {
							if (!response.message.includes('No matching document found')) {
								alert(response.message);
							}
						}
					}
				});
			});

			// unequip purchasable
			$(document).on('click', 'button.btn-unequip', function () {
				var button = $(this);
				var unEquipedId = button.attr('id');
				$.ajax({
					url: `/api/user/unequip/${taro.game.data.defaultData.parentGame || taro.client.server.gameId}/${unEquipedId}`,
					dataType: 'html',
					type: 'POST',
					success: function (data) {
						var response = JSON.parse(data);

						if (response.status == 'success') {
							var myUnit = taro.$(taro.client.myPlayer._stats.selectedUnitId);
							// myUnit.unEquipSkin(unEquipedId);
							taro.network.send('unEquipSkin', unEquipedId);
							self.updateModdShop();
						} else if (response.status == 'error') {
							alert(response.message);
						}
					}
				});
			});
		}
	},
	loadShopItems: function () {
		let self = this;
		$.ajax({
			url:`/api/game/${gameId}/shopCount/`,
			type: 'GET',
			success: function (response) {
				if(response.status == 'success') {
					try {
						let shopItems = response.message || [];

					// check if shop item is object or array
					let purchasableItems = [];
					if (shopItems instanceof Array) {
						purchasableItems = shopItems;
					}
					 else {
						// get first key of object
						purchasableItems = shopItems[Object.keys(shopItems)[0]];
					}

					purchasableItems = purchasableItems.slice(0, 4);

					purchasableItems.forEach(function (purchasable, index) {
						let html = `<div id="${purchasable._id}-locked" class="border rounded bg-light p-2 mx-2 ${index < 2 ? 'mb-3' : ''} col-5 d-flex flex-column justify-content-between">` +
							'  <div class="my-2 text-center">' +
							`	<img src=" ${purchasable.image} " style="height: 45px; width: 45px;" />` +
							'	 </div>' +
							'	 <div class="d-flex justify-content-center action-button-container">';
						if (purchasable.soldForSocialShare) {
							html += self.getTwitterBtnHtml(purchasable);
						} else {
							html += `<button class="btn btn-sm btn-outline-success" id="${purchasable._id}-locked-button"` +
								`			 onClick="openLoginOptionFrameModal()">` +
								'			 <div class="d-flex align-items-center">' +
								'				 <img src="/assets/images/coin.svg" height="20" alt="Modd Coins" class="mr-1" />' +
								`				 ${purchasable.price}` +
								'			 </div>' +
								'		 </button>';
						}

						html += '	 </div>' +
							'</div>';
						var skin = $(html);
						$('#skins-list').append(skin);
					});
					$('#loading-skins').addClass('d-none');
					$('#skins-list').removeClass('d-none').addClass('row');
					}catch{
						$('#loading-skins').addClass('d-none');
						$('#error-loading-shop').removeClass('d-none');
					}
				}
			}
		})
	},
	loadUserPurchases: function () {
		let self = this;
		$.ajax({
			url: `/api/user/${gameId}/purchases`,
			type: 'GET',
			success: function (response) {
				if (response.status == 'success') {
					userPurchases = response.message || [];
					var userPurchasedItemIds = userPurchases.reduce(function (partial, purchase) {
						partial[purchase._id] = true;
						return partial;
					}, {});

					var purchasableItems = typeof purchasables.filter === 'function' && purchasables.filter(function (purchasable) {
						return !userPurchasedItemIds[purchasable._id];
					}) || [];

					// limit number of skins shown on menu
					purchasableItems = purchasableItems.slice(0, 4);

					// remove skin shop UI if there are no skins in the game which user can purchase
					// if (purchasables.length === 0) {
					// 	var menuColumnRightContainer = $("#menu-column-right-container")[0];

					// 	if (!menuColumnRightContainer) {
					// 		return;
					// 	}

					// 	var skinShopParent = $(menuColumnRightContainer).find("#menu-column-left")[0];

					// 	if (skinShopParent) {
					// 		skinShopParent.remove();
					// 	}
					// 	else {
					// 		var skinShop = $("#skin-shop-container")[0];

					// 		if (skinShop) {
					// 			skinShop.remove();
					// 		}
					// 	}

					// 	// since we removed the skin shop, to make sure we are not showing empty div check for text content on
					// 	var isRightColumnBlank = menuColumnRightContainer.innerText.trim().length === 0;

					// 	if (isRightColumnBlank) {
					// 		menuColumnRightContainer.remove();
					// 	}
					// }

					purchasableItems.forEach(function (purchasable, index) {
						let html = `<div id="skin-list-${purchasable._id}" class="border rounded bg-light p-2 mx-2 ${index < 2 ? 'mb-3' : ''} col-5 d-flex flex-column justify-content-between">` +
							'  <div class="my-2 text-center">' +
							`	<img src=" ${purchasable.image} " style="height: 45px; width: 45px;" />` +
							'	 </div>' +
							'	 <div class="d-flex justify-content-center action-button-container">';
						if (purchasable.soldForSocialShare) {
							html += self.getTwitterBtnHtml(purchasable);
						} else {
							html += `<button class="btn btn-sm btn-outline-success btn-purchase-purchasable" id="${purchasable._id}"` +
								`			 data-purchasabled="${purchasable.name}" data-price="${purchasable.price}">` +
								'			 <div class="d-flex align-items-center">' +
								'				 <img src="/assets/images/coin.svg" height="20" alt="Modd Coins" class="mr-1" />' +
								`				 ${purchasable.price}` +
								'			 </div>' +
								'		 </button>';
						}

						html += '	 </div>' +
							'</div>';
						var skin = $(html);
						// var itemDetails = null;
						$('#skins-list').append(skin);
						// if (purchasable.target && purchasable.target.entityType == 'unit') {
						// 	itemDetails = taro.game.cloneAsset('unitTypes', purchasable.target.key);
						// }
						// self.renderShopImage(itemDetails, purchasable, 'menu_image');
					});

					$('#loading-skins').addClass('d-none');
					$('#skins-list').removeClass('d-none').addClass('row');
				} else if (response.status == 'error') {
					$('#loading-skins').addClass('d-none');
					console.log(response.message);
				}
			}
		});
	},
	purchaseWarning: function (type, itemName) {
		var text = '';
		switch (type) {
			case 'requirement':
				text = `<strong>${itemName} requirements not met.</strong>`;
				break;
			case 'price':
				text = `<strong>Cannot afford ${itemName}.</strong>`;
				break;
			case 'inventory_full':
				text = '<strong>No room in inventory.</strong>';
				break;
			case 'purchase':
				text = '<strong>Item purchased.</strong>';
				break;
		}

		if ($('#modd-item-shop-modal').hasClass('show')) {
			$('#item-purchase-warning').html(text);
			$('#item-purchase-warning').show();

			setTimeout(function () {
				$('#item-purchase-warning').fadeOut();
			}, 800);
		}
	},
	buySkin: function (itemId, sharedOn = '', token = '') {
		var self = this;
		$.ajax({
			url: `/api/user/purchase/${taro.game.data.defaultData.parentGame || taro.client.server.gameId}/${itemId}?sharedOn=${sharedOn}`,
			dataType: 'html',
			type: 'POST',
			data: {
				token,
			},
			success: function (data) {
				var response = JSON.parse(data);

				if (response.status == 'success') {
					$('.player-coins').html(parseFloat(response.remaining_coins));

					if (taro.client.myPlayer) {
						taro.client.myPlayer._stats.coins = parseFloat(response.remaining_coins);
					}

					$('#purchasable-purchase-modal').modal('hide');
					self.updateModdShop();
					self.updateSkinList(itemId);

					// update skin menu on game page
					var details = $(`.btn-purchase-purchasable#${itemId}`);
					var purchasableInfo = details.find('.purchasable-details');
					if (purchasableInfo && purchasableInfo.html) {
						details.removeClass('btn-purchase-purchasable');
						purchasableInfo.html('<span class=\'fas fa-check text-success\'></span>');
					}
				} else if (response.status == 'error') {
					if (!response.message.includes('No matching document found')) {
						var error = `<div class="alert alert-danger text-center">${response.message}</div>`;
						$('#purchasable-purchase-modal .purchasable-info-container').html(error);
					}
				}
			}
		});
	},

	// tabSelected = unit/item
	openModdShop: function (tabSelected, elementIdToFocus) {
		if (taro.isClient) {
			var self = this;

			this.hideEmptyTabs();
			if (tabSelected && tabSelected == 'item' && $('[id=item]').css('display') == 'none') {
				tabSelected = 'unit';
			}

			if (tabSelected && tabSelected == 'unit' && $('[id=unit]').css('display') == 'none') {
				tabSelected = 'item';
			}

			this.updateModdShop(tabSelected);

			if (elementIdToFocus) {
				$('#modd-shop-modal').one('shown.bs.modal', function () {
					$(this).animate({
						scrollTop: $(elementIdToFocus).offset().top - 100
					}, 1000, function () {
						$(elementIdToFocus).effect('highlight', {}, 3000);
					});
				});
			}

			$('#modd-shop-modal').modal({
				show: true,
				keyboard: true
			});
		}
	},

	hideEmptyTabs: function () {
		var self = this;

		var unitArr = [];
		var itemArr = [];

		if (!taro.game.data.unitTypes) {
			$('[id=unit]').hide();
			$('[id=unitSkins]').hide();
		} else {
			for (unitId in taro.game.data.unitTypes) {
				var unit = taro.game.data.unitTypes[unitId];
				if (unit.isPurchasable) {
					unitArr.push(unit);
				}
			}
			if (unitArr.length === 0) {
				$('[id=unit]').hide();
			}
		}
		if (!taro.game.data.itemTypes) {
			$('[id=item]').hide();
			$('[id=itemSkins]').hide();
		} else {
			for (itemId in taro.game.data.itemTypes) {
				var item = taro.game.data.itemTypes[itemId];
				if (item.isPurchasable) {
					itemArr.push(item);
				}
			}
			if (itemArr.length === 0) {
				$('[id=item]').hide();
			} else if (unitArr.length === 0) {
				if (self.shopType === undefined) {
					self.shopType = 'item';
					$('[id=item]').addClass('active');
				}
			}
		}

		$.ajax({
			url: `/api/game/${taro.game.data.defaultData.parentGame || taro.client.server.gameId}/shopCount/`,
			type: 'GET',
			success: function (data) {
				if (data.status === 'success') {
					if (data.message) {
						if (!data.message.unitCount || data.message.unitCount.length === 0) {
							$('[id=unitSkins]').hide();
						} else if (data.message.unitCount) {
							for (var i in taro.game.data.unitTypes) {
								var total = data.message.unitCount.filter(function (unit, key) {
									if (unit && unit.target && unit.target.key === i) return true;
								});
								if (total) {
									total = total.length;
								} else {
									total = 0;
								}
								self.unitSkinCount[i] = total;
							}
						}
						if (!data.message.itemCount || data.message.itemCount.length === 0) {
							$('[id=itemSkins]').hide();
						} else if (data.message.itemCount) {
							for (var i in taro.game.data.itemTypes) {
								var total = data.message.itemCount.filter(function (item, key) {
									if (item && item.target && item.target.key === i) return true;
								});
								if (total) {
									total = total.length;
								} else {
									total = 0;
								}
								self.itemSkinCount[i] = total;
							}
						}

						self.checkIfAnyTabSelected();
					}
				}
			}
		});
	},
	getTwitterBtnHtml: function (item) {
		var sharedOn = item.sharedOn || {};
		var title = item.title || item.name;
		var sharedOnTwitter = sharedOn.twitter ? 'disabled' : '';
		var gameId = taro.game.data.defaultData._id;
		var textToTweet = `Join me in ${taro.game.data.defaultData.title} (${location.href})`;
		var hashTags = ['games', 'moddio'];
		var mentions = ['moddio'];
		var twitterUrl = `https://twitter.com/intent/tweet?text=${textToTweet}&hashtags=${hashTags.join(',')}&via=${mentions.join(',')}`;

		return `<a id="${item._id}" data-unauthenticated="true" href="${twitterUrl}" data-from="marketplace-item" data-item-data='{"type": "game", "value": "${gameId}", "itemId": "${item._id}"}' data-price="twitter" data-purchasable="${title}" class="btn btn-outline-info btn-purchase-purchasable ${sharedOnTwitter}"><i class="fab fa-twitter-square fa-lg"></i></a>`;
	},
	buttonForSocialShare: function (item, unauthenticated) {
		var btnHtml = '';
		var sharedOn = item.sharedOn || {};
		var sharedOnFacebook = sharedOn.facebook ? 'disabled' : '';
		var gameId = taro.game.data.defaultData._id;

		if (item) {
			var title = item.title || item.name;
			btnHtml += '<div class="btn-group align-middle" role="group" aria-label="Basic example">';
			// remove facebook button from shop
			// btnHtml += `<button data-unauthenticated="true" id="${item._id}" type="button" data-price="facebook" data-purchasable="${title}" class="btn btn-outline-primary btn-purchase-purchasable ${sharedOnFacebook}" style="padding-right:14px;padding-left:15px;"><i class="fab fa-facebook-square fa-lg"></i></button>`;
			btnHtml += this.getTwitterBtnHtml(item);
			btnHtml += '</div>';
		}

		return btnHtml;
	},
	updateModdShop: function (tabSelected) {
		var self = this;

		if (taro.isMobile) {
			$('.open-coin-shop-button').hide();
		}

		// populate shop sidebar keys
		var keyList = $('<ul/>', {
			class: 'list-group'
		});

		var isFirstKey = true;
		if (self.shopType === undefined) {
			self.shopType = 'unit';
		}
		if (tabSelected) {
			self.shopType = tabSelected;
		}
		if (self.shopType == 'unitSkins') {
			$('.shop-navbar .nav-link').each(function () {
				$(this).removeClass('active');
			});
			$('#unitSkins').addClass('active');
			var unitKeys = Object.keys(taro.game.data.unitTypes);
			unitKeys = unitKeys.sort();

			// generating li column for unit type selection
			for (var p = 0; p < unitKeys.length; p++) {
				var key = unitKeys[p];
				$('#modd-shop-modal .shop-items').html('');
				if (self.unitSkinCount[key] > 0) {
					// select first key by default
					if (!self.shopKey && isFirstKey) {
						self.shopKey = key;
					}
					keyDiv = $('<li/>', {
						class: `list-group-item list-group-item-action cursor-pointer ${(key == self.shopKey) ? 'active' : ''}`,
						text: `${taro.game.data.unitTypes[key].name} (${self.unitSkinCount[key]})`,
						name: key
					}).on('click', function () {
						self.shopKey = $(this).attr('name');
						$('#modd-shop-modal .shop-items').html('');
						$('.list-group.item').each(function () {
							$(this).removeClass('active');
						});
						$(this).addClass('active');
						self.updateModdShop();
					});
					keyList.append(keyDiv);
					var isFirstKey = false;
				}
			}
			$('.shop-sidebar').html(keyList).show();
		} else if (self.shopType == 'itemSkins') {
			$('.shop-navbar .nav-link').each(function () {
				$(this).removeClass('active');
			});
			$('#itemSkins').addClass('active');
			for (key in taro.game.data.itemTypes) {
				$('#modd-shop-modal .shop-items').html('');
				if (self.itemSkinCount[key] > 0) {
					// by default, choose the first key
					if (!self.shopKey && isFirstKey) {
						self.shopKey = key;
					}
					keyDiv = $('<li/>', {
						class: `list-group-item ${(key == self.shopKey) ? 'active' : ''}`,
						text: `${taro.game.data.itemTypes[key].name} (${self.itemSkinCount[key]})`,
						name: key
					}).on('click', function () {
						self.shopKey = $(this).attr('name');
						$('#modd-shop-modal .shop-items').html('');
						$('.list-group.item').each(function () {
							$(this).removeClass('active');
						});
						$(this).addClass('active');
						self.updateModdShop();
					});
					keyList.append(keyDiv);
					var isFirstKey = false;
				}
			}
			$('.shop-sidebar').html(keyList).show();
		} else if (self.shopType == 'item') // general items right now they're just items, but we need to fix this
		{
			$('.shop-sidebar').hide();
		} else if (self.shopType == 'unit') // non existent :()
		{
			$('.shop-sidebar').hide();
		}

		if (self.shopType == 'unitSkins' || self.shopType == 'itemSkins') // skins
		{
			$.ajax({
				url: `/api/game/${taro.game.data.defaultData.parentGame || taro.client.server.gameId}/shop/`,
				data: {
					type: self.shopType === 'unitSkins' ? 'unit' : 'item',
					key: self.shopKey,
					page: self.shopPage
				},
				dataType: 'html',
				type: 'GET',
				success: function (data) {
					var items = JSON.parse(data).message;
					var groupedItems = {
						purchased: [],
						notPurchased: []
					};

					items.forEach(function (item) {
						if (item.status == 'not_purchased') {
							groupedItems.notPurchased.push(item);
						} else {
							groupedItems.purchased.push(item);
						}
					});

					self.skinItems = groupedItems.purchased.concat(groupedItems.notPurchased);
					self.currentPagination = 1;
					self.paginationForSkins();
				}
			});
		}
	},

	updateSkinList: function (itemId) {
		var skinItemActionButton = $(`#skin-list-${itemId} .action-button-container`);
		skinItemActionButton.html(
			'<button class="btn btn-sm btn-primary disabled">' +
			'Purchased' +
			'</button>'
		);
	},

	checkIfAnyTabSelected: function () {
		var anyTabSelected = false;

		$('.shop-navbar .nav-link').each(function () {
			if ($(this).hasClass('active') && $(this).css('display') != 'none') {
				anyTabSelected = true;
				return false;
			}
		});

		// if no tab is selected
		if (!anyTabSelected) {
			var self = this;
			$('.shop-navbar .nav-link').each(function () {
				// console.log($(this).css('display'));
				if ($(this).css('display') != 'none') {
					self.shopType = $(this)[0].id;
					self.updateModdShop(self.shopType);
					return false;
				}
			});
		}
	},
	isItemRequirementSetisfied: function (req, priceAttr) {
		var ownerPlayer = taro.client.myPlayer;
		var playerTypeAttribute = ownerPlayer._stats.attributes;
		if (playerTypeAttribute[priceAttr]) {
			switch (req.type) {
				case 'atmost':
					if (playerTypeAttribute[priceAttr].value > req.value) {
						return false;
					}
					break;
				case 'exactly':
					if (playerTypeAttribute[priceAttr].value != req.value) {
						return false;
					}
					break;
				case 'atleast':
				default:
					if (playerTypeAttribute[priceAttr].value < req.value) {
						return false;
					}
					break;
			}
			return true;
		}
		return true;
	},
	getItemPopoverHtml: function (item, shopItem) {
		var self = this;
		var html = '';
		var ownerPlayer = taro.client.myPlayer;
		var ownerUnit = taro.$(ownerPlayer._stats.selectedUnitId);
		if (item.description) {
			html += `<p>${taro.clientSanitizer(item.description)}</P>`;
		}
		if (shopItem && typeof shopItem.requirement === 'object') {
			var requirements = '';
			for (var priceAttr in shopItem.requirement.playerAttributes) {
				var req = shopItem.requirement.playerAttributes[priceAttr];
				var requirementsSatisfied = self.isItemRequirementSetisfied(req, priceAttr) && 'text-success' || 'text-danger';
				requirements += `<p class='mb-2 ml-2 no-selection ${requirementsSatisfied}'>`;
				requirements += req.value;
				requirements += ' ';
				requirements += taro.game.data.attributeTypes[priceAttr] &&
					taro.game.data.attributeTypes[priceAttr].name ||
					ownerPlayer._stats.attributes[priceAttr] && ownerPlayer._stats.attributes[priceAttr].name;
				requirements += '</p>';
			}

			var requiredItemTypesKeys = Object.keys(shopItem.requirement.requiredItemTypes || {});
			for (var i = 0; i < requiredItemTypesKeys.length; i++) {
				var itemKey = requiredItemTypesKeys[i];
				var requiredQty = shopItem.requirement.requiredItemTypes[itemKey];
				var item = taro.game.cloneAsset('itemTypes', itemKey);
				var requirementsSatisfied = ownerUnit.inventory.hasRequiredQuantity(itemKey, requiredQty) && 'text-success' || 'text-danger';
				requirements += `<p  class="mb-2 ml-2 no-selection ${requirementsSatisfied}">${taro.checkAndGetNumber(requiredQty || '')} ${taro.clientSanitizer(item.name)}</p>`;
			}
			if (requirements) {
				html += '<div class=\'mb-2\'>';
				html += '<p class=\'font-weight-bold mb-2\'>Requirements:</p>';
				html += requirements;
				html += '</div>';
			}
		}

		if (shopItem && typeof shopItem.price === 'object') {
			var prices = '';
			for (var priceAttr in shopItem.price.playerAttributes) {
				var playerAttrValue = ownerPlayer._stats.attributes[priceAttr] && ownerPlayer._stats.attributes[priceAttr].value || 0;
				var requirementsSatisfied = parseFloat(shopItem.price.playerAttributes[priceAttr]) <= parseFloat(playerAttrValue) && 'text-success' || 'text-danger';
				prices += `<p class='mb-2 ml-2 ${requirementsSatisfied}'>`;
				prices += shopItem.price.playerAttributes[priceAttr];
				prices += ' ';
				prices += taro.game.data.attributeTypes[priceAttr] &&
					taro.game.data.attributeTypes[priceAttr].name ||
					ownerPlayer._stats.attributes[priceAttr] && ownerPlayer._stats.attributes[priceAttr].name;
				prices += '</p>';
			}
			html += '<div>';

			var requiredItemTypesKeys = Object.keys(shopItem.price.requiredItemTypes || {});
			for (var i = 0; i < requiredItemTypesKeys.length; i++) {
				var itemKey = requiredItemTypesKeys[i];
				var requiredQty = shopItem.price.requiredItemTypes[itemKey];
				var item = taro.game.cloneAsset('itemTypes', itemKey);
				var requirementsSatisfied = ownerUnit?.inventory?.hasRequiredQuantity(itemKey, requiredQty) && 'text-success' || 'text-danger';
				prices += `<p  class="mb-2 ml-2 no-selection ${requirementsSatisfied}">${requiredQty || ''} ${item.name}</p>`;
			}

			if (shopItem.price.coins) {
				prices += `<p><span><img src="${assetsProvider}/assets/images/coin.svg" style="height:20px"/></span>${shopItem.price.coins}</p>`;
			}
			html += '<p class=\'font-weight-bold mb-2\'>Price:</p>';
			if (prices) {
				html += prices;
			} else {
				html += '<p class="mb-2 ml-2">free</p>';
			}
			html += '</div>';
		}
		return html;
	},
	getSortedShopItems: function ({ data, key }) {
		if (!data || !key || !data[key]) return [];
		var resultKeys = Object.keys(data[key]);

		resultKeys = resultKeys.sort();

		resultKeys = resultKeys.sort(function (a, b) {
			const aOrder = data[key][a].order;
			const bOrder = data[key][b].order;
			if (aOrder === undefined && bOrder === undefined) return 0;
			if (aOrder === undefined) return 1;
			if (bOrder === undefined) return -1;
			return aOrder - bOrder;
		});

		return resultKeys;
	},
	openItemShop: function (type, selectedTab) {
		var self = this;
		if (!taro.game.data.shops) return;
		self.currentType = type || self.currentType;
		if (!self.currentType) return;
		
		var shopItems = {};

		var shopItemsKeys = self.getSortedShopItems({data: taro.game?.data?.shops[self.currentType], key: 'itemTypes' });
		var shopUnitsKeys = self.getSortedShopItems({data: taro.game?.data?.shops[self.currentType], key: 'unitTypes' });
		
		var shopItems = taro.game.data.shops[self.currentType] ? rfdc()(taro.game.data.shops[self.currentType].itemTypes) : [];
		var shopUnits = taro.game.data.shops[self.currentType] ? taro.game.data.shops[self.currentType].unitTypes : [];
		var isDismissible = taro.game.data.shops[self.currentType] && taro.game.data.shops[self.currentType].dismissible != undefined ? taro.game.data.shops[self.currentType].dismissible : true;
		var shopItemsKeysUsingCoins = [];
		for (var key in shopItems) {
			if (typeof shopItems[key].price == 'object' && shopItems[key].price.coins != undefined && shopItems[key].price.coins > 0) {
				shopItemsKeysUsingCoins.push(key);
			}
		}
		// shopItemsKeysUsingCoins.forEach((key) => {
		// 	delete shopItems[key];
		// });

		// display items tab iff there's item to be sold
		if (shopItemsKeys.length > 0) {
			$('[id=item]').show();
			if (!selectedTab) // if default selectedTab wasn't assigned, assign it as items
			{
				selectedTab = 'items';
			}
		} else {
			$('[id=item]').hide();
		}

		// display units tab iff there's item to be sold
		if (shopUnitsKeys.length > 0) {
			$('[id=unit]').show();
			if (!selectedTab) // if default selectedTab wasn't assigned, assign it as items
			{
				selectedTab = 'units';
			}
		} else {
			$('[id=unit]').hide();
		}

		if (shopItemsKeys.length === 0 || shopUnitsKeys.length === 0) {
			$('.item-shop-navbar').hide();
		}

		var modalBody = $('<div/>', {
			class: 'row text-center'
		});

		var ownerPlayer = taro.client.myPlayer;
		if (!ownerPlayer) return;

		var isAdBlockEnabled = ownerPlayer._stats.isAdBlockEnabled;
		var ownerUnit = taro.$(ownerPlayer._stats.selectedUnitId);

		var playerTypeAttribute = ownerPlayer._stats.attributes;
		var imgArray = [];
		if (selectedTab === 'items') {
			$('.item-shop-navbar .nav-link').each(function () {
				$(this).removeClass('active');
			});
			$('[id=item]').addClass('active');
			for (var i = 0; i < shopItemsKeys.length; i++) {
				var item = taro.game.cloneAsset('itemTypes', shopItemsKeys[i]);
				var shopItem = shopItems[shopItemsKeys[i]];

				if (item && shopItem && shopItem.isPurchasable) {
					// set flag for player type so it can be purchased by only that player
					var isPurchasableByCurrentPlayerType = true;
					if (item.canBePurchasedBy && item.canBePurchasedBy.length > 0 && ownerPlayer._stats && ownerPlayer._stats.playerTypeId) {
						isPurchasableByCurrentPlayerType = item.canBePurchasedBy.includes(ownerPlayer._stats.playerTypeId);
					}

					var isItemAffordable = true;
					var requirementsSatisfied = true;
					if (typeof shopItem.requirement === 'object') {
						for (var priceAttr in shopItem.requirement.playerAttributes) {
							if (playerTypeAttribute && playerTypeAttribute[priceAttr]) {
								var req = shopItem.requirement.playerAttributes[priceAttr];
								var requirementsSatisfied = self.isItemRequirementSetisfied(req, priceAttr);
								if (!requirementsSatisfied) {
									break;
								}
							}
						}
						// checking items to be removed present in selected unit inventory
						if (requirementsSatisfied) {
							var requiredItemTypesKeys = Object.keys(shopItem.requirement.requiredItemTypes || {});
							for (var j = 0; j < requiredItemTypesKeys.length; j++) {
								var itemKey = requiredItemTypesKeys[j];
								var requiredQuantity = shopItem.requirement.requiredItemTypes[itemKey];
								requirementsSatisfied = ownerUnit.inventory.hasRequiredQuantity(itemKey, requiredQuantity);
								if (!requiredItemTypesKeys) {
									break;
								}
							}
						}
					}
					if (typeof shopItem.price === 'object') {
						if (shopItem.price.coins && ownerPlayer._stats.coins < shopItem.price.coins) {
							isItemAffordable = false;
						}

						for (var priceAttr in shopItem.price.playerAttributes) {
							if (playerTypeAttribute && playerTypeAttribute[priceAttr] && parseFloat(playerTypeAttribute[priceAttr].value) < parseFloat(shopItem.price.playerAttributes[priceAttr])) {
								isItemAffordable = false;
								break;
							}
						}

						// checking items to be removed present in selected unit inventory
						if (isItemAffordable) {
							var requiredItemTypesKeys = Object.keys(shopItem.price.requiredItemTypes || {});
							for (var j = 0; j < requiredItemTypesKeys.length; j++) {
								var itemKey = requiredItemTypesKeys[j];
								var requiredQuantity = shopItem.price.requiredItemTypes[itemKey];
								isItemAffordable = ownerUnit?.inventory?.hasRequiredQuantity(itemKey, requiredQuantity);
								if (!isItemAffordable) {
									break;
								}
							}
						}
					}

					var itemDetail = $('<div/>', {
						style: 'font-size: 16px; width: 250px;',
						html: self.getItemPopoverHtml(item, shopItem)
					});
					var bgColor = requirementsSatisfied && isItemAffordable ? 'bg-light-green' : 'bg-light-red';
					var itemImage = $('<div/>', {
						id: shopItemsKeys[i],
						isadblockenabled: isAdBlockEnabled,
						class: 'col-sm-2-5 rounded align-bottom btn-purchase-item item-shop-button',
						style: 'position: relative;',
						name: item.name,
						requirementsSatisfied: !!requirementsSatisfied,
						isItemAffordable: !!isItemAffordable,
						isCoinTxRequired: !!shopItem.price.coins,
						itemPrice: shopItem.price.coins || 0,
					});

					if (
						((!isItemAffordable || !isPurchasableByCurrentPlayerType) && shopItem.hideIfUnaffordable) ||
						(!requirementsSatisfied && shopItem.hideIfRequirementNotMet)
					) {
						// if unaffordable and hideIfUnaffordable then dont show item in shop
					} else {
						var img = $('<div/>').html(`img_index_${imgArray.length}`);
						imgArray.push({
							wrapper: img,
							value: `<img src='${item.inventoryImage || item.cellSheet.url}' style='width: auto; height: auto; max-width: 55px; max-height: 55px'>`
						});

						if (shopItem.price.coins) {
							var itemImageElement = $('<img/>', {
								src: `${assetsProvider}/assets/images/coin.svg`,
								style: 'width: 20px; height: 20px; position: absolute; top: 10px; right: 15px;'
							});
							itemImage.append(itemImageElement);
						}

						var itemName = '<div class=\'mx-2 mt-2 mb-0 no-selection\' style=\'line-height:0.7  !important; overflow-wrap: break-word;\'><small>';
						itemName += taro.clientSanitizer(item.name);
						itemName += '</small></div>';

						var combine = $('<div/>', {
							class: `mx-2 p-3 mb-3 rounded item-shop-button-div d-flex flex-column justify-content-end align-items-center ${bgColor}`,
							style: 'min-height:110px;max-height:110px;position:relative;',
							'data-toggle': 'popover',
							'data-placement': 'top',
							'data-content': itemDetail.prop('outerHTML')
						}).append(img).append(itemName);

						combine.popover({
							html: true,
							trigger: 'hover'
						});

						modalBody.append(
							itemImage.append(combine)
						);
					}
				}
			}
		} else if (selectedTab === 'units') {
			$('.item-shop-navbar .nav-link').each(function () {
				$(this).removeClass('active');
			});
			$('[id=unit]').addClass('active');
			for (var i = 0; i < shopUnitsKeys.length; i++) {
				var unit = taro.game.cloneAsset('unitTypes', shopUnitsKeys[i]);
				var shopUnit = shopUnits[shopUnitsKeys[i]];

				if (shopUnit && shopUnit.isPurchasable) {
					var isPurchasableByCurrentPlayerType = true;
					if (unit.canBePurchasedBy && unit.canBePurchasedBy.length > 0 && ownerPlayer._stats && ownerPlayer._stats.playerTypeId) {
						isPurchasableByCurrentPlayerType = unit.canBePurchasedBy.includes(ownerPlayer._stats.playerTypeId);
					}
					var isUnitAffordable = true;
					var requirementsSatisfied = true;
					if (typeof shopUnit.requirement === 'object') {
						for (var priceAttr in shopUnit.requirement.playerAttributes) {
							if (playerTypeAttribute && playerTypeAttribute[priceAttr]) {
								var req = shopUnit.requirement.playerAttributes[priceAttr];
								var requirementsSatisfied = self.isItemRequirementSetisfied(req, priceAttr);
								if (!requirementsSatisfied) {
									break;
								}
							}
						}
					}

					if (requirementsSatisfied) {
						if (typeof shopUnit.price === 'object') {
							for (var priceAttr in shopUnit.price.playerAttributes) {
								if (playerTypeAttribute && playerTypeAttribute[priceAttr] && playerTypeAttribute[priceAttr].value < shopUnit.price.playerAttributes[priceAttr]) {
									isUnitAffordable = false;
									break;
								}
							}
						}
					}

					const sanitizedUnitName = taro.clientSanitizer(unit.name);
					var button = $('<button/>', {
						type: 'button',
						class: `btn ${(requirementsSatisfied && isUnitAffordable && isPurchasableByCurrentPlayerType) ? 'btn-success btn-purchase-unit' : 'btn-danger'}`,
						style: '',
						id: shopUnitsKeys[i],
						name: sanitizedUnitName
					});

					var btnLabel = self.shopBtnLabel(shopUnit, playerTypeAttribute);
					button.append(btnLabel);

					if ((shopUnit.hideIfUnaffordable && !isUnitAffordable) || (shopUnit.hideIfRequirementNotMet && !requirementsSatisfied)) {

					} else {
						modalBody.append($('<div/>', {
							class: 'col-sm-3 align-bottom',
							style: 'margin-bottom: 30px;'
						}).append($('<img/>', {
							src: unit.inventoryImage || unit.cellSheet.url,
							style: 'width: auto; height: auto; max-width: 64px; max-height: 64px'
						})
						)
							.append(`<div class='row text-center'><div class='col no-selection'>${sanitizedUnitName}</div></div>`)
							.append(button)
						);
					}
				}
			}
		}

		if (modalBody.html() == '') {
			modalBody.append('<div class=\'col text-center\'>There\'s nothing to be displayed here</div>');
		}
		var modalUpdated = false;
		if (self.oldModalHTMLBody != modalBody.html()) {
			modalUpdated = true;
			self.oldModalHTMLBody = rfdc()(modalBody.html());
			$('#modd-item-shop-modal .items-shop').html(modalBody);
			imgArray.forEach(function (data) {
				data.wrapper.html(data.value);
			});
		}

		// console.log({
		// 	backdrop: isDismissible ? true : 'static',
		// 	keyboard: isDismissible,
		// 	show: false
		// })
		$('#modd-item-shop-modal').modal({
			backdrop: isDismissible ? true : 'static',
			keyboard: isDismissible,
			show: false
		});
		taro.client.myPlayer.control.updatePlayerInputStatus();
		// reload shop ad as per adinplay request.
		// aiptag.cmd.display.push(function () { aipDisplayTag.display('modd-io_728x90_shop'); });

		if (isDismissible) {
			$('#modd-item-shop-dismiss-button').show();
		} else {
			$('#modd-item-shop-dismiss-button').hide();
		}
	},

	shopBtnLabel: function (type, playerTypeAttribute) {
		var firstLoop = true;
		var btnLabel = '';
		var priceKey = [];
		var coins = 0;
		var itemsRequired = [];
		var attributeTypes = taro.game.data.attributeTypes;

		if (typeof type.price === 'object') {
			coins = type.price.coins;
			priceKey = Object.keys(type.price.playerAttributes || {});
			itemsRequired = type.price.requiredItemTypes;
		}

		if (!priceKey || priceKey.length === 0) {
			btnLabel = 'free';
		}
		priceKey.forEach(function (key) {
			var price = type.price.playerAttributes[key];

			var selectedAttribute = {};

			selectedAttribute = taro.game.data.attributeTypes[key] || playerTypeAttribute[key];

			if (typeof selectedAttribute === 'object') {
				if (Object.keys(selectedAttribute || []).length === 0) {
					selectedAttribute = attributeTypes[key];
				}
				var label = Object.keys(selectedAttribute || []).length ? selectedAttribute.name : null;
			}

			if (!firstLoop && label) {
				btnLabel += '<br/>';
			}
			if (firstLoop && label === null) {
				btnLabel = 'free';
			} else {
				btnLabel += `${label} ${price}`;
			}
			firstLoop = false;
		});

		var requiredItemTypesKeys = Object.keys(itemsRequired || {});
		for (var i = 0; i < requiredItemTypesKeys.length; i++) {
			var itemKey = requiredItemTypesKeys[i];
			var requiredQty = itemsRequired[itemKey];
			var item = taro.game.cloneAsset('itemTypes', itemKey);
			if (btnLabel == 'free') {
				btnLabel = '';
			}
			if (btnLabel) {
				btnLabel += '<br/>';
			}
			btnLabel += item.name;
			if (requiredQty) {
				btnLabel += ` - ${requiredQty}`;
			}
		}

		if (coins) {
			if (btnLabel == 'free') {
				btnLabel = '';
			}
			if (btnLabel) {
				btnLabel += '<br/>';
			}
			btnLabel += `<span><img src="${assetsProvider}/assets/images/coin.svg" style="height:20px"/></span>${coins}`;
		}

		return btnLabel;
	},

	openCoinShop: function () {
		if (taro.isClient) {
			$('#coin-shop-modal').modal({
				show: true,
				keybfoard: true
			});
		}
	},

	// for in-game shop keeper shop
	enableShop: function () {
		$('#shop-modal').modal({
			show: false,
			keyboard: true
		}).on('hidden.bs.modal', function () {
			shoppingModalManuallyHidden = true;
			$('#footer').hide();
		});
	},
	renderSkinsButtons: function (items) {
		var self = this;

		var modalBody = $('<div/>', {
			class: 'row text-center'
		});
		for (let i = 0; i < items.length; i++) {
			var item = items[i];
			// console.log(item)

			if (item.status == 'not_purchased') {
				if (item.soldForSocialShare) {
					var button = self.buttonForSocialShare(item);
				} else {
					var button = $('<button/>', {
						type: 'button',
						class: 'btn btn-outline-secondary align-middle btn-purchase-purchasable',
						id: item._id,
						'data-purchasable': item.title || item.name,
						'data-price': item.price
					}).append(
						$('<div/>', {
							class: 'd-flex align-items-center'
						}).append(
							$('<img/>', {
								src: `${assetsProvider}/assets/images/coin.svg`,
								class: 'mr-1',
								style: 'height: 20px'
							})
						).append(item.price)
					);
				}
			} else if (item.status == 'purchased') {
				var button = $('<button/>', {
					type: 'button',
					class: 'btn btn-outline-success align-middle btn-equip',
					id: item._id,
					name: item.title || item.name
				}).append('Equip');
			} else if (item.status == 'equipped') {
				var button = $('<button/>', {
					type: 'button',
					class: 'btn btn-success align-middle btn-unequip',
					id: item._id,
					name: item.name || item.title
				}).append('Equiped');
			} else if (item.status == undefined) {
				if (item.soldForSocialShare) {
					var button = self.buttonForSocialShare(item, true);
				} else {
					var button = $('<button/>', {
						type: 'button',
						class: 'btn btn-danger align-middle btn-purchase-purchasable',
						id: item._id,
						'data-purchasable': item.name || item.title,
						'data-price': item.price,
						'data-unauthenticated': 'true'
					}).append(
						$('<div/>', {
							class: 'd-flex align-items-center'
						}).append(
							$('<img/>', {
								src: `${assetsProvider}/assets/images/coin.svg`,
								class: 'mr-1',
								style: 'height: 20px'
							})
						).append(item.price)
					);
				}
			}

			let clipping = `background:url('${item.image}')`;
			// let originalImage = {};
			let itemDetails = null;

			modalBody.append(
				$('<div/>', {
					class: 'col-sm-3 py-3 d-flex flex-column justify-content-end align-items-center'
				})
					.append($('<div/>')
						.append($('<div/>', {
							id: `${item._id}_image`,
							style: clipping,
							class: 'is-mobile'
						})))
					.append('<br/>')
					.append(button)
			);

			if (item.target && item.target.entityType == 'unit') {
				itemDetails = taro.game.cloneAsset('unitTypes', item.target.key);
			}

			this.renderShopImage(itemDetails, item, 'image');
		}

		$('#modd-shop-modal .shop-items').html(modalBody);
	},
	renderShopImage: function (itemDetails, item, selector) {
		if (itemDetails && itemDetails.cellSheet) {
			if (itemDetails.cellSheet.columnCount <= 0) {
				itemDetails.cellSheet.columnCount = 1;
			}
			if (itemDetails.cellSheet.rowCount <= 0) {
				itemDetails.cellSheet.rowCount = 1;
			}

			let image = new Image();
			let itemId = item._id;
			image.src = item.image;
			image.onload = function () {
				let img = document.getElementById(`${itemId}_${selector}`);
				let originalHeight = `${image.height / itemDetails.cellSheet.rowCount}px`;
				let originalWidth = `${image.width / itemDetails.cellSheet.columnCount}px`;
				// clipping = "height:" + originalHeight + "px;width:" + originalWidth + "px;background:url('" + item.image + "') 0px 0px no-repeat;";
				
				img.style = `height:${originalHeight};width:${originalWidth};background:url('${image.src}');src:'';`;
				// img.style.height = originalHeight;
				// img.style.width = originalWidth;
				// img.style.background = `url('${image.src}')`;
				// img.src = '';
			
				if (itemDetails.cellSheet.rowCount <= 1 && itemDetails.cellSheet.columnCount <= 1) {
					img.style.backgroundRepeat = 'no-repeat';
					img.style.backgroundPosition = 'center center';
					img.style.backgroundSize = 'contain';
					img.style.maxHeight = '64px';
					img.style.maxWidth = '64px';
				}
			};
		}
	},
	paginationForSkins: function () {
		var self = this;

		var totalPages = Math.ceil(self.skinItems.length / self.perPageItems);
		var maxPageNumber = Math.min(11, totalPages);
		if (taro.isMobile) {
			maxPageNumber = Math.min(3, totalPages);
		}
		var currentPage = self.currentPagination - 1;
		var skip = currentPage * self.perPageItems;
		var items = _.slice(self.skinItems, skip, skip + self.perPageItems);
		self.renderSkinsButtons(items);

		var html = '<nav aria-label="Page navigation">';
		html += '<ul class="pagination m-0">';
		html += '<li class="page-item skin-pagination" data-text="previous"><span class="page-link">Previous</span></li>';
		for (var i = Math.max(1, currentPage); i < Math.min(totalPages + 1, currentPage + maxPageNumber + 1); i++) {
			html += `<li class="page-item  skin-pagination ${self.currentPagination == i ? 'active' : ''}" data-text="${i}"><span class="page-link">${i}</span></li>`;
		}
		html += '<li class="page-item  skin-pagination" data-text="next"><span class="page-link">Next</span></li>';
		html += '</ul>';
		html += '</nav>';

		$('#mod-shop-pagination').html(html);
	},

	toggleShop: function () {
		if ($('#modd-shop-modal').is(':visible')) {
			$('#modd-shop-modal').modal('hide');
		} else {
			this.openModdShop();
		}
	},

	closeShop: function (clientId) {
		if (taro.isClient) {
			// console.log("hide!")
			$('#shop-modal').modal('hide');
			taro.client.myPlayer.control.updatePlayerInputStatus();
		} else if (taro.isServer) {
			taro.network.send('ui', { command: 'closeShop' }, clientId);
		}
	},

	purchase: function (id, token = null) {
		taro.network.send('buyItem', { id, token }); // using attr name instead of skinName, otherwise, it'll send the last itemName in constants.itemTypes only
	},
	purchaseUnit: function (id) {
		taro.network.send('buyUnit', id);
	},

	verifyUserPinForPurchase: function (id) {
		const serverId = taro.client.server.id;

		if (typeof window.validateUserPin === 'function') {
			window.validateUserPin('taro.shop.purchase', id, serverId);
		} else {
			taro.network.send('buyItem', { id });
		}
	},

	enableStockCycle: function () {
		var self = this;
		var stockClock = setInterval(function () {
			self.removeOldestItem();
			while (self.inventory.length < self.maxInventorySize) {
				self.addItem(taro.item.getRandomItemData({ isPurchasable: true })); // only get items that have isPurchasable set as true
			}
		}, (process.env.ENV == 'dev') ? 3000 : 30000);
	},

	addItem: function (data) {
		var self = this;

		self.inventory.push(data);

		if (taro.isServer) {
			if (data) {
				data.id = taro.newIdHex();
				taro.network.send('addShopItem', data);
			}
		} else if (taro.isClient) {
			var self = this;
			var modalBody = $('#shop-modal .modal-body');
			$('.popover').remove();

			// console.log("adding item", data)
			var itemDiv = taro.itemUi.getItemSlotDiv(data, {
				popover: 'bottom',
				isDraggable: false,
				isPurchasable: true
			});
			modalBody.append(itemDiv);
		}
	},

	removeOldestItem: function () {
		var self = this;
		var item = self.inventory.shift(); // remove the oldest item

		if (item) {
			self.removeItem(item.id);
		}
	},

	removeItem: function (id) {
		if (taro.isServer) {
			delete this.inventory[id];
			taro.network.send('removeShopItem', { id: id });
		} else if (taro.isClient) {
			$(`.inventory-slot[id='${id}']`).remove();
		}
	},

	getItems: function () {
		return this.inventory;
	},

	updateShopInventory: function (items, clientId) {
		var self = this;
		if (taro.isServer) {
			if (items.length > 0) {
				taro.network.send('updateShopInventory', items, clientId);
			}
		} else if (taro.isClient) {
			for (i in items) {
				self.addItem(items[i]);
			}
		}
	},

	closeModals: function () {
		$('#modd-shop-modal').modal('hide');
		$('#modd-item-shop-modal').modal('hide');
		$('#confirm-purchase-modal').modal('hide');
	},

	getItemById: function (itemTypeId) {
		var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
		if (itemData) {
			itemData.itemTypeId = itemTypeId;
			return itemData;
		}
	},
	getUnitById: function (unitId) {
		var unitData = taro.game.cloneAsset('unitTypes', unitId);
		if (unitData) {
			unitData.unitTypeId = unitId;
			return unitData;
		}
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = ShopComponent;
}
