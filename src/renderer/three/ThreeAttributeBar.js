class ThreeAttributeBar extends THREE.Group {
    constructor(width = 97, height = 16, radius = 7) {
        super();
        this.width = width;
        this.height = height;
        this.radius = radius;
        this.scaleScalar = 1;
        this.size = new THREE.Vector2();
        this.center = new THREE.Vector2(0.5, 0.5);
        this.offset = new THREE.Vector2();
        const threeRenderer = ThreeRenderer.getInstance();
        const zoomScale = 1 / threeRenderer.camera.zoomLevel;
        this.scaleScalar = zoomScale;
        this.sprite = this.createBar(this.width, this.height, this.radius, 'yellow', 100, 100);
        this.add(this.sprite);
    }
    update(data) {
        const { color, max, displayValue, showWhen, decimalPlaces, value } = data;
        this.name = data.type || data.key;
        this.remove(this.sprite);
        this.sprite = this.createBar(this.width, this.height, this.radius, color, +(+value).toFixed(decimalPlaces), max, displayValue);
        this.add(this.sprite);
        this.visible = true;
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        if ((showWhen instanceof Array && showWhen.indexOf('valueChanges') > -1) || showWhen === 'valueChanges') {
            this.timeout = setTimeout(() => {
                this.visible = false;
            }, 1000);
        }
    }
    setOffset(offset, center = new THREE.Vector2(0.5, 0.5)) {
        this.center.copy(center);
        this.offset.copy(offset);
        if (this.sprite) {
            this.sprite.center.set(center.x - offset.x / this.size.x, center.y - offset.y / this.size.y);
        }
    }
    setScale(scale) {
        this.scaleScalar = scale;
        this.sprite.center.set(this.center.x + this.offset.x / this.size.x, this.center.y + this.offset.y / this.size.y);
        this.sprite.scale.set(this.scaleScalar * Utils.pixelToWorld(this.size.x), this.scaleScalar * Utils.pixelToWorld(this.size.y), 1);
        this.sprite.center.set(this.center.x - this.offset.x / this.size.x, this.center.y - this.offset.y / this.size.y);
    }
    createBar(width, height, radius, color, value, max, displayValue = true) {
        const textCanvas = document.createElement('canvas');
        const ctx = textCanvas.getContext('2d');
        const font = `bold 14px Verdana`;
        const padding = 4;
        var x = padding / 2;
        var y = padding / 2;
        const text = value.toString();
        ctx.font = font;
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        textCanvas.width = width + padding;
        textCanvas.height = height + padding;
        this.size.set(textCanvas.width, textCanvas.height);
        Utils.fillRoundedRect(ctx, x, y, Math.max((width * value) / max, radius * 1.5), height, radius, color);
        Utils.strokeRoundedRect(ctx, x, y, width, height, radius, '#000000');
        if (displayValue) {
            ctx.font = font;
            ctx.fillStyle = '#000';
            ctx.fillText(text, textCanvas.width / 2 - textWidth / 2, textCanvas.height / 2 + textHeight / 2);
        }
        const spriteMap = new THREE.Texture(ctx.getImageData(0, 0, textCanvas.width, textCanvas.height));
        spriteMap.magFilter = ThreeTextureManager.instance().filter;
        spriteMap.generateMipmaps = false;
        spriteMap.needsUpdate = true;
        spriteMap.colorSpace = THREE.SRGBColorSpace;
        const spriteMaterial = new THREE.SpriteMaterial({ map: spriteMap });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.renderOrder = 499;
        sprite.scale.set(this.scaleScalar * Utils.pixelToWorld(textCanvas.width), this.scaleScalar * Utils.pixelToWorld(textCanvas.height), 1);
        sprite.center.set(this.center.x - this.offset.x / (this.size.x * this.scaleScalar), this.center.y - this.offset.y / (this.size.y * this.scaleScalar));
        return sprite;
    }
}
//# sourceMappingURL=ThreeAttributeBar.js.map