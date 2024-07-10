var PlayerUiComponent = TaroEntity.extend({
	classId: 'PlayerUiComponent',
	componentId: 'playerUi',

	init: function (entity, options) {
		var self = this;
		self._entity = entity;

		self.setupListeners();
		self.pressedButton = false;

		self.lastInputValue = '';
		self.dialogue = {
			message: null,
			messagePrinter: null,
		};

		self.playerAttributeDivElement = null;

		$('#custom-ingame-ui-container').hide();
		window.renderHBSTemplate &&
			window.renderHBSTemplate({}, taro.game.data?.ui?.inGameUiFull?.htmlData, 'custom-ingame-ui-container');
	},

	setupListeners: function () {
		// listeners for player input modal
		var self = this;

		$('#player-input-modal').on('hidden.bs.modal', function () {
			if (self.pressedButton) {
				taro.network.send('playerCustomInput', { status: 'submitted', inputText: self.lastInputValue });
				self.lastInputValue = '';
			} else {
				taro.network.send('playerCustomInput', { status: 'dismissed' });
			}

			$('#player-input-modal').removeClass('d-flex');
			taro.client.myPlayer.control.updatePlayerInputStatus();
		});

		$('#custom-modal').on('hidden.bs.modal', function () {
			$('#custom-modal').removeClass('d-flex');
			taro.client.myPlayer.control.updatePlayerInputStatus();
		});

		$('#custom-modal').on('shown.bs.modal', function () {
			$('#custom-modal-cancel').focus();
			taro.client.myPlayer.control.updatePlayerInputStatus();
		});

		$('#player-input-modal').on('shown.bs.modal', function () {
			if (self.isDismissibleInputModalShown) {
				$('#player-input-cancel').focus();
			} else {
				$('#player-input-field').focus();
			}
			taro.client.myPlayer.control.updatePlayerInputStatus();
		});

		const submitInputModal = () => {
			self.lastInputValue = $('#player-input-field').val();
			self.pressedButton = true;
			$('#player-input-modal').modal('hide');
		};

		$('#player-input-field').on('keydown', function (e) {
			if (e.key === 'Enter') {
				e.stopPropagation();
				e.preventDefault();
				submitInputModal();
			}
		});

		$('button#player-input-submit').on('click', () => {
			submitInputModal();
		});

		$('button#player-input-cancel').on('click', function () {
			self.pressedButton = false;
			taro.network.send('playerCustomInput', { status: 'cancelled' });
			$('#player-input-modal').modal('hide');
		});

		// replaced using pointer down
		// $(document).on('click', '.trigger', function () {
		// 	taro.network.send('htmlUiClick', { id: $(this).attr('id') });
		// 	//support for local htmlUiClick trigger
		// 	taro.client.myPlayer.lastHtmlUiClickData = { id: $(this).attr('id') };
		// 	taro.script.trigger('htmlUiClick', { playerId: taro.client.myPlayer.id() });
		// });

		$(document).on('pointerdown', '.trigger', function () {
			taro.network.send('htmlUiClick', { id: $(this).attr('id') });
			// Support for local htmlUiClick trigger
			taro.client.myPlayer.lastHtmlUiClickData = { id: $(this).attr('id') };
			taro.script.trigger('htmlUiClick', { playerId: taro.client.myPlayer.id() });
		});
	},

	updatePlayerAttributesDiv: function (attributes) {
		var self = this;

		self.playerAttributeDivElement = taro.client.getCachedElementById('players-attribute-div');
		// self.playerAttributeDivElement = $('#players-attribute-div');

		if (self.playerAttributeDivElement) {
			self.playerAttributeDivElement.innerHTML = '';
		}

		var attributeTypes = taro.game.data.attributeTypes;

		const myScoreDiv = taro.client.getCachedElementById('my-score-div');
		if (myScoreDiv) {
			// no attributes to show
			if (Object.keys(attributes).length === 0) {
				if (!myScoreDiv.classList.contains('no-padding')) {
					// display none for my-score-div
					myScoreDiv.classList.add('no-padding');
				}
			} else if (myScoreDiv.classList.contains('no-padding')) {
				myScoreDiv.classList.remove('no-padding');
			}
		}

		if (attributeTypes == undefined) {
			return;
		}

		for (var attrKey in attributes) {
			var attr = attributes[attrKey];

			if (attr) {
				if (!this.shouldRenderAttribute(attr)) continue;

				var attributeType = attributeTypes[attrKey];

				$(self.playerAttributeDivElement)
					.append(
						$('<span/>', {
							text: attributeType ? `${attributeType.name}: ` : attr.name,
							id: `pt-attribute-${attrKey}`,
						})
					)
					.append(
						$('<span/>', {
							id: `pt-attribute-value-${attrKey}`,
						})
					)
					.append($('<br/>'));
			}
		}

		self.updatePlayerAttributeValues(attributes, true);

		// update shop as player points are changed and when shop modal is open
		if (taro.shop.isItemShopOpen) {
			taro.shop.openItemShop();
		}
	},

	updatePlayerAttributeValues: function (attributes, isUpdatedDiv = false) {
		let needUpdateDiv = false;
		for (var attrKey in attributes) {
			var attr = attributes[attrKey];

			if (attr) {
				if (!this.shouldRenderAttribute(attr)) {
					// remove the attribute from the div
					if (!isUpdatedDiv) needUpdateDiv = true;
					continue;
				}

				// if attr value is int, then do not show decimal points. otherwise, show up to 2 decimal points
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

				// var value = attr.value && attr.value.toLocaleString('en-US') || 0; // commented out because toLocaleString is costly
				var value = attr.value || 0;

				var selector = taro.client.getCachedElementById(`pt-attribute-value-${attrKey}`);
				$(selector).text(attr.value);
			}
		}
		if (needUpdateDiv) {
			this.updatePlayerAttributesDiv(attributes);
		} else if (taro.shop.isItemShopOpen) {
			taro.shop.openItemShop();
		}
	},

	shouldRenderAttribute: function (attribute) {
		if (attribute.isVisible === undefined || attribute.isVisible === false) {
			return false;
		}

		let shouldRender = true;

		if (shouldRender) {
			var showOnlyWhenIsGreaterThanMin = attribute.showWhen == 'whenIsGreaterThanMin';
			shouldRender = showOnlyWhenIsGreaterThanMin ? attribute.value > attribute.min : true;
		}
		if (shouldRender) {
			var showOnlyWhenIsLessThanMax = attribute.showWhen == 'whenIsLessThanMax';
			shouldRender = showOnlyWhenIsLessThanMax ? attribute.value < attribute.max : true;
		}

		return shouldRender;
	},

	updatePlayerCoin: function (newValue) {
		var coin = parseFloat($('.player-coins').html());
		if (coin != NaN) {
			$('.player-coins').html(parseFloat(newValue));
		}

		if (typeof updateCoins === 'function') {
			updateCoins(newValue);
		}

		if ($('#modd-item-shop-modal').hasClass('show') && $('[id=item]').hasClass('active')) {
			// update the shop based on the new coin value
			taro.shop.openItemShop(taro.shop.currentType, 'items');
		}
	},

	showFriendsModal: function (config) {
		window.reactApp?.openShareModal?.();
	},

	// open a modal to ask for input
	showInputModal: function (config) {
		var self = this;
		config.isDismissible = config.isDismissible === undefined ? true : !!config.isDismissible;
		self.isDismissibleInputModalShown = config.isDismissible;
		$('#player-input-field-label').html(window.DOMPurify?.sanitize(config.fieldLabel || 'Field'));

		$('#player-input-field').val('');
		$('#player-input-modal').addClass('d-flex');
		$('#player-input-modal').modal({
			backdrop: config.isDismissible ? true : 'static',
			keyboard: config.isDismissible,
		});

		if (config.isDismissible) {
			$('#player-input-cancel-container').show();
			$('#player-input-modal-dismiss-button').show();
		} else {
			$('#player-input-cancel-container').hide();
			$('#player-input-modal-dismiss-button').hide();
		}

		$('#player-input-modal').modal('show');
		taro.client.myPlayer.control.updatePlayerInputStatus();
		self.pressedButton = false;
	},

	// open a modal with custom content rendered in it
	showCustomModal: function (config) {
		var self = this;

		config.isDismissible = config.isDismissible === undefined ? true : !!config.isDismissible;

		if (window.DOMPurify) {
			$('#custom-modal .content').html(window.DOMPurify.sanitize(config.content || ''));
		}

		if (config.title) {
			$('#custom-modal .modal-title').html(window.DOMPurify.sanitize(config.title));
			$('#custom-modal .modal-header').show();
		} else {
			$('#custom-modal .modal-header').hide();
		}

		$('#custom-modal').addClass('d-flex');
		$('#custom-modal').modal({
			backdrop: config.isDismissible ? true : 'static',
			keyboard: config.isDismissible,
		});

		if (config.isDismissible) {
			$('#custom-modal-cancel-container').show();
			$('#custom-modal-dismiss-button').show();
		} else {
			$('#custom-modal-cancel-container').hide();
			$('#custom-modal-dismiss-button').hide();
		}

		$('#custom-modal').modal('show');

		self.pressedButton = false;
	},

	// open a modal with custom content rendered in it
	openWebsite: function (config) {
		var self = this;

		config.isDismissible = config.isDismissible === undefined ? true : !!config.isDismissible;
		function openTab() {
			var newWin = window.open(config.url);
			if (!newWin || newWin.closed || typeof newWin.closed == 'undefined') {
				swal({
					title: 'Please allow Popups',
					text: 'Your browser is blocking the content modd.io is trying to display',
					imageWidth: 300,
					imageUrl: '/assets/images/enable-popup.gif',
					imageClass: 'rounded border',
				});
			}
		}
		var isExternal = !new URL(config.url).hostname.includes('modd.io');
		if (isExternal) {
			swal({
				html: `You are being redirected to ${config.url}.<br>Are you sure you want to visit this external site?`,
				type: 'warning',
				showCancelButton: true,
				confirmButtonText: 'Yes',
			}).then((result) => {
				if (result.value) {
					openTab();
				}
			});
		} else {
			openTab();
		}
	},
	showWebsiteModal: function (config) {
		var self = this;

		config.isDismissible = config.isDismissible === undefined ? true : !!config.isDismissible;

		$('#website-modal').find('iframe').attr('src', config.url);
		$('#website-modal').modal({
			backdrop: config.isDismissible ? true : 'static',
			keyboard: config.isDismissible,
		});
	},
	showSocialShareModal: function (config) {
		var self = this;

		config.isDismissible = config.isDismissible === undefined ? true : !!config.isDismissible;

		$('#social-share-modal').modal({
			backdrop: config.isDismissible ? true : 'static',
			keyboard: config.isDismissible,
		});
	},

	openDialogueModal: function (dialogueId, extraData) {
		let dialogueTemplate = extraData.dialogueTemplate || window.defaultUI.dialogueview;
		window.handleOptionClick = function (e, index) {
			e.preventDefault();
			e.stopPropagation();
			const optionId = index.toString();
			$('.dialogue-option').addClass('disabled');
			$(this).find('.option-check').removeClass('d-none');
			taro.playerUi.submitDialogueModal(dialogueId, optionId);
		};

		var self = this;

		function getDialogueInstance(dialogue) {
			var playerName = extraData && extraData.playerName;
			dialogue = rfdc()(dialogue);

			if (dialogue.message.indexOf('%PLAYER_NAME%') > -1 && playerName) {
				dialogue.message = dialogue.message.replace(/%PLAYER_NAME%/g, playerName);
			}

			var variables = dialogue.message.match(new RegExp('\\$.+?\\$', 'g'));

			if (variables && variables.length) {
				variables.forEach(function (variable) {
					// variable are in format $xxx$ so splitting it by $ will give ['', 'xxx', '']
					var variableName = variable.split('$')[1];

					if (extraData.variables.hasOwnProperty(variableName)) {
						var variableValue = extraData.variables[variableName];

						// replace all occurrences of variableName
						dialogue.message = dialogue.message.replace(new RegExp(`\\$${variableName}\\$`, 'g'), variableValue);
					}
				});
			}

			dialogue.messageFragments = dialogue.message.split('%br%');
			dialogue.currentFragmentIndex = 0;
			dialogue.areAllMessagesPrinted = function () {
				return this.currentFragmentIndex >= this.messageFragments.length;
			};
			dialogue.getNextMessage = function () {
				return dialogue.messageFragments[dialogue.currentFragmentIndex++];
			};
			dialogue.hasOptions = function () {
				return Object.keys(dialogue.options).length > 0;
			};

			dialogue.areOptionsRendered = false;

			return dialogue;
		}

		function initModal() {
			window.renderHBSTemplate(
				{
					dialogue: {
						...dialogue,
						message: '',
						options: [],
						letterPrintSpeed: 0,
					},
				},
				dialogueTemplate
			);

			if (self.dialogue.messagePrinter) {
				clearInterval(self.dialogue.messagePrinter);
			}

			$(document).on('keydown.modd-dialogue', keyboardListener);
			$(document).on('click.modd-dialogue', skipText);
		}

		function showOptions() {
			dialogue.areOptionsRendered = true;

			window.renderHBSTemplate(
				{
					dialogue: {
						...dialogue,
						message: self.dialogue.message,
					},
				},
				dialogueTemplate
			);
		}

		function showNextMessage() {
			if (dialogue.areAllMessagesPrinted()) {
				if (dialogue.hasOptions() && !dialogue.areOptionsRendered) {
					showOptions();
				} else {
					self.closeDialogueModal();
				}
			} else {
				self.dialogue.message = dialogue.getNextMessage();
				self.dialogue.message = self.dialogue.message.replace(/%nl%/g, '<br/>');

				let options = [];
				if (dialogue.areAllMessagesPrinted() && dialogue.hasOptions() && !dialogue.areOptionsRendered) {
					dialogue.areOptionsRendered = true;
					options = dialogue.options;
				}

				window.renderHBSTemplate(
					{
						dialogue: {
							...dialogue,
							message: self.dialogue.message,
							options: options,
						},
					},
					dialogueTemplate
				);
			}
		}

		function skipText() {
			if (window.dialogueMessagePrinter) {
				clearInterval(window.dialogueMessagePrinter);
				$('#modd-dialogue-message').html(window.DOMPurify.sanitize(self.dialogue.message, { FORCE_BODY: true }));
				window.dialogueMessagePrinter = null;
				$('.dialogue-option') && $('.dialogue-option').removeClass('d-none');
				return;
			}
			if (!(dialogue.hasOptions() && dialogue.areOptionsRendered)) {
				showNextMessage();
			}
		}

		function keyboardListener(e) {
			if (e.keyCode === 32) {
				skipText();
			}
		}

		var dialogue = taro.game.data.dialogues[dialogueId];

		dialogue.message = dialogue.message || '';
		if (dialogue) {
			dialogue = getDialogueInstance(dialogue);
			initModal();
			showNextMessage();
		} else {
			console.error('dialogue', dialogueId, 'not found');
		}
	},
	closeDialogueModal: function () {
		window.closeDialogue && window.closeDialogue();
		$('#modd-dialogue-container').html('');
		this.clearListeners();
	},

	clearListeners: function () {
		console.log('clearing all keydown listeners on document');
		$(document).off('click.modd-dialogue keydown.modd-dialogue');
		taro.client.myPlayer.control.updatePlayerInputStatus();
	},

	submitDialogueModal: function (dialogueId, optionId) {
		var self = this;
		var willOpenNewDialogue = false;
		var dialogue = taro.game.data.dialogues[dialogueId];

		for (var key in dialogue.options) {
			if (key === optionId) {
				willOpenNewDialogue = !!dialogue.options[key].followUpDialogue;
				break;
			}
		}
		if (willOpenNewDialogue) {
			this.clearListeners();
		} else {
			self.closeDialogueModal();
		}

		if (dialogueId && optionId) {
			const data = {
				status: 'submitted',
				dialogue: dialogueId,
				option: optionId,
			};
			taro.network.send('playerDialogueSubmit', data);

			var player = taro.client.myPlayer;

			if (player) {
				var selectedOption = null;

				for (var dialogId in taro.game.data.dialogues) {
					var dialog = taro.game.data.dialogues[dialogId];

					if (dialogId === data.dialogue) {
						for (var optionId in dialog.options) {
							var option = dialog.options[optionId];

							if (optionId === data.option) {
								selectedOption = option;
								break;
							}
						}
					}
				}

				if (selectedOption) {
					if (selectedOption.scriptName) {
						const isWorldDialogue = dialogue.isWorld;
						const triggeredFrom = isWorldDialogue ? 'world' : 'map';
						taro.script.runScript(selectedOption.scriptName, { triggeredFrom });
					}
				}
			}
		}
	},

	updateBackpack: function (data) {
		try {
			switch (data.action) {
				case 'open':
					$(taro.client.getCachedElementById('backpack')).show();
					break;
				case 'close':
					$(taro.client.getCachedElementById('backpack')).hide();
					break;
				default:
					break;
			}
		} catch (err) {
			console.log('playerUi - updateBackpack error: ', err);
		}
	},

	updateUiElement: function (data) {
		try {
			switch (data.action) {
				case 'show':
					$(`#${data.elementId}`).show();
					break;
				case 'hide':
					$(`#${data.elementId}`).hide();
					break;
				case 'setHtml':
					$(`#${data.elementId}`).html(data.htmlStr);
					break;
				case 'addClass':
					document.getElementById(data.elementId).classList.add(data.className);
					break;
				case 'removeClass':
					document.getElementById(data.elementId).classList.remove(data.className);
					break;
				case 'setUIElementProperty':
					document.getElementById(data.elementId)[data.key] = data.value;
					break;
				default:
					break;
			}
		} catch (err) {
			console.log('playerUi - updateUiElement error: ', err);
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = PlayerUiComponent;
}
