// collectibles-manager.js - GLB Collectibles
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { TextureLoader } from 'three';

export class CollectiblesManager {
    constructor(scene) {
        this.scene = scene;
        this.collectibles = [];
        this.collected = 0;
        this.totalCount = 0;
        this.models = [
            'cornellbox-empty-co.glb',
            'eyeball.glb',
            'trumpet.glb',
            'dragon.glb',
            'bunny.glb',
            'teapot.glb',
            'moon-2k.glb'
        ];
        this.loader = new GLTFLoader();
        this.loader.setMeshoptDecoder(MeshoptDecoder);
        this.spawnRadius = 400; // Stay within main room
        this.texture = null;
        this.stoneTexture = null;
    }

    async init() {
        // Load glass.jpg and stone.jpg textures once
        if (!this.texture) {
            this.texture = await new Promise((resolve, reject) => {
                new TextureLoader().load('textures/glass.jpg', resolve, undefined, reject);
            });
        }
        if (!this.stoneTexture) {
            this.stoneTexture = await new Promise((resolve, reject) => {
                new TextureLoader().load('textures/stone.jpg', resolve, undefined, reject);
            });
        }
        this.collected = 0;
        this.collectibles = [];
        this.totalCount = this.models.length;
        const totalCollectibles = this.models.length;
        for (let i = 0; i < totalCollectibles; i++) {
            const model = this.models[i % this.models.length];
            const obj = await this.loadOBJ(model);
            // Normalize scale: fit largest dimension to target size
            const box = new THREE.Box3().setFromObject(obj);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 16; // All collectibles will fit within 16 units
            const scale = targetSize / (maxDim || 1);
            obj.scale.setScalar(scale);
            // Poolroom area (avoid pool center)
            let pos;
            let tries = 0;
            do {
                pos = new THREE.Vector3(
                    (Math.random() - 0.5) * this.spawnRadius * 2,
                    8 + Math.random() * 10,
                    (Math.random() - 0.5) * this.spawnRadius * 2
                );
                tries++;
            } while (Math.abs(pos.x) < 120 && Math.abs(pos.z) < 120 && tries < 10); // avoid pool
            obj.position.copy(pos);
            obj.userData.isCollectible = true;
            obj.userData.collected = false;
            // Apply glass.jpg texture to all meshes
            obj.traverse(child => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                        map: this.texture,
                        shininess: 80
                    });
                }
            });
            this.scene.add(obj);
            this.collectibles.push(obj);
        }
        this.totalCount = this.collectibles.length;
        console.log('✅ Collectibles placed:', this.collectibles.length);
    }

    loadOBJ(filename) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                (filename.startsWith('models/') ? filename : 'models/' + filename),
                (gltf) => {
                    const object = gltf.scene;
                    // Optionally set material
                    object.traverse(child => {
                        if (child.isMesh) {
                            const isHead = filename.endsWith('head.glb');
                            if (this.stoneTexture && isHead) {
                                child.material = new THREE.MeshPhongMaterial({
                                    map: this.stoneTexture,
                                    shininess: 80
                                });
                                console.log('Applied stone.jpg texture to head.glb');
                            } else if (this.texture && this.models.includes(filename.replace('models/', ''))) {
                                child.material = new THREE.MeshPhongMaterial({
                                    map: this.texture,
                                    shininess: 80
                                });
                            } else {
                                child.material = new THREE.MeshPhongMaterial({ color: 0xffff00, shininess: 80 });
                            }
                        }
                    });
                    resolve(object);
                },
                undefined,
                (err) => reject(err)
            );
        });
    }

    update(deltaTime, cameraPosition) {
        // Check for collection
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const obj = this.collectibles[i];
            if (!obj.userData.collected && obj.position.distanceTo(cameraPosition) < 30) {
                obj.userData.collected = true;
                this.scene.remove(obj);
                this.collectibles.splice(i, 1);
                this.collected++;
                // Optionally play sound or effect here
                // Show message if all collected
                if (this.collected === this.totalCount) {
                    this.showAllCollectedMessage();
                }
            }
        }
        // Rotate collectibles
        this.collectibles.forEach(obj => {
            obj.rotation.y += 0.01 * deltaTime;
        });
    }

    getCollectedCount() { return this.collected; }
    getTotalCount() { return this.totalCount; }

    showAllCollectedMessage() {
        const msg = document.createElement('div');
        msg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.85);
            color: #fff;
            padding: 32px 48px;
            border-radius: 16px;
            font-size: 2rem;
            font-weight: bold;
            z-index: 10000;
            text-align: center;
        `;
        msg.innerHTML = '🎉 All collectibles found! 🎉<br>Congratulations!';
        document.body.appendChild(msg);
        setTimeout(() => {
            if (msg.parentNode) msg.parentNode.removeChild(msg);
        }, 4000);
    }
}