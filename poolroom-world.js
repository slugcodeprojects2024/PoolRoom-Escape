// poolroom-world.js — world orchestrator
//
// Behaviour lives in mixin modules under ./world/. They are merged onto the
// prototype below, so every method keeps the same `this` and the same name it
// had when this file was 1,200 lines. This split is for maintainability, not
// speed — Vite bundles to identical output either way.
import * as THREE from 'three';

import { TextureMixin }   from './world/textures.js';
import { MaterialMixin }  from './world/materials.js';
import { LightingMixin }  from './world/lighting.js';
import { BoundsMixin }    from './world/bounds.js';
import { AnimationMixin } from './world/animation.js';
import { PoolroomMixin }  from './world/architecture/poolroom.js';
import { ExteriorMixin }  from './world/architecture/exterior.js';
import { TempleMixin }    from './world/architecture/temple.js';

export class PoolroomWorld {
    constructor(scene) {
        this.scene = scene;
        this.materials = {};
        
        // Main poolroom dimensions
        this.roomSize = 960;
        this.wallHeight = 150;
        this.poolWidth = 480;
        this.poolDepth = 480;
        this.poolDepthValue = 90;
        this.openingSize = 240;
        // Shared by Sky sunPosition and DirectionalLight — animate this in endgame
        this.sunDirection = new THREE.Vector3(420, 520, 300);
        
        // NEW: Walkway and temple dimensions - EXPANDED
        this.walkwayLength = 800;    // DOUBLED from 400
        this.walkwayWidth = 80;
        this.templeSize = 960;       // SAME SIZE AS POOLROOM
        this.grottoPoolSize = 120;
        this.artGallerySize = 400;   // NEW: Art gallery wing
        
        // Groups
        this.architectureGroup = new THREE.Group();
        this.poolGroup = new THREE.Group();
        this.walkwayGroup = new THREE.Group();
        this.templeGroup = new THREE.Group();
        
        scene.add(this.architectureGroup);
        scene.add(this.poolGroup);
        scene.add(this.walkwayGroup);
        scene.add(this.templeGroup);

        // Store references for lighting controls
        this.ambientLight = null;
        this.sunLight = null;
        this.lastColorChange = 0;
        this.colorLerpTime = 4.0; // seconds for each transition
        this.colorLerpElapsed = 0;
        this.galleryShapeColors = [
            { from: new THREE.Color(0x4B9CD3), to: new THREE.Color(0xE94F37) },
            { from: new THREE.Color(0xE94F37), to: new THREE.Color(0x43B047) },
            { from: new THREE.Color(0x43B047), to: new THREE.Color(0xF7C948) },
            { from: new THREE.Color(0xF7C948), to: new THREE.Color(0x4B9CD3) }
        ];
    }

    async init() {
        console.log('🏗️ Creating single-story poolroom with temple...');
        
        await this.loadTextures();
        this.createTexturedMaterials();
        await this.createBasicSkybox();
        this.createGameWorldBackground();
        this.setupLighting();
        
        // Main poolroom
        this.createBasicFloor();
        this.createBasicWalls();
        this.createBasicCeiling();
        this.createBasicPool();
        this.createBasicPillars();
        
        // NEW: Door, walkway, and temple
        // this.createDoor(); // COMMENTED OUT: Door is disabled for now
        this.createWalkway();
        this.createTempleArea();
        this.createGrottoPool();
        
        console.log('✅ Single-story poolroom with temple complete');
    }

    update() {
        // Keep third light sphere and helper at light position
        if (this.thirdLight && this.thirdLightSphere) {
            this.thirdLightSphere.position.copy(this.thirdLight.position);
            if (this.thirdLightHelper) {
                this.thirdLightHelper.update();
            }
        }
    }
}

Object.assign(
    PoolroomWorld.prototype,
    TextureMixin,
    MaterialMixin,
    LightingMixin,
    BoundsMixin,
    AnimationMixin,
    PoolroomMixin,
    ExteriorMixin,
    TempleMixin
);