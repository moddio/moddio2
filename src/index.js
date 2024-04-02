var Game = TaroClass.extend({
    classId: 'Game',
    init(App, options) {
        // Create the engine
        taro = new TaroEngine(options);
        console.log('taro initialized', taro.isClient, taro.isServer);
        if (taro.isClient) {
            taro.client = new App();
        }
        if (taro.isServer) {
            taro.server = new App(options);
        }
    },
});
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Game;
}
else {
    var game = new Game(Client);
}
//# sourceMappingURL=index.js.map