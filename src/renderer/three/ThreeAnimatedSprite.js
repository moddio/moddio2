class ThreeAnimatedSprite extends ThreeSprite {
    constructor(tex) {
        super(tex);
        this.tex = tex;
        this.playSpriteIndices = [];
        this.runningTileArrayIndex = 0;
        this.maxDisplayTime = 0;
        this.elapsedTime = 0;
        this.tileH = 1;
        this.tileV = 1;
        this.currentTile = 0;
        this.repeat = 0;
        this.cycle = 0;
        if (tex.userData.numColumns && tex.userData.numRows) {
            this.tileH = tex.userData.numColumns;
            this.tileV = tex.userData.numRows;
        }
        tex.repeat.set(1 / this.tileH, 1 / this.tileV);
        const offsetX = (this.currentTile % this.tileH) / this.tileH;
        const offsetY = 1 - 1 / this.tileV - (Math.floor(this.currentTile / this.tileH) % this.tileV) / this.tileV;
        tex.offset.set(offsetX, offsetY);
    }
    loop(playSpriteIndices, fps, repeat = 0) {
        this.playSpriteIndices = playSpriteIndices;
        this.runningTileArrayIndex = 0;
        this.currentTile = playSpriteIndices[this.runningTileArrayIndex];
        this.maxDisplayTime = 1 / fps;
        this.repeat = repeat;
        this.cycle = 0;
        this.elapsedTime = 0;
        const offsetX = (this.currentTile % this.tileH) / this.tileH;
        const offsetY = 1 - 1 / this.tileV - (Math.floor(this.currentTile / this.tileH) % this.tileV) / this.tileV;
        this.tex.offset.set(offsetX, offsetY);
    }
    update(dt) {
        this.elapsedTime += dt;
        if (this.repeat !== -1 && this.cycle >= this.repeat + 1) {
            return;
        }
        if (this.maxDisplayTime > 0 && this.elapsedTime >= this.maxDisplayTime) {
            this.elapsedTime = 0;
            this.runningTileArrayIndex = (this.runningTileArrayIndex + 1) % this.playSpriteIndices.length;
            this.currentTile = this.playSpriteIndices[this.runningTileArrayIndex];
            if (this.runningTileArrayIndex === 0) {
                this.cycle += 1;
                if (this.cycle === this.repeat + 1)
                    return;
            }
            const offsetX = (this.currentTile % this.tileH) / this.tileH;
            const offsetY = 1 - 1 / this.tileV - (Math.floor(this.currentTile / this.tileH) % this.tileV) / this.tileV;
            this.tex.offset.set(offsetX, offsetY);
        }
    }
    setTexture(tex) {
        super.setTexture(tex);
        this.tex = tex;
        if (tex.userData.numColumns && tex.userData.numRows) {
            this.tileH = tex.userData.numColumns;
            this.tileV = tex.userData.numRows;
        }
        tex.repeat.set(1 / this.tileH, 1 / this.tileV);
        const offsetX = (this.currentTile % this.tileH) / this.tileH;
        const offsetY = 1 - 1 / this.tileV - (Math.floor(this.currentTile / this.tileH) % this.tileV) / this.tileV;
        tex.offset.set(offsetX, offsetY);
    }
}
//# sourceMappingURL=ThreeAnimatedSprite.js.map