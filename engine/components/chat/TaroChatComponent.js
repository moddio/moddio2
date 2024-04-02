var TaroChatComponent = TaroEventingClass.extend({
	classId: 'TaroChatComponent',
	componentId: 'chat',

	init: function (entity, options) {
		var self = this;

		this._options = options;

		this._rooms = {};

		// made by jaeyun
		this.lastMessageSentAt = [];
		this.sentMessages = [];

		/* CEXCLUDE */
		if (taro.isServer) {
			if (process.env.ENV != 'standalone') {
				this.filter = betterFilter;
			}

			// this.sanitizer = require('sanitizer');
			this.validator = require('validator');
			this.xssFilters = require('xss-filters');
			this.regexUnicode =
				/[^A-Za-zªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԧԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠࢢ-ࢬऄ-हऽॐक़-ॡॱ-ॷॹ-ॿঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-ళవ-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤜᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎↃↄⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々〆〱-〵〻〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚗꚠ-ꛥꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꪀ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ0-9 !"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~]/;
			this.implement(TaroChatServer);

			// Define the chat system network commands
			taro.network.define('taroChatMsg', this._onMessageFromClient);
			taro.network.define('taroChatJoinRoom', this._onJoinRoomRequestFromClient);
			taro.network.define('taroChatLeaveRoom', this._onLeaveRoomRequestFromClient);
			taro.network.define('taroChatRoomList', this._onClientWantsRoomList);
			taro.network.define('taroChatRoomUserList', this._onClientWantsRoomUserList);
			taro.network.define('taroChatRoomCreated');
			taro.network.define('taroChatRoomRemoved');
		}
		/* CEXCLUDE */

		if (taro.isClient) {
			this.implement(TaroChatClient);

			// Define the chat system network command listeners
			taro.network.define('taroChatMsg', this._onMessageFromServer);
			taro.network.define('taroChatJoinRoom', this._onJoinedRoom);
			taro.network.define('taroChatLeaveRoom', this._onLeftRoom);
			taro.network.define('taroChatRoomList', this._onServerSentRoomList);
			taro.network.define('taroChatRoomUserList', this._onServerSentRoomUserList);
			taro.network.define('taroChatRoomCreated', this._onRoomCreated);
			taro.network.define('taroChatRoomRemoved', this._onRoomRemoved);

			$('#send-message').on('click', function () {
				self.sendChatMessage();
			});

			$('#hide-chat').on('click', function () {
				$('#show-chat').removeClass('d-none');
				$('#chat-box').addClass('d-none');
			});

			$('#show-chat').on('click', function () {
				$('#show-chat').addClass('d-none');
				$('#chat-box').removeClass('d-none');
			});
		}

		this.log('Chat component initiated!');
	},

	sendChatMessage: function (val) {
		if (taro.isClient) {
			var player = taro.client.myPlayer;
			var gameData = taro.game && taro.game.data && taro.game.data.defaultData;
			var message = val === undefined ? $('#message').val() : val;

			// set character limit to 100 characters
			if (message.length > 80) message = message.substr(0, 80);

			// don't send chat message if user is ban or unverified.
			if (taro.env != 'local' && player && player._stats.banChat) {
				// don't send message
			} else {
				taro.network.send('taroChatMsg', { text: message, roomId: '1' });
			}
			$('#message').blur();
			$('#message').val('');
			$('#chat-message-input').hide();
			player.control.updatePlayerInputStatus();
		}
	},

	escapeOutput: function (str) {
		return str
			.replace(/\&/g, '&amp;')
			.replace(/\</g, '&lt;')
			.replace(/\>/g, '&gt;')
			.replace(/\"/g, '&quot;')
			.replace(/\'/g, '&#x27')
			.replace(/\//g, '&#x2F');
	},

	postMessage: function (msgData) {
		taro.devLog('message received', msgData);
		if (taro.isClient) {
			var msgDiv = '';

			if (msgData.from) {
				var player = taro.game.getPlayerByClientId(msgData.from);
				if (player && player._stats) {
					msgDiv = $("<div><span class='author' style='color: #99F000;'></span><span class='msg ml-1'></span></div>");
					$(msgDiv).find('.author').text(`${player._stats.name}: `);
					$(msgDiv).find('.msg').text(msgData.text);

					window?.reactApp?.pushMessageToChat &&
						window?.reactApp?.pushMessageToChat({
							author: player._stats.name,
							username: player._stats.username,
							message: msgData.text,
							from: 'user',
							userId: player._stats.userId,
							controlledBy: player._stats.controlledBy,
						});
					window?.pushMessageToChat &&
						window.pushMessageToChat({
							author: player._stats.name,
							username: player._stats.username,
							message: msgData.text,
							from: 'user',
							userId: player._stats.userId,
							controlledBy: player._stats.controlledBy,
						});
				}
			} // system message
			else {
				msgDiv = $('<div/>', {
					style: 'color: yellow',
				});

				if (msgData.isHtml) {
					msgDiv.append(`* ${msgData.text} *`);
				} else {
					msgDiv.text(`* ${msgData.text} *`);
				}

				window.reactApp?.pushMessageToChat &&
					window.reactApp.pushMessageToChat({
						message: msgData.text,
						isHtml: msgData.isHtml,
						from: 'system',
						bmToAll: msgData.bmToAll,
					});
				window.pushMessageToChat &&
					window.pushMessageToChat({
						message: msgData.text,
						isHtml: msgData.isHtml,
						from: 'system',
						bmToAll: msgData.bmToAll,
					});
			}

			// append new message mobile
			$('#mobile-chat-box #chat-history').each(function () {
				messageCount = $(this).find('div').length;
				if (messageCount > 50) {
					$(this).find('div:first-child').remove();
				}
				// console.log("messageCount", messageCount)
				var scrollDifference = Math.abs(parseInt(this.scrollTop + this.clientHeight) - parseInt(this.scrollHeight));
				var shouldScroll =
					parseInt($(this).scrollTop + $(this).clientHeight) === parseInt($(this).scrollHeight) || scrollDifference < 2;

				// console.log(scrollDifference, shouldScroll)

				$(this).append(msgDiv);

				if (shouldScroll) {
					// auto scroll down to bottom
					$(this).scrollTop(this.scrollHeight);
				}
			});
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroChatComponent;
}
