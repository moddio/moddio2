/// <reference types="@types/google.analytics" />
class ThreeRenderer {
    constructor() {
        var _a;
        this.animations = new Map();
        this.entities = [];
        this.pointer = new THREE.Vector2();
        this.animatedSprites = [];
        this.resolutionCoef = 1;
        this.zoomSize = undefined;
        // For JS interop; in case someone uses new ThreeRenderer()
        if (!ThreeRenderer.instance) {
            ThreeRenderer.instance = this;
        }
        else {
            return ThreeRenderer.instance;
        }
        const renderer = new THREE.WebGLRenderer({ logarithmicDepthBuffer: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        (_a = document.querySelector('#game-div')) === null || _a === void 0 ? void 0 : _a.appendChild(renderer.domElement);
        this.renderer = renderer;
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera = new ThreeCamera(width, height, this.renderer.domElement);
        this.scene = new THREE.Scene();
        this.scene.translateX(-taro.game.data.map.width / 2);
        this.scene.translateZ(-taro.game.data.map.height / 2);
        window.addEventListener('resize', () => {
            this.camera.resize(window.innerWidth, window.innerHeight);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.render(this.scene, this.camera.instance);
            if (this.zoomSize) {
                const ratio = Math.max(window.innerWidth, window.innerHeight) / this.zoomSize;
                this.camera.zoom(ratio);
                taro.client.emit('scale', { ratio: ratio * this.resolutionCoef });
                taro.client.emit('update-abilities-position');
                for (const entity of this.entities) {
                    entity.setScaleChildren(1 / ratio);
                }
            }
        });
        THREE.DefaultLoadingManager.onStart = () => {
            this.forceLoadUnusedCSSFonts();
        };
        THREE.DefaultLoadingManager.onLoad = () => {
            console.log(ThreeTextureManager.instance().textureMap);
            this.init();
            this.setupInputListeners();
            taro.client.rendererLoaded.resolve();
            requestAnimationFrame(this.render.bind(this));
        };
        this.loadTextures();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new ThreeRenderer();
        }
        return this.instance;
    }
    loadTextures() {
        const textureManager = ThreeTextureManager.instance();
        textureManager.setFilter(taro.game.data.defaultData.renderingFilter);
        const data = taro.game.data;
        data.map.tilesets.forEach((tileset) => {
            const key = tileset.image;
            textureManager.loadFromUrl(key, Utils.patchAssetUrl(key));
        });
        const entityTypes = [
            ...Object.values(data.unitTypes),
            ...Object.values(data.projectileTypes),
            ...Object.values(data.itemTypes),
        ];
        for (const type of entityTypes) {
            const cellSheet = type.cellSheet;
            if (!cellSheet)
                continue;
            const key = cellSheet.url;
            textureManager.loadFromUrl(key, Utils.patchAssetUrl(key), () => {
                this.createAnimations(type);
            });
        }
        for (const type of Object.values(data.particleTypes)) {
            const key = type.url;
            textureManager.loadFromUrl(key, Utils.patchAssetUrl(key));
        }
    }
    forceLoadUnusedCSSFonts() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = 'normal 4px Verdana';
        ctx.fillText('text', 0, 8);
        ctx.font = 'bold 4px Verdana';
        ctx.fillText('text', 0, 8);
    }
    init() {
        taro.client.on('zoom', (height) => {
            if (this.zoomSize === height * 2.15)
                return;
            this.zoomSize = height * 2.15;
            const ratio = Math.max(window.innerWidth, window.innerHeight) / this.zoomSize;
            // TODO: Quadratic zoomTo over 1 second
            this.camera.zoom(ratio);
            taro.client.emit('scale', { ratio: ratio * this.resolutionCoef });
            for (const entity of this.entities) {
                entity.setScaleChildren(1 / ratio);
            }
        });
        taro.client.on('stop-follow', () => this.camera.stopFollow());
        const layers = {
            entities: new THREE.Group(),
        };
        layers.entities.position.y = 1;
        for (const layer of Object.values(layers)) {
            this.scene.add(layer);
        }
        taro.game.data.map.tilesets.forEach((tileset) => {
            const tex = ThreeTextureManager.instance().textureMap.get(tileset.image);
            const cols = Math.floor(tex.image.width / tileset.tilewidth);
            tex.image = resizeImageToPowerOf2(tex.image);
            tex.generateMipmaps = false;
            this.voxelMap = new ThreeVoxelMap(tex, tileset.tilewidth, tileset.tileheight, cols);
            this.scene.add(this.voxelMap);
            taro.game.data.map.layers.forEach((layer) => {
                let layerId = 0;
                switch (layer.name) {
                    case 'floor':
                        layerId = 1;
                        break;
                    case 'floor2':
                        layerId = 2;
                        break;
                    case 'walls':
                        layerId = 3;
                        break;
                    case 'trees':
                        // 5 so it's always rendered on top.
                        // label/bars are rendered at renderOrder 499
                        layerId = 5;
                        break;
                }
                if (['floor'].includes(layer.name)) {
                    this.voxelMap.addLayer(layer, 0, false, false, layerId * 100);
                }
                if (['floor2'].includes(layer.name)) {
                    this.voxelMap.addLayer(layer, 1, true, true, layerId * 100);
                }
                if (['walls'].includes(layer.name)) {
                    this.voxelMap.addLayer(layer, 1, true, false, layerId * 100);
                }
                if (['trees'].includes(layer.name)) {
                    this.voxelMap.addLayer(layer, 3, true, true, layerId * 100);
                }
            });
        });
        const createEntity = (entity) => {
            let tex = ThreeTextureManager.instance().textureMap.get(entity._stats.cellSheet.url);
            const createEntity = () => {
                const e = new ThreeUnit(tex.clone());
                this.animatedSprites.push(e);
                return e;
            };
            const ent = createEntity();
            layers.entities.add(ent);
            this.entities.push(ent);
            const transformEvtListener = entity.on('transform', (data) => {
                ent.position.set(Utils.pixelToWorld(data.x) - 0.5, 1, Utils.pixelToWorld(data.y) - 0.5);
                ent.setRotationY(-data.rotation);
            }, this);
            const sizeEvtListener = entity.on('size', (data) => {
                ent.setScale(Utils.pixelToWorld(data.width), Utils.pixelToWorld(data.height));
            }, this);
            const scaleEvtListener = entity.on('scale', (data) => {
                ent.scale.set(data.x, 1, data.y);
            }, this);
            const showEvtListener = entity.on('show', () => {
                ent.visible = true;
            }, this);
            const hideEvtListener = entity.on('hide', () => {
                ent.visible = false;
            }, this);
            const followEvtListener = entity.on('follow', () => {
                this.camera.startFollow(ent);
            }, this);
            // Label
            const updateLabelEvtListener = entity.on('update-label', (data) => {
                ent.label.visible = true;
                ent.label.update(data.text, data.color, data.bold);
            });
            const showLabelEvtListener = entity.on('show-label', () => (ent.label.visible = true));
            const hideLabelEvtListener = entity.on('hide-label', () => (ent.label.visible = false));
            // Attributes
            const renderAttributesEvtListener = entity.on('render-attributes', (data) => {
                ent.renderAttributes(data);
            });
            const updateAttributeEvtListener = entity.on('update-attribute', (data) => {
                ent.updateAttribute(data);
            });
            const renderChatBubbleEvtListener = entity.on('render-chat-bubble', (text) => {
                ent.renderChat(text);
            });
            // Animation
            const playAnimationEvtListener = entity.on('play-animation', (id) => {
                const animation = this.animations.get(`${tex.userData.key}/${id}`);
                if (animation) {
                    ent.loop(animation.frames, animation.fps, animation.repeat);
                }
            });
            const updateTextureEvtListener = entity.on('update-texture', (data) => {
                const textureManager = ThreeTextureManager.instance();
                const key = entity._stats.cellSheet.url;
                const tex2 = textureManager.textureMap.get(key);
                if (tex2) {
                    this.createAnimations(entity._stats);
                    tex = tex2.clone();
                    ent.setTexture(tex);
                    const bounds = entity._bounds2d;
                    ent.setScale(Utils.pixelToWorld(bounds.x), Utils.pixelToWorld(bounds.y));
                }
                else {
                    textureManager.loadFromUrl(key, Utils.patchAssetUrl(key), (tex2) => {
                        this.createAnimations(entity._stats);
                        tex = tex2.clone();
                        ent.setTexture(tex);
                        const bounds = entity._bounds2d;
                        ent.setScale(Utils.pixelToWorld(bounds.x), Utils.pixelToWorld(bounds.y));
                    });
                }
            });
            entity.on('layer', (layer) => {
                ent.setLayer(layer);
            });
            entity.on('depth', (depth) => {
                ent.setDepth(depth);
            });
            entity.on('dynamic', (data) => {
                // console.log('dynamic');
            });
            entity.on('flip', (flip) => {
                ent.setFlip(flip % 2 === 1, flip > 1);
            });
            const destroyEvtListener = entity.on('destroy', () => {
                const idx = this.entities.indexOf(ent, 0);
                if (idx > -1) {
                    layers.entities.remove(ent);
                    this.entities.splice(idx, 1);
                    const animIdx = this.animatedSprites.indexOf(ent, 0);
                    if (animIdx > -1) {
                        this.animatedSprites.splice(animIdx, 1);
                    }
                    entity.off('transform', transformEvtListener);
                    entity.off('size', sizeEvtListener);
                    entity.off('scale', scaleEvtListener);
                    entity.off('show', showEvtListener);
                    entity.off('hide', hideEvtListener);
                    entity.off('follow', followEvtListener);
                    entity.off('destroy', destroyEvtListener);
                    entity.off('update-label', updateLabelEvtListener);
                    entity.off('show-label', showLabelEvtListener);
                    entity.off('hide-label', hideLabelEvtListener);
                    entity.off('render-attributes', renderAttributesEvtListener);
                    entity.off('update-attribute', updateAttributeEvtListener);
                    entity.off('render-chat-bubble', renderChatBubbleEvtListener);
                    entity.off('play-animation', playAnimationEvtListener);
                    entity.off('update-texture', updateTextureEvtListener);
                }
            }, this);
        };
        taro.client.on('create-unit', (u) => createEntity(u), this);
        taro.client.on('create-item', (i) => createEntity(i), this);
        taro.client.on('create-projectile', (p) => createEntity(p), this);
        this.renderer.domElement.addEventListener('mousemove', (evt) => {
            this.pointer.set((evt.clientX / window.innerWidth) * 2 - 1, -(evt.clientY / window.innerHeight) * 2 + 1);
        });
    }
    setupInputListeners() {
        taro.input.setupListeners(this.renderer.domElement);
    }
    getViewportBounds() {
        return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    }
    getCameraWidth() {
        return window.innerWidth;
    }
    getCameraHeight() {
        return window.innerHeight;
    }
    render() {
        requestAnimationFrame(this.render.bind(this));
        taro.client.emit('tick');
        if (this.camera.target) {
            const worldPos = this.camera.getWorldPoint(this.pointer);
            const center = { x: taro.game.data.map.width / 2 + 0.5, z: taro.game.data.map.height / 2 + 0.5 };
            taro.input.emit('pointermove', [{ x: (worldPos.x + center.x) * 64, y: (worldPos.z + center.z) * 64 }]);
        }
        for (const sprite of this.animatedSprites) {
            sprite.update(1 / 60);
        }
        this.camera.update();
        this.renderer.render(this.scene, this.camera.instance);
    }
    createAnimations(entity) {
        const cellSheet = entity.cellSheet;
        if (!cellSheet)
            return;
        const key = cellSheet.url;
        const tex = ThreeTextureManager.instance().textureMap.get(key);
        tex.userData.numColumns = cellSheet.columnCount || 1;
        tex.userData.numRows = cellSheet.rowCount || 1;
        tex.userData.key = key;
        // Add animations
        for (let animationsKey in entity.animations) {
            const animation = entity.animations[animationsKey];
            const frames = animation.frames;
            const animationFrames = [];
            // Correction for 0-based indexing
            for (let i = 0; i < frames.length; i++) {
                animationFrames.push(+frames[i] - 1);
            }
            // Avoid crash by giving it frame 0 if no frame data provided
            if (animationFrames.length === 0) {
                animationFrames.push(0);
            }
            if (this.animations.has(`${key}/${animationsKey}`)) {
                this.animations.delete(`${key}/${animationsKey}`);
            }
            this.animations.set(`${key}/${animationsKey}`, {
                frames: animationFrames,
                fps: +animation.framesPerSecond || 15,
                repeat: +animation.loopCount - 1, // correction for loop/repeat values
            });
        }
    }
}
function resizeImageToPowerOf2(image) {
    const ceil = THREE.MathUtils.ceilPowerOfTwo;
    const width = ceil(image.width);
    const height = ceil(image.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height, 0, 0, width, height);
    return canvas;
}
//# sourceMappingURL=ThreeRenderer.js.map