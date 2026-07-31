import * as THREE from 'three';
// water-system.js - Simple Water System (NO FLOATING OBJECTS)
export class WaterSystem {
    constructor(scene) {
        this.scene = scene;
        this.waterGroup = new THREE.Group();
        scene.add(this.waterGroup);
    }
    
    init() {
        console.log('💧 Creating simple water surface...');
        this.createSimpleWater();
        console.log('✅ Simple water system ready');
    }
    
    async createSimpleWater() {
        // Simple water surface - matches the 480x480 pool
        const waterGeometry = new THREE.PlaneGeometry(480, 480);
        let waterMaterial;
        let normalMap = null;
        let waterTexture = null;
        try {
            waterTexture = await new Promise((resolve, reject) => {
                new THREE.TextureLoader().load('textures/water.jpg', resolve, undefined, () => resolve(null));
            });
            if (waterTexture) {
                waterTexture.wrapS = THREE.RepeatWrapping;
                waterTexture.wrapT = THREE.RepeatWrapping;
                waterTexture.repeat.set(2, 2); // Repeat to fit pool size
                waterTexture.needsUpdate = true;
            }
        } catch (e) { waterTexture = null; }
        try {
            normalMap = await new Promise((resolve, reject) => {
                new THREE.TextureLoader().load('textures/water-normal.jpg', resolve, undefined, () => resolve(null));
            });
        } catch (e) { normalMap = null; }
        waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x4488cc,
            map: waterTexture || undefined,
            transparent: true,
            opacity: 0.7,
            roughness: 0.15, metalness: 0.0,
            specular: 0xffffff,
            normalMap: normalMap || undefined,
            normalScale: normalMap ? new THREE.Vector2(1, 1) : undefined
        });
        this.waterSurface = new THREE.Mesh(waterGeometry, waterMaterial);
        this.waterSurface.rotation.x = -Math.PI / 2;
        this.waterSurface.position.y = -0.5; // Just slightly below floor level for visibility
        this.waterGroup.add(this.waterSurface);
        this.waterNormalMap = normalMap;
        this.waterTexture = waterTexture;
        console.log('🌊 Enhanced water surface created with water.jpg');
    }
    
    update(deltaTime) {
        // Simple color animation
        if (this.waterSurface) {
            const time = Date.now() * 0.001;
            this.waterSurface.material.color.setHSL(0.55, 0.8, 0.4 + Math.sin(time) * 0.1);
            // Animate normal map offset for moving water effect
            if (this.waterNormalMap) {
                this.waterNormalMap.offset.x = (time * 0.05) % 1;
                this.waterNormalMap.offset.y = (time * 0.07) % 1;
                this.waterNormalMap.needsUpdate = true;
            }
        }
    }
    
    isInWater(position) {
        return position.y < -0.5 && 
               Math.abs(position.x) < 240 && 
               Math.abs(position.z) < 240;
    }
}