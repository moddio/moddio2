namespace Renderer {
	export namespace Three {
		export type AssetSource = {
			name: string;
			type: 'gltf' | 'texture';
			src: string;
		};

		export type GLTF = {
			animations: THREE.AnimationClip[];
			scene: THREE.Group;
			scenes: THREE.Group[];
			cameras: THREE.Camera[];
			asset: Object;
		};

		export type Asset = THREE.Texture | GLTF;

		class AssetManager {
			filter: typeof THREE.LinearFilter | typeof THREE.NearestFilter = THREE.LinearFilter;

			private assets: Map<string, Asset> = new Map();
			private textures: Map<string, THREE.Texture> = new Map();
			private loaders: Map<string, THREE.Loader> = new Map();

			constructor() {
				const dracoLoader = new DRACOLoader();
				dracoLoader.setDecoderPath('/assets/lib/draco');

				const gltfLoader = new GLTFLoader();
				gltfLoader.setDRACOLoader(dracoLoader);

				this.loaders.set('gltf', gltfLoader);
				this.loaders.set('texture', new THREE.TextureLoader());

				this.load([{ name: 'placeholderTexture', type: 'texture', src: '/assets/images/placeholder-texture.jpg' }]);

				const geometry = new THREE.BoxGeometry(1, 1, 1);
				const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
				const scene = new THREE.Group();
				scene.add(new THREE.Mesh(geometry, material));
				const placeholderModel = {
					animations: [],
					scene: scene,
					scenes: [scene],
					cameras: [],
					asset: {},
				} as GLTF;
				this.assets.set('placeholderModel', placeholderModel);
			}

			setFilter(filter: typeof THREE.LinearFilter | typeof THREE.NearestFilter) {
				this.filter = filter;
			}

			load(sources: AssetSource[], loadingManager?: THREE.LoadingManager, cb?: (name: string) => void) {
				for (const source of sources) {
					const loader = this.loaders.get(source.type);
					if (loader) {
						loader.manager = loadingManager ?? THREE.DefaultLoadingManager;

						loader.load(source.src, (asset: Asset) => {
							if (source.type === 'texture') {
								(asset as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
								(asset as THREE.Texture).magFilter = this.filter;
								this.textures.set(source.name, asset as THREE.Texture);
							}

							if (source.type === 'gltf') {
								(asset as GLTF).scene.traverse((child) => {
									if (child instanceof THREE.Mesh) {
										// Convert to basic material to avoid lighting
										const material = new THREE.MeshBasicMaterial();
										THREE.MeshBasicMaterial.prototype.copy.call(material, child.material);

										if (material.map) {
											material.map.magFilter = this.filter;
										}

										child.material = material;
									}
								});
							}

							this.assets.set(source.name, asset);

							if (cb) cb(source.name);
						});
					}
				}
			}

			getTexture(name: string) {
				const placeholderTex = this.textures.get('placeholderTexture');
				return (this.textures.get(name) as THREE.Texture) || placeholderTex;
			}

			getTextureWithoutPlaceholder(name: string) {
				return this.textures.get(name) as THREE.Texture;
			}

			getTexturesContaining(name: string) {
				const textures: THREE.Texture[] = [];
				for (const [key, value] of this.textures) {
					if (key.includes(name) && value instanceof THREE.Texture) {
						textures.push(value);
					}
				}
				return textures;
			}

			getModel(name: string) {
				const placeholderModel = this.assets.get('placeholderModel') as GLTF;
				return (this.assets.get(name) as GLTF) || placeholderModel;
			}
		}

		export const gAssetManager = new AssetManager();
	}
}
