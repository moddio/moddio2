var ProfileComponent = TaroEntity.extend({
	classId: 'ProfileComponent',
	componentId: 'profile',

	init: function () {
		this.profile = {};
	},

	start: function () {
        
    }
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ProfileComponent;
}
