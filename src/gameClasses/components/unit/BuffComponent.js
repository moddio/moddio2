var BuffComponent = TaroEntity.extend({
	classId: 'BuffComponent',
	componentId: 'buff',

	init: function (entity, options) {
		var self = this;
		self._entity = entity;
	},

	addBuff: function (buff, duration = null, id) {
		var self = this;
		var unit = self._entity;
		var baseEntityStats = taro.game.getAsset('unitTypes', unit._stats['type']);
		if (typeof buff == 'string') {
			var buff = taro.game.getAsset('buffTypes', buff);
		} else {
			var buff = buff;
		};
		if (!baseEntityStats || !buff) {
			return;
		};
		if (taro.isServer) {
			buff.id = '_' + Math.random().toString(36).substring(2, 9);
			unit.streamUpdateData([{ buff: {data: buff, action: 'add', duration: duration}}]);
		};
		
		var isDuplicated = false;
		for (let i = 0; i < unit._stats.buffs.length; i++) { //search for duplicate buffs
			if (unit._stats.buffs[i].name == buff.name){
				if (unit._stats.buffs[i].maxStacks > unit._stats.buffs[i].stacks) { //check if the buff can receive another stack
					unit._stats.buffs[i].stacks++;
					unit._stats.buffs[i].timeLimit = Date.now() + duration; //reset timer
					isDuplicated = true;
					self.updateBuffIcon(unit._stats.buffs[i]);
				} else if (unit._stats.buffs[i].unique) {
					unit._stats.buffs[i].timeLimit = Date.now() + duration;
					self.updateBuffIcon(unit._stats.buffs[i]);
					return;
				};
			};
		};
		
		if (!isDuplicated) {
			var newBuff = {
				name: buff.name,
				id: buff.id,
				timeLimit: Date.now() + duration,
				duration: duration,
				description: buff.description,
				image: buff.image,
				attributes: buff.attributes,
				stun: buff.stun,
				stacks: 1,
				maxStacks: buff.maxStacks,
				unique: buff.unique
			};
			unit._stats.buffs.push(newBuff);
			if (buff.stun) {
				unit._stats.isDisabled = true;
			};
			self.createBuffIcon(newBuff);
		};
		
		if (taro.isServer && buff.attributes) {
			_.forEach(buff.attributes, function (value, attrKey) {
				var selectedAttribute = unit._stats.attributes[attrKey];
				if (selectedAttribute) {
					var currentAttributeValue = parseFloat(selectedAttribute.value) || 1;
					var maxValue = parseFloat(selectedAttribute.max);

					if (currentAttributeValue) {
						var newMax = maxValue + parseFloat(value);
						var newValue = Math.min(newMax, Math.max(selectedAttribute.min, currentAttributeValue)) + value;
						unit.attribute.setMax(attrKey, newMax);
						unit.attribute.update(attrKey, newValue, true);
					};
				};
			});
		};

	},

	removeBuff: function (buff) {
		var self = this;
		var unit = self._entity;
		var baseEntityStats = taro.game.getAsset('unitTypes', unit._stats['type']);
		if (!baseEntityStats || !buff) {
			return;
		};

		if (taro.isServer && buff.attributes) {
			_.forEach(buff.attributes, function (value, attrKey) {
				var selectedAttribute = unit._stats.attributes[attrKey];
				if (selectedAttribute) {
					var currentAttributeValue = parseFloat(selectedAttribute.value) || 1;
					var maxValue = parseFloat(selectedAttribute.max);

					if (currentAttributeValue) {
						var newMax = maxValue - parseFloat(value * buff.stacks);
						var newValue = Math.min(newMax, Math.max(selectedAttribute.min, currentAttributeValue));
						unit.attribute.setMax(attrKey, newMax);
						unit.attribute.update(attrKey, newValue, true);
					};
				};
			});
		};

		var index = unit._stats.buffs.map(e => e.id).indexOf(buff.id);
		self.removeBuffIcon(buff.id);
		if (buff.stun) {
			if (unit._stats.buffs.every(item => item == buff || !item.stun)) {
				unit._stats.isDisabled = false;
			};
		};
		unit._stats.buffs.splice(index, 1);
	},

    createBuffIcon (buff) {
		var self = this;
		var entity = self._entity;
		var ownerPlayer = entity.getOwner();
		if (!taro.isServer && ownerPlayer && entity._stats.clientId === taro.network.id() && ownerPlayer._stats.selectedUnitId == entity.id()) {
			$('#buff-icons').append($('<div/>', {
					id: `${buff.id}`,
					name: buff.name,
					class: `buff-icon`,
					style: `background-image: url(${  buff.image  });`,
					html: `<small class='stack'>${buff.stacks > 1 ? String(buff.stacks) : ''}</small>`,
					title: buff.name,
					'data-container': 'body',
					'data-toggle': 'popover',
					'data-placement': 'top',
					'data-content': buff.description
				})
			);				

			$('#' + buff.id).append($('<div/>', {
					id: `cd${buff.id}`,
					class: `buff-cooldown`,
					style: `animation: ${(buff.timeLimit - Date.now()) / 1000}s linear cd-animation forwards;`
				})
			).on("animationend", function() {
				self.removeBuffIcon(buff.id);
			}).popover({
				html: true,
				animation: false,
				trigger: 'manual'
			}).on('mouseenter', function () {
				$('.popover').popover('hide');
				$(this).popover('show');
			});
		};
	},

	removeBuffIcon (buffId) {
		var self = this;
		var entity = self._entity;
		var ownerPlayer = entity.getOwner();
		if (!taro.isServer && ownerPlayer && entity._stats.clientId === taro.network.id() && ownerPlayer._stats.selectedUnitId == entity.id()) {
			var element = $(`#${buffId}`)
			element.popover('hide');
			element.remove();
		};
	},

	removeBuffType (buff) {
		var self = this;
		var unit = self._entity;

		var buffsToRemove = [];
		unit._stats.buffs.forEach(function(item){
			if (item.name == buff.name) {
				buffsToRemove.push(item);
			};
		});
		buffsToRemove.forEach(item => self.removeBuff(item));	
	},

	updateBuffIcon (buff) {
		var self = this;
		var entity = self._entity;
		var ownerPlayer = entity.getOwner();

		if (!taro.isServer && ownerPlayer && entity._stats.clientId === taro.network.id() && ownerPlayer._stats.selectedUnitId == entity.id()) {
			var element = $(`#${buff.id}`);
			if (buff.stacks > 1) {
				element.find('small').text(buff.stacks);
			};
			element.find('div').remove();
			element.append($('<div/>', {
				id: `cd${buff.id}`,
				class: `buff-cooldown`,
				style: `animation: ${buff.duration / 1000}s linear cd-animation forwards;`
				})
			);
		};	
	},

	updateBuffList () {
		var self = this;
		var entity = self._entity;
		var ownerPlayer = entity.getOwner();
		if (!taro.isServer && ownerPlayer && entity._stats.clientId === taro.network.id() && ownerPlayer._stats.selectedUnitId == entity.id()) {
			$('#buff-icons').empty();
			entity._stats.buffs.forEach(function(buff){
				self.createBuffIcon(buff);
			});
		};
	},

	update () {
		var self = this;
		var entity = self._entity;

		if (entity._stats.buffs && entity._stats.buffs.length > 0) {
			entity._stats.buffs.forEach(function(buff){
				if (buff.timeLimit < Date.now()) {
					self.removeBuff(buff);
				};
			});
		};
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = BuffComponent; }
