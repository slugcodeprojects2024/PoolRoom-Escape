// world/architecture/temple.js — extracted from poolroom-world.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const TempleMixin = {

createTempleArea() {
    console.log('🏛️ Creating refactored Greco-Roman temple complex...');
    const templeZ = -this.roomSize/2 - this.walkwayLength - this.templeSize/2;
    // Main temple floor
    const templeFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(this.templeSize, this.templeSize),
        this.materials.templeFloor
    );
    templeFloor.rotation.x = -Math.PI / 2;
    templeFloor.position.set(0, 0, templeZ);
    this.templeGroup.add(templeFloor);
    
    // Perimeter walls (with wide north opening)
    this.createTempleWallsRefactored(templeZ);

    // Main altar (centered)
    this.createTempleAltar(templeZ);

    // Portal arches to wings
    this.createPortalArch(-this.templeSize/2 + 10, 0, templeZ, 'west'); // to grotto
    this.createPortalArch(this.templeSize/2 - 10, 0, templeZ, 'east'); // to gallery

    // Grotto (west wing)
    this.createTempleGrottoAreaRefactored(templeZ);
    // Gallery (east wing)
    this.createArtGalleryWingRefactored(templeZ);

    // Main colonnade around temple
    this.createMainTempleColumnsRefactored(templeZ);

    // Lighting
    this.createVaporwaveLighting(templeZ);
    this.createTorchLights(templeZ);

    // Classic Greek exterior facade (single row colonnade front and back)
    this.createGreekTempleFacade(templeZ);

    // Load the head.glb in the center of the temple
    this.loadTempleHeadModel();

    console.log('✅ Refactored temple complex created');
},

createGreekTempleFacade(templeZ) {
    // Front columns - positioned well inside the temple floor (much further back)
    const colZFront = templeZ - this.templeSize/2 + 200; // Move much further inward from front edge
    for (let x = -400; x <= 400; x += 80) {
        this.createTempleColumn(x, 0, colZFront);
    }
    
    // Back columns - 
    const colZBack = templeZ + this.templeSize/2 - 650; // Back to original position closer to back edge
    for (let x = -400; x <= 400; x += 80) {
        this.createTempleColumn(x, 0, colZBack);
    }
},

createTempleWallsRefactored(templeZ) {
    // No walls: leave the temple open, only columns will define the space
},

createPortalArch(x, y, z, dir) {
    // Removed: no portal arches
},

createMainTempleColumnsRefactored(templeZ) {
    // Perimeter colonnade
    const colDist = this.templeSize/2 - 40;
    for (let x = -colDist; x <= colDist; x += 100) {
        this.createTempleColumn(x, 0, templeZ - colDist);
        this.createTempleColumn(x, 0, templeZ + colDist);
    }
    for (let z = -colDist + 100; z <= colDist - 100; z += 100) {
        this.createTempleColumn(-colDist, 0, templeZ + z);
        this.createTempleColumn(colDist, 0, templeZ + z);
    }
},

createTempleGrottoAreaRefactored(templeZ) {
    // Grotto in west wing, more organic
    const grottoX = -this.templeSize/2 - 120;
    const grottoZ = templeZ;
    
    // Grotto floor
    const grottoFloor = new THREE.Mesh(
        new THREE.CircleGeometry(120, 24),
        this.materials.vaporwave
    );
    grottoFloor.rotation.x = -Math.PI / 2;
    grottoFloor.position.set(grottoX, -8, grottoZ);
    this.templeGroup.add(grottoFloor);
    
    // Grotto pool (deeper) with glowing material
    const grottoPoolMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff, // Cyan color
        emissive: 0x0088ff, // Blue glow
        emissiveIntensity: 0.5,
        roughness: 0.25, metalness: 0.0,
        transparent: true,
        opacity: 0.8
    });
    
    const grottoPool = new THREE.Mesh(
        new THREE.CylinderGeometry(60, 60, 24, 24),
        grottoPoolMaterial
    );
    grottoPool.position.set(grottoX, -20, grottoZ);
    this.templeGroup.add(grottoPool);
    
    // Rocks
    for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const r = 90 + Math.random() * 30;
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(10 + Math.random() * 8),
            this.materials.temple
        );
        rock.position.set(
            grottoX + Math.cos(angle) * r,
            -2 + Math.random() * 8,
            grottoZ + Math.sin(angle) * r
        );
        this.templeGroup.add(rock);
    }
    
    // Grotto columns with point lights
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        this.createGrottoColumn(
            grottoX + Math.cos(angle) * 75,
            0,
            grottoZ + Math.sin(angle) * 75
        );
    }
},

