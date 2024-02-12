class ThreeUnit extends ThreeAnimatedSprite {
    constructor(tex) {
        super(tex);
        this.label = new ThreeLabel();
        this.attributeBars = new THREE.Group();
        this.label.setOffset(new THREE.Vector2(0, 0.75 * 64), new THREE.Vector2(0.5, 0));
        this.add(this.label);
        this.add(this.attributeBars);
    }
    renderChat(text) {
        if (this.chat) {
            this.chat.update(text);
        }
        else {
            this.chat = new ThreeChatBubble(text);
            this.chat.setOffset(new THREE.Vector2(0, 1.5 * 64), new THREE.Vector2(0.5, 0));
            this.add(this.chat);
        }
    }
    renderAttributes(data) {
        this.attributeBars.remove(...this.attributeBars.children);
        data.attrs.forEach((attributeData) => {
            const bar = new ThreeAttributeBar();
            bar.update(attributeData);
            const yOffset = (attributeData.index - 1) * bar.height * 1.1;
            bar.setOffset(new THREE.Vector2(0, -0.75 * 64 - yOffset), new THREE.Vector2(0.5, 1));
            this.attributeBars.add(bar);
        });
    }
    updateAttribute(data) {
        let barToUpdate;
        // Refactor attributeBars into map (name -> bar)
        for (const bar of this.attributeBars.children) {
            if (bar.name === data.attr.type) {
                barToUpdate = bar;
                break;
            }
        }
        if (!data.shouldRender) {
            if (barToUpdate) {
                barToUpdate.visible = data.shouldRender;
            }
            return;
        }
        if (barToUpdate) {
            barToUpdate.update(data.attr);
        }
        else {
            const bar = new ThreeAttributeBar();
            bar.update(data.attr);
            const yOffset = (data.attr.index - 1) * bar.height * 1.1;
            bar.setOffset(new THREE.Vector2(0, -0.75 * 64 - yOffset), new THREE.Vector2(0.5, 1));
            this.attributeBars.add(bar);
        }
    }
    setScaleChildren(scale) {
        this.label.setScale(scale);
        for (const bar of this.attributeBars.children) {
            bar.setScale(scale);
        }
        if (this.chat) {
            this.chat.setScale(scale);
        }
    }
}
//# sourceMappingURL=ThreeUnit.js.map