// world/materials.js — extracted from poolroom-world.js
import * as THREE from 'three';

export const MaterialMixin = {

createTexturedMaterials() {
    if (this.textures) {
        const pillarTexture = this.textures.darkPrismarine.clone();
        pillarTexture.repeat.set(2, 8);
        pillarTexture.wrapS = THREE.RepeatWrapping;
        pillarTexture.wrapT = THREE.RepeatWrapping;
        pillarTexture.magFilter = THREE.LinearFilter;
        pillarTexture.minFilter = THREE.LinearMipMapLinearFilter;
        pillarTexture.generateMipmaps = true;
        pillarTexture.needsUpdate = true;
        
        this.materials = {
            floor: new THREE.MeshStandardMaterial({
                color: 0xf0f0f0,
                roughness: 0.7, metalness: 0.0,
                side: THREE.DoubleSide
            }),
            wall: new THREE.MeshStandardMaterial({
                color: 0xf0f0f0,
                roughness: 0.7, metalness: 0.0,
                side: THREE.DoubleSide
            }),
            ceiling: new THREE.MeshStandardMaterial({
                color: 0xf0f0f0,
                roughness: 0.7, metalness: 0.0,
                side: THREE.FrontSide
            }),
            pool: new THREE.MeshStandardMaterial({
                color: 0xb0d0ff,
                roughness: 0.25, metalness: 0.0,
                side: THREE.DoubleSide
            }),
            pillar: new THREE.MeshStandardMaterial({
                map: pillarTexture,
                roughness: 0.5, metalness: 0.0
            }),
            // NEW: Temple materials
            temple: new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.35, metalness: 0.0,
                side: THREE.DoubleSide
            }),
            vaporwave: new THREE.MeshStandardMaterial({
                color: 0xff69b4, // Hot pink
                roughness: 0.25, metalness: 0.0,
                emissive: 0x330066, // Purple glow
                side: THREE.DoubleSide
            }),
            door: new THREE.MeshStandardMaterial({
                color: 0x8b4513,
                roughness: 0.8, metalness: 0.0,
                side: THREE.DoubleSide
            }),
            templeFloor: new THREE.MeshStandardMaterial({
                map: this.textures.templeFloor,
                roughness: 0.6, metalness: 0.0,
                side: THREE.DoubleSide
            }),
            grottoWood: new THREE.MeshStandardMaterial({
                map: this.textures.wood,
                roughness: 0.8, metalness: 0.0,
                side: THREE.DoubleSide
            }),
            stoneColumn: new THREE.MeshStandardMaterial({
                map: this.textures.stone,
                roughness: 0.7, metalness: 0.0,
                side: THREE.DoubleSide
            })
        };
        
        console.log('Materials created with temple elements');
    } else {
        this.createBasicMaterials();
    }
},

createBasicMaterials() {
    this.materials = {
        floor: new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide }),
        wall: new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide }),
        ceiling: new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.7, metalness: 0.0, side: THREE.FrontSide }),
        pool: new THREE.MeshStandardMaterial({ color: 0xb0d0ff, roughness: 0.25, metalness: 0.0, side: THREE.DoubleSide }),
        pillar: new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.5, metalness: 0.0 }),
        temple: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.0, side: THREE.DoubleSide }),
        vaporwave: new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.25, metalness: 0.0, side: THREE.DoubleSide }),
        door: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide })
    };
}

};