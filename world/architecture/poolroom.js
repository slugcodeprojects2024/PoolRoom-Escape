// world/architecture/poolroom.js — extracted from poolroom-world.js
import * as THREE from 'three';

export const PoolroomMixin = {

createBasicFloor() {
    const roomSize = this.roomSize;
    const poolSize = this.poolWidth;
    
    const tileTexture = this.createTileTexture();
    
    const sideWidth = (roomSize - poolSize) / 2;
    const tileSize = 10;
    
    const floorSections = [
        { 
            geometry: new THREE.PlaneGeometry(roomSize, sideWidth),
            position: [0, 0, -(poolSize/2 + sideWidth/2)],
            repeatX: roomSize / tileSize,
            repeatY: sideWidth / tileSize
        },
        { 
            geometry: new THREE.PlaneGeometry(roomSize, sideWidth),
            position: [0, 0, poolSize/2 + sideWidth/2],
            repeatX: roomSize / tileSize,
            repeatY: sideWidth / tileSize
        },
        { 
            geometry: new THREE.PlaneGeometry(sideWidth, poolSize),
            position: [poolSize/2 + sideWidth/2, 0, 0],
            repeatX: sideWidth / tileSize,
            repeatY: poolSize / tileSize
        },
        { 
            geometry: new THREE.PlaneGeometry(sideWidth, poolSize),
            position: [-(poolSize/2 + sideWidth/2), 0, 0],
            repeatX: sideWidth / tileSize,
            repeatY: poolSize / tileSize
        }
    ];
    
    floorSections.forEach((section, index) => {
        const material = this.materials.floor.clone();
        const floor = new THREE.Mesh(section.geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(...section.position);
        floor.material.map = tileTexture.clone();
        floor.material.map.repeat.set(section.repeatX, section.repeatY);
        floor.material.map.needsUpdate = true;
        this.architectureGroup.add(floor);
    });
    
    console.log('Floor created');
},

createWallPanel(width, height, openings, depth = 6) {
    const shape = new THREE.Shape();
    shape.moveTo(-width/2, 0);
    shape.lineTo( width/2, 0);
    shape.lineTo( width/2, height);
    shape.lineTo(-width/2, height);

    for (const o of openings) {
        const hole = new THREE.Path();
        hole.moveTo(o.x - o.w/2, o.y);
        hole.lineTo(o.x + o.w/2, o.y);
        hole.lineTo(o.x + o.w/2, o.y + o.h);
        hole.lineTo(o.x - o.w/2, o.y + o.h);
        shape.holes.push(hole);
    }

    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geo.translate(0, 0, -depth/2);   // center on its own plane
    return geo;
},

createBasicWalls() {
    const tex = this.createTileTexture();
    tex.repeat.set(1/10, 1/10);   // UVs are in world units → 10 units per tile

    const mat = new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.8, metalness: 0.0, side: THREE.FrontSide
    });

    const R = this.roomSize, H = this.wallHeight;
    const openW = 90, openH = 105, openY = 25, spacing = 170;

    // 5 openings spread across a full-width wall
    const fullOpenings = [-2,-1,0,1,2].map(i => ({ x: i*spacing, y: openY, w: openW, h: openH }));

    const walls = [
        { w: R, openings: fullOpenings, pos: [0, 0,  R/2], rot: 0 },
        { w: R, openings: fullOpenings, pos: [ R/2, 0, 0], rot: -Math.PI/2 },
        { w: R, openings: fullOpenings, pos: [-R/2, 0, 0], rot:  Math.PI/2 }
    ];

    // North wall: two panels flanking the doorway
    const doorW = 100, panelW = (R - doorW) / 2;
    const nearEdge = doorW/2 + panelW/2;
    const northOpenings = [{ x: 0, y: openY, w: openW, h: openH }];
    walls.push({ w: panelW, openings: northOpenings, pos: [-nearEdge, 0, -R/2], rot: 0 });
    walls.push({ w: panelW, openings: northOpenings, pos: [ nearEdge, 0, -R/2], rot: 0 });

    walls.forEach(cfg => {
        const mesh = new THREE.Mesh(this.createWallPanel(cfg.w, H, cfg.openings), mat);
        mesh.position.set(...cfg.pos);
        mesh.rotation.y = cfg.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.architectureGroup.add(mesh);
    });
},

createBasicCeiling() {
    const tileTexture = this.createTileTexture();
    
    const ceilingMaterial = this.materials.ceiling.clone();
    ceilingMaterial.map = tileTexture;
    
    const ceilingY = this.wallHeight;
    const openingSize = this.openingSize;
    const roomSize = this.roomSize;
    const tileSize = 10;
    
    // Simple ceiling with central opening (no stair holes needed)
    const ceilingSections = [
        // North section
        { 
            geometry: new THREE.PlaneGeometry(roomSize, (roomSize - openingSize) / 2),
            position: [0, ceilingY, -roomSize/4 - openingSize/4]
        },
        // South section
        { 
            geometry: new THREE.PlaneGeometry(roomSize, (roomSize - openingSize) / 2),
            position: [0, ceilingY, roomSize/4 + openingSize/4]
        },
        // East section
        { 
            geometry: new THREE.PlaneGeometry((roomSize - openingSize) / 2, openingSize),
            position: [roomSize/4 + openingSize/4, ceilingY, 0]
        },
        // West section
        { 
            geometry: new THREE.PlaneGeometry((roomSize - openingSize) / 2, openingSize),
            position: [-roomSize/4 - openingSize/4, ceilingY, 0]
        }
    ];
    
    ceilingSections.forEach(section => {
        const ceiling = new THREE.Mesh(section.geometry, ceilingMaterial.clone());
        ceiling.rotation.x = Math.PI / 2; // normal faces -Y (into the room)
        ceiling.position.set(...section.position);
        // DoubleSide plane + castShadow self-shadows the whole underside
        ceiling.userData.noCast = true;
        const width = section.geometry.parameters.width;
        const height = section.geometry.parameters.height;
        ceiling.material.map = ceiling.material.map.clone();
        ceiling.material.map.repeat.set(width / tileSize, height / tileSize);
        ceiling.material.map.needsUpdate = true;
        this.architectureGroup.add(ceiling);
    });
    
    console.log('Simple ceiling with central opening created');
},

