class ThreeLabel extends THREE.Group {
    constructor(text = 'cccccc') {
        super();
        this.scaleScalar = 1;
        this.size = new THREE.Vector2();
        this.center = new THREE.Vector2(0.5, 0.5);
        this.offset = new THREE.Vector2();
        const threeRenderer = ThreeRenderer.getInstance();
        const zoomScale = 1 / threeRenderer.camera.zoomLevel;
        this.scaleScalar = zoomScale;
        this.sprite = this.createLabel(text);
        this.add(this.sprite);
        this.visible = false;
    }
    update(text, color = 'white', bold = false) {
        this.remove(this.sprite);
        this.sprite = this.createLabel(text, color, bold);
        this.add(this.sprite);
        this.visible = true;
    }
    setOffset(offset, center = new THREE.Vector2(0.5, 0.5)) {
        this.center.copy(center);
        this.offset.copy(offset);
        this.sprite.center.set(center.x - offset.x / (this.size.x * this.scaleScalar), center.y - offset.y / (this.size.y * this.scaleScalar));
    }
    setScale(scale) {
        this.scaleScalar = scale;
        this.sprite.center.set(this.center.x + this.offset.x / (this.size.x * scale), this.center.y + this.offset.y / (this.size.y * scale));
        this.sprite.scale.set(this.scaleScalar * Utils.pixelToWorld(this.size.x), this.scaleScalar * Utils.pixelToWorld(this.size.y), 1);
        this.sprite.center.set(this.center.x - this.offset.x / (this.size.x * scale), this.center.y - this.offset.y / (this.size.y * scale));
    }
    createLabel(text, color = 'white', bold = false) {
        const textCanvas = document.createElement('canvas');
        textCanvas.height = 10;
        const padding = 4;
        const ctx = textCanvas.getContext('2d');
        const font = `${bold ? 'bold' : 'normal'} 16px Verdana`;
        ctx.font = font;
        const metrics = ctx.measureText(text);
        const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        textCanvas.width = Math.ceil(metrics.width) + padding;
        textCanvas.height = Math.ceil(textHeight) + padding;
        this.size.set(textCanvas.width, textCanvas.height);
        if (taro.game.data.settings.addStrokeToNameAndAttributes) {
            ctx.font = font;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.lineJoin = 'miter';
            ctx.miterLimit = 3;
            ctx.strokeText(text, padding / 2, textHeight + padding / 2);
        }
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.font;
        ctx.fillText(text, padding / 2, textHeight + padding / 2);
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
//# sourceMappingURL=ThreeLabel.js.map