createArtGalleryWingRefactored(templeZ) {
    // Gallery in east wing
    const galleryX = this.templeSize/2 + 120;
    const galleryZ = templeZ;
    // Gallery floor
    const galleryFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(this.artGallerySize, this.artGallerySize),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.0, reflectivity: 0.5 })
    );
    galleryFloor.rotation.x = -Math.PI / 2;
    galleryFloor.position.set(galleryX, 0, galleryZ);
    galleryFloor.receiveShadow = true;
    this.templeGroup.add(galleryFloor);

    // Add a reflective ground plane (if Reflector is available)
    if (typeof THREE.Reflector !== 'undefined') {
        const reflector = new THREE.Reflector(
            new THREE.PlaneGeometry(this.artGallerySize, this.artGallerySize),
            {
                color: 0x888888,
                textureWidth: 1024,
                textureHeight: 1024,
                clipBias: 0.003,
                recursion: 1
            }
        );
        reflector.rotation.x = -Math.PI / 2;
        reflector.position.set(galleryX, 0.01, galleryZ);
        this.templeGroup.add(reflector);
    }

    // Add geometric shapes in a row, spaced apart
    const y = 40; // Height for all shapes
    const spacing = 70;
    // Cylinder
    this.galleryCylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(25, 25, 80, 32),
        new THREE.MeshStandardMaterial({ color: 0x4B9CD3 }) // Blue
    );
    this.galleryCylinder.position.set(galleryX - spacing * 1.5, y, galleryZ);
    this.galleryCylinder.castShadow = true;
    this.templeGroup.add(this.galleryCylinder);
    // Sphere
    this.gallerySphere = new THREE.Mesh(
        new THREE.SphereGeometry(32, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xE94F37 }) // Red-Orange
    );
    this.gallerySphere.position.set(galleryX - spacing * 0.5, y + 8, galleryZ);
    this.gallerySphere.castShadow = true;
    this.templeGroup.add(this.gallerySphere);
    // Cube
    this.galleryCube = new THREE.Mesh(
        new THREE.BoxGeometry(60, 60, 60),
        new THREE.MeshStandardMaterial({ color: 0x43B047 }) // Green
    );
    this.galleryCube.position.set(galleryX + spacing * 0.7, y + 10, galleryZ);
    this.galleryCube.castShadow = true;
    this.templeGroup.add(this.galleryCube);
    // Cone (for triangle)
    this.galleryCone = new THREE.Mesh(
        new THREE.ConeGeometry(30, 90, 32),
        new THREE.MeshStandardMaterial({ color: 0xF7C948 }) // Yellow
    );
    this.galleryCone.position.set(galleryX + spacing * 1.8, y + 15, galleryZ);
    this.galleryCone.castShadow = true;
    this.templeGroup.add(this.galleryCone);
},

createTempleColumn(x, baseY, z) {
    // Column base
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(8, 10, 6, 8),
        this.materials.stoneColumn ? this.materials.stoneColumn : this.materials.temple
    );
    base.position.set(x, baseY + 3, z);
    this.templeGroup.add(base);
    // Column shaft
    const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 6, 40, 8),
        this.materials.stoneColumn ? this.materials.stoneColumn : this.materials.vaporwave
    );
    shaft.position.set(x, baseY + 26, z);
    this.templeGroup.add(shaft);
    // Column capital
    const capital = new THREE.Mesh(
        new THREE.CylinderGeometry(10, 8, 6, 8),
        this.materials.stoneColumn ? this.materials.stoneColumn : this.materials.temple
    );
    capital.position.set(x, baseY + 49, z);
    this.templeGroup.add(capital);
},

