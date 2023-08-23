var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var UiScene = /** @class */ (function (_super) {
    __extends(UiScene, _super);
    function UiScene() {
        return _super.call(this, { key: 'Ui', active: true }) || this;
    }
    UiScene.prototype.init = function () {
        if (taro.game.data.defaultData.phaserAttributeBars) {
            var barContainer_1 = new PhaserUiBarsContainer(this);
            taro.client.on('update-attribute-width', function (items) {
                barContainer_1.barWidth = items * 48 - 4;
                if (barContainer_1.barWidth < 200)
                    barContainer_1.barWidth = 200;
            });
            taro.client.on('update-all-attributes', function (attributes) {
                barContainer_1.bars.forEach(function (bar) { return bar.destroy(); });
                barContainer_1.bars = [];
                Object.values(attributes).forEach(function (attribute) {
                    if (attribute.isVisible && (attribute.isVisible.indexOf && attribute.isVisible.indexOf('centerBar') > -1)) {
                        barContainer_1.addBar(attribute);
                    }
                });
                /*Object.entries(attributes).forEach(([type, attribute]) => {
                    if (
                        attribute.isVisible && (attribute.isVisible.indexOf && attribute.isVisible.indexOf('centerBar') > -1)
                    ) {
                        const bar = barContainer.bars.find(bar => bar.attribute.type === attribute.type);
                        if (bar) {
                            bar.updateAttribute(attribute);
                        } else {
                            barContainer.addBar(attribute);
                        }
                    }
                });
                barContainer.bars.forEach((bar, index) => {
                    const attribute = Object.values(attributes).find(attribute => attribute.type === bar.attribute.type);
                    if (!attribute || !attribute.isVisible || (attribute.isVisible.indexOf && attribute.isVisible.indexOf('centerBar') === -1)) {
                        bar.destroy();
                        barContainer.bars.splice(index, 1);
                    }
                    else {
                        bar.y = this.sys.game.canvas.height - barContainer.barHeight/2 - 20 - (barContainer.bars.length - 1 - index) * barContainer.barInterval;
                    }
                });   */
            });
            taro.client.on('update-attribute-bar', function (attribute) {
                barContainer_1.updateBar(attribute);
            });
        }
    };
    UiScene.prototype.create = function () {
    };
    UiScene.prototype.preload = function () {
    };
    UiScene.prototype.update = function () {
    };
    return UiScene;
}(PhaserScene));
//# sourceMappingURL=UiScene.js.map