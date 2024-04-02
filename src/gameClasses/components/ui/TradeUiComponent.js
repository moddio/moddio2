var TradeUiComponent = TaroEntity.extend({
	classId: 'TradeUiComponent',
	componentId: 'tradeUi',

	init: function (entity, options) {
		var self = this;

		$('#accept-trade-request-button').on('click', function () {
			var requestedBy = $('#requested-by').text();
			var acceptedBy = taro.client.myPlayer.id();

			taro.network.send('trade', { type: 'start', requestedBy: requestedBy, acceptedBy: acceptedBy });
			$('#trade-request-div').hide();
			taro.tradeUi.startTrading(taro.client.myPlayer, taro.$(requestedBy));
		});

		$('#accept-trade-button').on('click', function () {
			$('#accept-trade-button').addClass('disabled-trade-button');
			$('#you-accept').addClass('active');

			var selectedUnit = taro.client.myPlayer.getSelectedUnit();
			var totalInventorySlot = selectedUnit?.inventory?.getTotalInventorySize();

			if (totalInventorySlot) {
				for (let i = totalInventorySlot; i <= totalInventorySlot + 5; i++) {
					if (selectedUnit._stats.itemIds[i]) {
						$(`#item-${i}`).addClass('trade-item-success');
					}
				}
			}

			taro.network.send('trade', {
				type: 'accept',
				acceptedBy: taro.client.myPlayer.id(),
				acceptedFor: taro.client.myPlayer.tradingWith,
			});
		});

		$('.cancel-trade-request-button').on('click', function () {
			taro.tradeUi.closeTradeRequest();
		});

		$('.cancel-trade-button').on('click', function () {
			taro.tradeUi.closeTrading();
		});
	},

	initiateTradeRequest: function (player) {
		var message = `${player._stats.name} wants to trade with you. Trade?`;
		$('#requested-by').text(player.id());
		$('#trade-request-message').text(message);
		$('#trade-request-div').show();
	},
	clearOfferSlots: function () {
		var offerSlots = $('#offer-trading-slots');
		offerSlots.html('');
		var i = 1;
		while (i < 6) {
			offerSlots.append(
				$('<div/>', {
					id: `offer-${i}`,
					class: 'btn btn-light trade-offer-slot trade-slot',
				})
			);
			i++;
		}

		$('#accept-trade-button').removeClass('disabled-trade-button');
		$('#you-accept').removeClass('active');
		$('#trader-accept').removeClass('active');
		$('#accept-trade-text').text('Accept');
		var selectedUnit = taro.client.myPlayer.getSelectedUnit();
		var totalInventorySlot = selectedUnit?.inventory?.getTotalInventorySize();

		if (totalInventorySlot) {
			for (let i = 0; i <= 5; i++) {
				const idx = totalInventorySlot + i;
				$(`#item-${idx}`).removeClass('trade-item-success trade-item-added');
				$(`#offer-${i + 1}`).removeClass('trade-item-success trade-item-added');
			}
		}
	},

	startTrading: function (playerA, playerB) {
		if (playerA !== taro.client.myPlayer) {
			$('#trader-name').text(playerA._stats.name);
		} else if (playerB !== taro.client.myPlayer) {
			$('#trader-name').text(playerB._stats.name);
		}
		playerA.tradingWith = playerB.id();
		playerB.tradingWith = playerA.id();
		playerA.isTrading = true;
		playerB.isTrading = true;

		this.clearOfferSlots();
		$('#trade-div').show();
	},
	sendOfferingItems: function () {
		var selectedUnit = taro.client.myPlayer.getSelectedUnit();
		var totalInventorySlot = selectedUnit.inventory.getTotalInventorySize();
		var tradeItems = [];
		var id = 0;
		for (var i = totalInventorySlot; i < totalInventorySlot + 5; i++) {
			$(`#item-${i}`).removeClass('trade-item-success');
			$(`#offer-${id + 1}`).removeClass('trade-item-success');
			tradeItems[id] = selectedUnit._stats.itemIds[i];

			id++;
		}
		taro.network.send('trade', {
			type: 'offer',
			from: taro.client.myPlayer.id(),
			to: taro.client.myPlayer.tradingWith,
			tradeItems: tradeItems,
		});
	},
	receiveOfferingItems: function (tradeItems) {
		var selectedUnit = taro.client.myPlayer.getSelectedUnit();
		var totalInventorySlot = selectedUnit?.inventory?.getTotalInventorySize();

		for (var i = 0; i < tradeItems.length; i++) {
			var index = i + 1;
			var itemId = tradeItems[i];
			var item = taro.$(itemId);
			const offerDiv = $(`#offer-${index}`);
			offerDiv.html('');
			if (itemId && item && item._category === 'item') {
				var itemDiv = taro.itemUi.getItemDiv(item, {
					isDraggable: false,
					popover: 'top',
					isTrading: true,
				});
				offerDiv.html(itemDiv);
				offerDiv.addClass('trade-item-added');
			} else {
				offerDiv.removeClass('trade-item-added');
			}

			offerDiv.removeClass('trade-item-success');
			$(`#item-${totalInventorySlot + i}`).removeClass('trade-item-success');
		}

		$('#you-accept').removeClass('active');
		$('#trader-accept').removeClass('active');
		$('#accept-trade-button').removeClass('disabled-trade-button');
		$('#accept-trade-text').text('Accept');
	},
	closeTradeRequest: function () {
		$('#trade-request-div').hide();
	},

	closeTrading: function () {
		var playerA = taro.client.myPlayer;
		var playerB = taro.$(taro.client.myPlayer.tradingWith);
		taro.network.send('trade', { type: 'cancel', cancleBy: playerA.id(), cancleTo: playerB?.id() });
		delete playerA.tradingWith;
		delete playerB?.tradingWith;
		delete playerA.isTrading;
		delete playerB?.isTrading;
		$('#trade-div').hide();
	},

	tradeOptionClicked: function ({ clientId, unitId }) {
		taro.network.send('playerClickTradeOption', {
			tradeWithClientId: clientId,
			tradeWithUnitId: unitId,
		});
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TradeUiComponent;
}