createBasicPool() {
    // Materials that sit below the waterline get caustics injected by WaterSystem
    this.poolSurfaceMaterials = [];

    let poolBottomMaterial;
    if (this.textures && this.textures.stoneBricks) {
        const tex = this.textures.stoneBricks.clone();
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(8, 8);
        tex.needsUpdate = true;
        poolBottomMaterial = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.0, side: THREE.FrontSide });
    } else {
        poolBottomMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0.0, side: THREE.FrontSide });
    }
    this.poolSurfaceMaterials.push(poolBottomMaterial);

    const poolBottom = new THREE.Mesh(
        new THREE.PlaneGeometry(this.poolWidth, this.poolDepth),
        poolBottomMaterial
    );
    poolBottom.rotation.x = -Math.PI / 2;
    poolBottom.position.y = -this.poolDepthValue;
    this.poolGroup.add(poolBottom);
    this.poolBottomMesh = poolBottom;

    let wallMat;
    if (this.textures && this.textures.stoneBricks) {
        const wallTex = this.textures.stoneBricks.clone();
        wallTex.wrapS = THREE.RepeatWrapping;
        wallTex.wrapT = THREE.RepeatWrapping;
        wallTex.repeat.set(8, 2);
        wallTex.needsUpdate = true;
        wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.0, side: THREE.FrontSide });
    } else {
        wallMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, side: THREE.FrontSide });
    }

    const wallH = this.poolDepthValue;
    const wallDefs = [
        { w: this.poolWidth, pos: [0, -wallH/2, -this.poolDepth/2], rotY: 0 },
        { w: this.poolWidth, pos: [0, -wallH/2, this.poolDepth/2], rotY: Math.PI },
        { w: this.poolDepth, pos: [this.poolWidth/2, -wallH/2, 0], rotY: -Math.PI/2 },
        { w: this.poolDepth, pos: [-this.poolWidth/2, -wallH/2, 0], rotY: Math.PI/2 }
    ];
    wallDefs.forEach(def => {
        // Each wall owns its material clone, so each needs registering for caustics
        const mat = wallMat.clone();
        this.poolSurfaceMaterials.push(mat);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.w, wallH), mat);
        mesh.position.set(...def.pos);
        mesh.rotation.y = def.rotY;
        this.poolGroup.add(mesh);
    });

    const edgeHeight = 0.2;
    const edgeWidth = 2;
    const edges = [
        { pos: [0, edgeHeight/2, -this.poolDepth/2 - edgeWidth/2], size: [this.poolWidth + edgeWidth*2, edgeHeight, edgeWidth] },
        { pos: [0, edgeHeight/2, this.poolDepth/2 + edgeWidth/2], size: [this.poolWidth + edgeWidth*2, edgeHeight, edgeWidth] },
        { pos: [this.poolWidth/2 + edgeWidth/2, edgeHeight/2, 0], size: [edgeWidth, edgeHeight, this.poolDepth] },
        { pos: [-this.poolWidth/2 - edgeWidth/2, edgeHeight/2, 0], size: [edgeWidth, edgeHeight, this.poolDepth] }
    ];
    edges.forEach(edge => {
        const edgeGeometry = new THREE.BoxGeometry(...edge.size);
        const edgeMesh = new THREE.Mesh(edgeGeometry, this.materials.floor);
        edgeMesh.position.set(...edge.pos);
        this.poolGroup.add(edgeMesh);
    });
    console.log('Pool created');
},

createBasicPillars() {
    const pillarRadius = 8;
    const pillarHeight = this.wallHeight + this.poolDepthValue;
    
    const positions = [
        [-180, 0, -180],
        [180, 0, -180],
        [-180, 0, 180],
        [180, 0, 180]
    ];
    
    positions.forEach(pos => {
        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarHeight, 12),
            this.materials.pillar
        );
        pillar.position.set(pos[0], (pillarHeight/2) - this.poolDepthValue, pos[2]);
        this.architectureGroup.add(pillar);
    });
    
    console.log('Pillars created');
},

createDoor() {
    console.log('🚪 Creating door...');
    
    const doorWidth = 100; // Match the wall opening width
    const doorHeight = 120;
    const doorThickness = 5;
    const doorOffset = 0; // CENTER THE DOOR
    
    // Door frame
    const frameGeometry = new THREE.BoxGeometry(doorWidth + 10, doorHeight + 10, doorThickness + 2);
    const frame = new THREE.Mesh(frameGeometry, this.materials.wall);
    frame.position.set(doorOffset, doorHeight/2, -this.roomSize/2 + 1);
    this.architectureGroup.add(frame);
    
    // Door itself
    const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
    const door = new THREE.Mesh(doorGeometry, this.materials.door);
    door.position.set(doorOffset, doorHeight/2, -this.roomSize/2);
    this.architectureGroup.add(door);
    
    console.log('✅ Door created and centered');
}

};