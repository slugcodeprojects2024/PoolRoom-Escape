// world/textures.js — extracted from poolroom-world.js
import * as THREE from 'three';

export const TextureMixin = {

async loadTextures() {
    this.textureLoader = new THREE.TextureLoader();
    this.textures = {};
    
    try {
        console.log('🔄 Loading textures...');
        
        this.textures.endStoneBricks = await new Promise((resolve, reject) => {
            this.textureLoader.load(
                'textures/end_stone_bricks.png',
                (texture) => {
                    console.log('✅ End stone bricks loaded');
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.warn('❌ Failed to load end_stone_bricks.png:', error);
                    reject(error);
                }
            );
        });
        
        this.textures.darkPrismarine = await new Promise((resolve, reject) => {
            this.textureLoader.load(
                'textures/dark_prismarine.png',
                (texture) => {
                    console.log('✅ Dark prismarine loaded');
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.warn('❌ Failed to load dark_prismarine.png:', error);
                    reject(error);
                }
            );
        });
        
        // NEW: Load stone_bricks.png for pool bottom
        this.textures.stoneBricks = await new Promise((resolve, reject) => {
            this.textureLoader.load(
                'textures/stone_bricks.png',
                (texture) => {
                    console.log('✅ Stone bricks loaded');
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.warn('❌ Failed to load stone_bricks.png:', error);
                    reject(error);
                }
            );
        });
        
        // Load temple_floor.png
        this.textures.templeFloor = await new Promise((resolve, reject) => {
            this.textureLoader.load(
                'textures/temple_floor.png',
                (texture) => { resolve(texture); },
                undefined,
                (error) => { reject(error); }
            );
        });
        
        // Load wood.jpg
        this.textures.wood = await new Promise((resolve, reject) => {
            this.textureLoader.load(
                'textures/wood.jpg',
                (texture) => { resolve(texture); },
                undefined,
                (error) => { reject(error); }
            );
        });
        
        // Load stone.jpg
        this.textures.stone = await new Promise((resolve, reject) => {
            this.textureLoader.load(
                'textures/stone.jpg',
                (texture) => { resolve(texture); },
                undefined,
                (error) => { reject(error); }
            );
        });
        
        Object.values(this.textures).forEach(texture => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = 16;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearMipMapLinearFilter;
            texture.generateMipmaps = true;
            texture.needsUpdate = true;
        });
        
        console.log('✅ All textures loaded and configured successfully');
        
    } catch (error) {
        console.warn('⚠️ Could not load textures, using fallback colors:', error);
        this.textures = null;
    }
},

createTileTexture(px = 256, tiles = 4, line = 3, bg = '#f5f5f0', grout = '#cccccc') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = px;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, px, px);
    ctx.strokeStyle = grout;
    ctx.lineWidth = line;
    const step = px / tiles;
    for (let i = 0; i <= tiles; i++) {
        const p = i * step;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, px); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(px, p); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 16;
    return tex;
}

};