createGrottoColumn(x, baseY, z) {
    // More organic, twisted column for grotto area
    const segments = 8;
    let lastSegment = null;
    for (let i = 0; i < segments; i++) {
        const segmentHeight = 6;
        const twist = (i / segments) * Math.PI * 0.5;
        const radius = 8 + Math.sin(i * 0.5) * 2;
        // Use the original textured material only
        let mat = this.materials.grottoWood ? this.materials.grottoWood.clone() : this.materials.vaporwave.clone();
        const segment = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius + 1, segmentHeight, 8),
            mat
        );
        segment.position.set(
            x + Math.cos(twist) * 2,
            baseY + 3 + i * segmentHeight,
            z + Math.sin(twist) * 2
        );
        segment.rotation.y = twist;
        this.templeGroup.add(segment);
        lastSegment = segment;
    }
    // No point light or red emissive
},

createTempleAltar(templeZ) {
    // Central raised altar area
    const altarPlatform = new THREE.Mesh(
        new THREE.CylinderGeometry(80, 90, 8, 12),
        this.materials.stoneColumn
    );
    altarPlatform.position.set(0, 4, templeZ);
    this.templeGroup.add(altarPlatform);
    
    // Altar itself
    const altar = new THREE.Mesh(
        new THREE.BoxGeometry(40, 20, 20),
        this.materials.stoneColumn
    );
    altar.position.set(0, 18, templeZ);
    this.templeGroup.add(altar);
    
    // Decorative braziers around altar
    this.altarLights = [];
    this.altarCubes = [];
    this.altarSpotLights = [];
    
    // Define coneMat for all cones with higher shininess
    const coneMat = new THREE.MeshStandardMaterial({ 
        color: 0xff69b4, 
        roughness: 0.25, metalness: 0.0,
        specular: 0xffffff
    });
    
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 90;
        const altarY = 18;
        const fixtureY = altarY + 38;
        const x = Math.cos(angle) * radius;
        const y = fixtureY;
        const z = templeZ + Math.sin(angle) * radius;
        
        // Brazier
        const brazier = new THREE.Mesh(
            new THREE.CylinderGeometry(8, 12, 20, 8),
            this.materials.stoneColumn
        );
        brazier.position.set(x, altarY, z);
        this.templeGroup.add(brazier);
        
        // Spotlight fixture cone
        const coneGeometry = new THREE.ConeGeometry(7, 32, 32);
        coneGeometry.rotateX(-Math.PI / 2);
        const cone = new THREE.Mesh(coneGeometry, coneMat);
        cone.position.set(x, y, z);
        const headPos = new THREE.Vector3(0, 70, templeZ);
        cone.lookAt(headPos);
        cone.castShadow = true;
        this.templeGroup.add(cone);
        this.altarCubes[i] = cone;
        // Add SpotLight at the tip of the cone, aimed at the head
        const spotLight = new THREE.SpotLight(0xff69b4, 6, 400, Math.PI / 8, 0.4, 1.2);
        spotLight.position.copy(cone.position);
        spotLight.target.position.set(0, 70, templeZ);
        spotLight.castShadow = false;
        this.scene.add(spotLight);
        this.scene.add(spotLight.target);
        this.altarSpotLights[i] = spotLight;
    }
},

createGrottoPool() {
    // This is now handled in createTempleGrottoArea()
    console.log('✅ Grotto pool integrated into temple complex');
},

async loadTempleHeadModel() {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load('models/head.glb', (gltf) => {
        const object = gltf.scene;
        object.traverse(child => {
            if (!child.isMesh) return;
            if (child.geometry.center) child.geometry.center();
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = new THREE.MeshStandardMaterial({
                color: child.material.color, roughness: 0.25, metalness: 0.0,
                specular: 0xffffff, map: child.material.map
            });
        });
        object.scale.set(2.5, 2.5, 2.5);
        object.position.set(0, 70, this.getTempleBounds().z);
        this.templeGroup.add(object);
    }, undefined, (e) => console.error('head.glb:', e));
}

};