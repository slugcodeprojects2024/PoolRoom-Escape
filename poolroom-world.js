// poolroom-world.js - Single Story with Temple Walkway
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class PoolroomWorld {
    constructor(scene) {
        this.scene = scene;
        this.materials = {};
        
        // Main poolroom dimensions
        this.roomSize = 960;
        this.wallHeight = 150;
        this.poolWidth = 480;
        this.poolDepth = 480;
        this.poolDepthValue = 20;
        this.openingSize = 240;
        
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
        this.createWallOpenings();
        
        // NEW: Door, walkway, and temple
        // this.createDoor(); // COMMENTED OUT: Door is disabled for now
        this.createWalkway();
        this.createTempleArea();
        this.createGrottoPool();
        
        console.log('✅ Single-story poolroom with temple complete');
    }
    
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
    }
    
    async createBasicSkybox() {
        // Use the same sky.png for all 6 faces of the cube skybox
        const loader = new THREE.CubeTextureLoader();
        const skyboxTexture = loader.load([
            'textures/sky.png', // right
            'textures/sky.png', // left
            'textures/sky.png', // top
            'textures/sky.png', // bottom
            'textures/sky.png', // front
            'textures/sky.png'  // back
        ]);
        skyboxTexture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = skyboxTexture;
    }
    
    createTexturedMaterials() {
        const createFloorTiles = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 512);
            
            const tilesPerSide = 16;
            const tileSize = 512 / tilesPerSide;
            
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 2;
            
            for (let i = 0; i <= tilesPerSide; i++) {
                const x = i * tileSize;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, 512);
                ctx.stroke();
            }
            
            for (let i = 0; i <= tilesPerSide; i++) {
                const y = i * tileSize;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(512, y);
                ctx.stroke();
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            return texture;
        };
        
        const floorTexture = createFloorTiles();
        
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
                floor: new THREE.MeshPhongMaterial({
                    map: floorTexture,
                    shininess: 30,
                    side: THREE.DoubleSide
                }),
                wall: new THREE.MeshPhongMaterial({
                    color: 0xf0f0f0,
                    shininess: 30,
                    side: THREE.DoubleSide
                }),
                ceiling: new THREE.MeshPhongMaterial({
                    color: 0xf0f0f0,
                    shininess: 30,
                    side: THREE.DoubleSide
                }),
                pool: new THREE.MeshPhongMaterial({
                    color: 0xb0d0ff,
                    shininess: 100,
                    side: THREE.DoubleSide
                }),
                pillar: new THREE.MeshPhongMaterial({
                    map: pillarTexture,
                    shininess: 50
                }),
                // NEW: Temple materials
                temple: new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    shininess: 80,
                    side: THREE.DoubleSide
                }),
                vaporwave: new THREE.MeshPhongMaterial({
                    color: 0xff69b4, // Hot pink
                    shininess: 100,
                    emissive: 0x330066, // Purple glow
                    side: THREE.DoubleSide
                }),
                door: new THREE.MeshPhongMaterial({
                    color: 0x8b4513,
                    shininess: 20,
                    side: THREE.DoubleSide
                }),
                templeFloor: new THREE.MeshPhongMaterial({
                    map: this.textures.templeFloor,
                    shininess: 40,
                    side: THREE.DoubleSide
                }),
                grottoWood: new THREE.MeshPhongMaterial({
                    map: this.textures.wood,
                    shininess: 20,
                    side: THREE.DoubleSide
                }),
                stoneColumn: new THREE.MeshPhongMaterial({
                    map: this.textures.stone,
                    shininess: 30,
                    side: THREE.DoubleSide
                })
            };
            
            console.log('Materials created with temple elements');
        } else {
            this.createBasicMaterials();
        }
    }
    
    createBasicMaterials() {
        this.materials = {
            floor: new THREE.MeshPhongMaterial({ color: 0xf5f5f0, shininess: 30, side: THREE.DoubleSide }),
            wall: new THREE.MeshPhongMaterial({ color: 0xe8e8e8, shininess: 30, side: THREE.DoubleSide }),
            ceiling: new THREE.MeshPhongMaterial({ color: 0xe8e8e8, shininess: 30, side: THREE.DoubleSide }),
            pool: new THREE.MeshPhongMaterial({ color: 0xb0d0ff, shininess: 100, side: THREE.DoubleSide }),
            pillar: new THREE.MeshPhongMaterial({ color: 0xd0d0d0, shininess: 50 }),
            temple: new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 80, side: THREE.DoubleSide }),
            vaporwave: new THREE.MeshPhongMaterial({ color: 0xff69b4, shininess: 100, side: THREE.DoubleSide }),
            door: new THREE.MeshPhongMaterial({ color: 0x8b4513, shininess: 20, side: THREE.DoubleSide })
        };
    }
    
    createBasicFloor() {
        const roomSize = this.roomSize;
        const poolSize = this.poolWidth;
        
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#f5f5f0';
        ctx.fillRect(0, 0, 32, 32);
        
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, 32, 32);
        
        const tileTexture = new THREE.CanvasTexture(canvas);
        tileTexture.colorSpace = THREE.SRGBColorSpace;
        tileTexture.wrapS = THREE.RepeatWrapping;
        tileTexture.wrapT = THREE.RepeatWrapping;
        tileTexture.magFilter = THREE.NearestFilter;
        tileTexture.minFilter = THREE.NearestFilter;
        
        const sideWidth = (roomSize - poolSize) / 2;
        const tileSize = 2.5;
        
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
    }
    
    createBasicWalls() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#f5f5f0';
        ctx.fillRect(0, 0, 32, 32);
        
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, 32, 32);
        
        const tileTexture = new THREE.CanvasTexture(canvas);
        tileTexture.colorSpace = THREE.SRGBColorSpace;
        tileTexture.wrapS = THREE.RepeatWrapping;
        tileTexture.wrapT = THREE.RepeatWrapping;
        tileTexture.magFilter = THREE.NearestFilter;
        tileTexture.minFilter = THREE.NearestFilter;
        
        const roomSize = this.roomSize;
        const wallHeight = this.wallHeight;
        const tileSize = 2.5;
        const wallOffset = 2;
        
        // Create walls but with a gap in the north wall for the door
        const doorWidth = 100;
        const doorOffset = 0; // CENTER THE DOOR
        
        // North wall - split around centered door
        const northWallSections = [
            // Left section
            {
                width: (roomSize/2) - (doorWidth/2),
                position: [-roomSize/2 + wallOffset + ((roomSize/2) - (doorWidth/2))/2, wallHeight/2, -roomSize/2 + wallOffset],
                rotation: [0, 0, 0]
            },
            // Right section  
            {
                width: (roomSize/2) - (doorWidth/2),
                position: [(doorWidth/2) + ((roomSize/2) - (doorWidth/2))/2, wallHeight/2, -roomSize/2 + wallOffset],
                rotation: [0, 0, 0]
            }
        ];
        
        northWallSections.forEach(section => {
            const material = this.materials.wall.clone();
            material.map = tileTexture.clone();
            const wall = new THREE.Mesh(new THREE.PlaneGeometry(section.width, wallHeight), material);
            wall.position.set(...section.position);
            wall.rotation.set(...section.rotation);
            wall.material.map.repeat.set(section.width / tileSize, wallHeight / tileSize);
            wall.material.map.needsUpdate = true;
            this.architectureGroup.add(wall);
        });
        
        // Other walls (no changes)
        const otherWalls = [
            // South wall  
            {
                geometry: new THREE.PlaneGeometry(roomSize, wallHeight),
                position: [0, wallHeight/2, roomSize/2 - wallOffset],
                rotation: [0, Math.PI, 0]
            },
            // East wall
            {
                geometry: new THREE.PlaneGeometry(roomSize, wallHeight),
                position: [roomSize/2 - wallOffset, wallHeight/2, 0],
                rotation: [0, -Math.PI/2, 0]
            },
            // West wall
            {
                geometry: new THREE.PlaneGeometry(roomSize, wallHeight),
                position: [-roomSize/2 + wallOffset, wallHeight/2, 0],
                rotation: [0, Math.PI/2, 0]
            }
        ];
        
        otherWalls.forEach((wallData, index) => {
            const material = this.materials.wall.clone();
            material.map = tileTexture.clone();
            const wall = new THREE.Mesh(wallData.geometry, material);
            wall.position.set(...wallData.position);
            wall.rotation.set(...wallData.rotation);
            wall.material.map.repeat.set(roomSize / tileSize, wallHeight / tileSize);
            wall.material.map.needsUpdate = true;
            this.architectureGroup.add(wall);
        });
        
        console.log('Walls with centered door opening created');
    }
    
    createBasicCeiling() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#f5f5f0';
        ctx.fillRect(0, 0, 32, 32);
        
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, 32, 32);
        
        const tileTexture = new THREE.CanvasTexture(canvas);
        tileTexture.colorSpace = THREE.SRGBColorSpace;
        tileTexture.wrapS = THREE.RepeatWrapping;
        tileTexture.wrapT = THREE.RepeatWrapping;
        tileTexture.magFilter = THREE.NearestFilter;
        tileTexture.minFilter = THREE.NearestFilter;
        
        const ceilingMaterial = this.materials.ceiling.clone();
        ceilingMaterial.map = tileTexture;
        
        const ceilingY = this.wallHeight;
        const openingSize = this.openingSize;
        const roomSize = this.roomSize;
        const tileSize = 2.5;
        
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
            ceiling.rotation.x = Math.PI / 2;
            ceiling.position.set(...section.position);
            const width = section.geometry.parameters.width;
            const height = section.geometry.parameters.height;
            ceiling.material.map.repeat.set(width / tileSize, height / tileSize);
            ceiling.material.map.needsUpdate = true;
            this.architectureGroup.add(ceiling);
        });
        
        console.log('Simple ceiling with central opening created');
    }
    
    createBasicPool() {
        // Pool floor (bottom) - use stone_bricks.png texture
        let poolBottomMaterial;
        if (this.textures && this.textures.stoneBricks) {
            const tex = this.textures.stoneBricks.clone();
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(8, 8); // Tile the texture
            tex.needsUpdate = true;
            poolBottomMaterial = new THREE.MeshPhongMaterial({ map: tex, shininess: 80, side: THREE.DoubleSide });
        } else {
            poolBottomMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000, shininess: 80, side: THREE.DoubleSide }); // fallback, visible
        }
        const poolBottom = new THREE.Mesh(
            new THREE.PlaneGeometry(this.poolWidth, this.poolDepth),
            poolBottomMaterial
        );
        poolBottom.rotation.x = -Math.PI / 2;
        poolBottom.position.y = -18;
        this.poolGroup.add(poolBottom);
        this.poolBottomMesh = poolBottom;

        // Pool walls (4 sides) - use stone_bricks.png texture if available
        let wallMat;
        if (this.textures && this.textures.stoneBricks) {
            const wallTex = this.textures.stoneBricks.clone();
            wallTex.wrapS = THREE.RepeatWrapping;
            wallTex.wrapT = THREE.RepeatWrapping;
            wallTex.repeat.set(8, 1); // Tile horizontally, less vertically
            wallTex.needsUpdate = true;
            wallMat = new THREE.MeshPhongMaterial({ map: wallTex, shininess: 20, side: THREE.DoubleSide });
        } else {
            wallMat = new THREE.MeshPhongMaterial({ color: 0x00ff00, side: THREE.DoubleSide }); // fallback
        }
        const wallH = 18; // Slightly raised
        // North wall
        const northWall = new THREE.Mesh(
            new THREE.PlaneGeometry(this.poolWidth, wallH), wallMat.clone()
        );
        northWall.position.set(0, -wallH/2, -this.poolDepth/2);
        this.poolGroup.add(northWall);
        // South wall
        const southWall = new THREE.Mesh(
            new THREE.PlaneGeometry(this.poolWidth, wallH), wallMat.clone()
        );
        southWall.position.set(0, -wallH/2, this.poolDepth/2);
        southWall.rotation.y = Math.PI;
        this.poolGroup.add(southWall);
        // East wall
        const eastWall = new THREE.Mesh(
            new THREE.PlaneGeometry(this.poolDepth, wallH), wallMat.clone()
        );
        eastWall.position.set(this.poolWidth/2, -wallH/2, 0);
        eastWall.rotation.y = -Math.PI/2;
        this.poolGroup.add(eastWall);
        // West wall
        const westWall = new THREE.Mesh(
            new THREE.PlaneGeometry(this.poolDepth, wallH), wallMat.clone()
        );
        westWall.position.set(-this.poolWidth/2, -wallH/2, 0);
        westWall.rotation.y = Math.PI/2;
        this.poolGroup.add(westWall);

        // Pool edges (unchanged)
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
    }
    
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
    }
    
    createWallOpenings() {
        const openingWidth = 80;
        const openingSpacing = 160;
        const wallHeight = this.wallHeight;
        const roomSize = this.roomSize;
        
        const frameMaterial = new THREE.MeshPhongMaterial({ color: 0xc0c0c0, shininess: 30 });
        const skyMaterial = new THREE.MeshPhongMaterial({
            color: 0x99ccff,
            transparent: true,
            opacity: 0.12,
            shininess: 100,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const wallConfigs = [
            // Skip north wall (has door)
            // { wall: 'north', basePos: [0, 0, -roomSize/2 + 2], direction: 'x' }, // COMMENTED OUT
            { wall: 'south', basePos: [0, 0, roomSize/2 - 2], direction: 'x' },
            { wall: 'east', basePos: [roomSize/2 - 2, 0, 0], direction: 'z' },
            { wall: 'west', basePos: [-roomSize/2 + 2, 0, 0], direction: 'z' }
        ];
        
        wallConfigs.forEach(config => {
            for (let i = -1; i <= 1; i++) {
                const openingGroup = new THREE.Group();
                
                const frameGeometry = new THREE.PlaneGeometry(openingWidth + 4, wallHeight);
                const frame = new THREE.Mesh(frameGeometry, frameMaterial);
                
                openingGroup.add(frame);
                
                if (config.direction === 'x') {
                    openingGroup.position.set(i * openingSpacing, wallHeight/2, config.basePos[2]);
                    if (config.wall === 'south') openingGroup.rotation.y = Math.PI;
                } else {
                    openingGroup.position.set(config.basePos[0], wallHeight/2, i * openingSpacing);
                    if (config.wall === 'east') openingGroup.rotation.y = -Math.PI/2;
                    if (config.wall === 'west') openingGroup.rotation.y = Math.PI/2;
                }
                
                this.architectureGroup.add(openingGroup);
            }
        });
        
        console.log('Wall openings created');
    }
    
    createGameWorldBackground() {
        // Green field with cutouts for poolroom, walkway, temple, and hot tub
        const fieldSize = 6000;
        const margin = 8; // Even closer to building
        // Outer rectangle
        const outer = new THREE.Shape();
        outer.moveTo(-fieldSize/2, -fieldSize/2);
        outer.lineTo(fieldSize/2, -fieldSize/2);
        outer.lineTo(fieldSize/2, fieldSize/2);
        outer.lineTo(-fieldSize/2, fieldSize/2);
        outer.lineTo(-fieldSize/2, -fieldSize/2);
        // Poolroom hole
        const roomSize = this.roomSize + margin;
        const poolroomHole = new THREE.Path();
        poolroomHole.moveTo(-roomSize/2, -roomSize/2);
        poolroomHole.lineTo(roomSize/2, -roomSize/2);
        poolroomHole.lineTo(roomSize/2, roomSize/2);
        poolroomHole.lineTo(-roomSize/2, roomSize/2);
        poolroomHole.lineTo(-roomSize/2, -roomSize/2);
        // Walkway hole
        const walkwayWidth = this.walkwayWidth + margin;
        const walkwayLength = this.walkwayLength + margin;
        const walkwayStartZ = -this.roomSize/2;
        const walkwayEndZ = walkwayStartZ - this.walkwayLength;
        const walkwayHole = new THREE.Path();
        walkwayHole.moveTo(-walkwayWidth/2, walkwayEndZ);
        walkwayHole.lineTo(walkwayWidth/2, walkwayEndZ);
        walkwayHole.lineTo(walkwayWidth/2, walkwayStartZ);
        walkwayHole.lineTo(-walkwayWidth/2, walkwayStartZ);
        walkwayHole.lineTo(-walkwayWidth/2, walkwayEndZ);
        // Temple hole
        const templeSize = this.templeSize + margin;
        const templeZ = -this.roomSize/2 - this.walkwayLength - this.templeSize/2;
        const templeHole = new THREE.Path();
        templeHole.moveTo(-templeSize/2, templeZ - templeSize/2);
        templeHole.lineTo(templeSize/2, templeZ - templeSize/2);
        templeHole.lineTo(templeSize/2, templeZ + templeSize/2);
        templeHole.lineTo(-templeSize/2, templeZ + templeSize/2);
        templeHole.lineTo(-templeSize/2, templeZ - templeSize/2);
        // Hot tub hole (circular)
        const grottoX = -this.templeSize/2 - 120;
        const grottoZ = templeZ;
        const hotTubRadius = 60 + margin;
        const hotTubHole = new THREE.Path();
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const x = grottoX + Math.cos(theta) * hotTubRadius;
            const z = grottoZ + Math.sin(theta) * hotTubRadius;
            if (i === 0) hotTubHole.moveTo(x, z);
            else hotTubHole.lineTo(x, z);
        }
        // Add all holes
        outer.holes = [poolroomHole, walkwayHole, templeHole, hotTubHole];
        // Create geometry
        const fieldGeo = new THREE.ShapeGeometry(outer);
        const fieldMat = new THREE.MeshLambertMaterial({ color: 0x3ecf4a, side: THREE.DoubleSide });
        const field = new THREE.Mesh(fieldGeo, fieldMat);
        field.rotation.x = -Math.PI / 2;
        field.position.y = -0.2;
        this.scene.add(field);
        // Add hot tub mesh in grotto area
        const hotTub = new THREE.Mesh(
            new THREE.CylinderGeometry(60, 60, 8, 48),
            new THREE.MeshPhongMaterial({ color: 0x87ceeb, shininess: 100 })
        );
        hotTub.position.set(grottoX, 4, grottoZ);
        this.scene.add(hotTub);
        // Add hot tub water surface
        const hotTubWater = new THREE.Mesh(
            new THREE.CircleGeometry(58, 48),
            new THREE.MeshPhongMaterial({ color: 0xb0e0ff, shininess: 120, transparent: true, opacity: 0.7 })
        );
        hotTubWater.rotation.x = -Math.PI / 2;
        hotTubWater.position.set(grottoX, 8, grottoZ);
        this.scene.add(hotTubWater);
    }
    
    // NEW: Door, walkway, and temple creation methods
    
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
    
    createWalkway() {
        console.log('🛤️ Creating walkway...');
        
        const walkwayStart = -this.roomSize/2;
        const walkwayEnd = walkwayStart - this.walkwayLength;
        
        // Walkway floor - CENTERED AT X=0
        const walkwayFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(this.walkwayWidth, this.walkwayLength),
            this.materials.floor
        );
        walkwayFloor.rotation.x = -Math.PI / 2;
        walkwayFloor.position.set(0, 0, walkwayStart - this.walkwayLength/2); // X=0 instead of 200
        this.walkwayGroup.add(walkwayFloor);
        
        // NO WALLS - removed the walkway walls completely
        
        console.log('✅ Walkway created (centered, no walls)');
    }
    
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
    }

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
    }

    // New/refactored helpers
    createTempleWallsRefactored(templeZ) {
        // No walls: leave the temple open, only columns will define the space
    }

    createPortalArch(x, y, z, dir) {
        // Removed: no portal arches
    }

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
    }

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
        const grottoPoolMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff, // Cyan color
            emissive: 0x0088ff, // Blue glow
            emissiveIntensity: 0.5,
            shininess: 100,
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
    }

    createArtGalleryWingRefactored(templeZ) {
        // Gallery in east wing
        const galleryX = this.templeSize/2 + 120;
        const galleryZ = templeZ;
        // Gallery floor
        const galleryFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(this.artGallerySize, this.artGallerySize),
            new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100, reflectivity: 0.5 })
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
            new THREE.MeshPhongMaterial({ color: 0x4B9CD3 }) // Blue
        );
        this.galleryCylinder.position.set(galleryX - spacing * 1.5, y, galleryZ);
        this.galleryCylinder.castShadow = true;
        this.templeGroup.add(this.galleryCylinder);
        // Sphere
        this.gallerySphere = new THREE.Mesh(
            new THREE.SphereGeometry(32, 32, 32),
            new THREE.MeshPhongMaterial({ color: 0xE94F37 }) // Red-Orange
        );
        this.gallerySphere.position.set(galleryX - spacing * 0.5, y + 8, galleryZ);
        this.gallerySphere.castShadow = true;
        this.templeGroup.add(this.gallerySphere);
        // Cube
        this.galleryCube = new THREE.Mesh(
            new THREE.BoxGeometry(60, 60, 60),
            new THREE.MeshPhongMaterial({ color: 0x43B047 }) // Green
        );
        this.galleryCube.position.set(galleryX + spacing * 0.7, y + 10, galleryZ);
        this.galleryCube.castShadow = true;
        this.templeGroup.add(this.galleryCube);
        // Cone (for triangle)
        this.galleryCone = new THREE.Mesh(
            new THREE.ConeGeometry(30, 90, 32),
            new THREE.MeshPhongMaterial({ color: 0xF7C948 }) // Yellow
        );
        this.galleryCone.position.set(galleryX + spacing * 1.8, y + 15, galleryZ);
        this.galleryCone.castShadow = true;
        this.templeGroup.add(this.galleryCone);
    }

    // Animate the art gallery shapes and altar lights
    updateAnimatedShapes(deltaTime) {
        if (this.galleryCylinder) this.galleryCylinder.rotation.y += 0.3 * deltaTime;
        if (this.gallerySphere) this.gallerySphere.rotation.x += 0.4 * deltaTime;
        if (this.galleryCube) this.galleryCube.rotation.y += 0.5 * deltaTime;
        if (this.galleryCone) this.galleryCone.rotation.y += 0.2 * deltaTime;
        // Animate altar cones and SpotLights through vaporwave colors (no float)
        if (this.altarCubes && this.altarSpotLights) {
            const t = Date.now() * 0.0005;
            const colors = [0xff69b4, 0x8ec5fc, 0x6a82fb, 0xf7971e, 0x43e97b, 0x38f9d7];
            this.altarCubes.forEach((cone, i) => {
                const colorIdx = Math.floor((t + i/6) % colors.length);
                const nextIdx = (colorIdx + 1) % colors.length;
                const lerp = (t + i/6) % 1;
                // Lerp between two colors
                const c1 = new THREE.Color(colors[colorIdx]);
                const c2 = new THREE.Color(colors[nextIdx]);
                cone.material.color.lerpColors(c1, c2, lerp);
                // Animate SpotLight color to match
                if (this.altarSpotLights && this.altarSpotLights[i]) {
                    this.altarSpotLights[i].color.lerpColors(c1, c2, lerp);
                }
            });
        }
        // Smooth color lerp for gallery shapes
        this.colorLerpElapsed += deltaTime;
        let t = Math.min(this.colorLerpElapsed / this.colorLerpTime, 1.0);
        // Cylinder
        if (this.galleryCylinder) {
            this.galleryCylinder.material.color.lerpColors(this.galleryShapeColors[0].from, this.galleryShapeColors[0].to, t);
        }
        // Sphere
        if (this.gallerySphere) {
            this.gallerySphere.material.color.lerpColors(this.galleryShapeColors[1].from, this.galleryShapeColors[1].to, t);
        }
        // Cube
        if (this.galleryCube) {
            this.galleryCube.material.color.lerpColors(this.galleryShapeColors[2].from, this.galleryShapeColors[2].to, t);
        }
        // Cone
        if (this.galleryCone) {
            this.galleryCone.material.color.lerpColors(this.galleryShapeColors[3].from, this.galleryShapeColors[3].to, t);
        }
        // When finished, pick new random colors
        if (this.colorLerpElapsed >= this.colorLerpTime) {
            this.colorLerpElapsed = 0;
            for (let i = 0; i < 4; i++) {
                this.galleryShapeColors[i].from.copy(this.galleryShapeColors[i].to);
                this.galleryShapeColors[i].to.setHSL(Math.random(), 0.7 + 0.3 * Math.random(), 0.45 + 0.2 * Math.random());
            }
        }
    }

    setupLighting() {
        // Fill only — everything else should come from a direction
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
        this.scene.add(this.ambientLight);

        // Desaturated ground color so it stops tinting the white tile green
        this.hemiLight = new THREE.HemisphereLight(0xbcd8ff, 0xb0a894, 0.35);
        this.scene.add(this.hemiLight);

        this.sunLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
        this.sunLight.position.set(420, 520, 300);   // off-axis: rakes instead of flattens
        this.sunLight.target.position.set(0, 0, 0);
        this.sunLight.castShadow = true;

        const s = this.sunLight.shadow;
        s.mapSize.set(2048, 2048);
        s.camera.left = -700;  s.camera.right = 700;
        s.camera.top  =  700;  s.camera.bottom = -700;
        s.camera.near = 1;     s.camera.far = 2500;
        s.bias = -0.0005;
        s.normalBias = 1.0;    // large because world units are ~12 per meter here
        s.camera.updateProjectionMatrix();

        this.scene.add(this.sunLight, this.sunLight.target);

        const sunSphere = new THREE.Mesh(
            new THREE.SphereGeometry(60, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0xfff8e0 })
        );
        sunSphere.position.copy(this.sunLight.position).multiplyScalar(2.5);
        sunSphere.userData.noShadow = true;
        this.scene.add(sunSphere);

        // Physical units: intensity ≈ desired × distance². 25000 reads at ~50 units.
        const templeZ = -this.roomSize/2 - this.walkwayLength - this.templeSize/2;
        this.grottoLight = new THREE.PointLight(0x66e0ff, 25000, 600, 2);
        this.grottoLight.position.set(-this.templeSize/2 - 120, 20, templeZ);
        this.scene.add(this.grottoLight);
    }

    enableShadows() {
        this.scene.traverse(obj => {
            if (!obj.isMesh || obj.userData.noShadow) return;
            obj.castShadow = true;
            obj.receiveShadow = true;
        });
    }

    createTorchLights(templeZ) {
        // Removed: no torch lights
    }
    
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
    }
    
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
    }
    
    createVaporwaveLighting(templeZ) {
        // Removed: no perimeter accent lights or central lighting balls
    }
    
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
        const coneMat = new THREE.MeshPhongMaterial({ 
            color: 0xff69b4, 
            shininess: 100,
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
    }
    
    createGrottoPool() {
        // This is now handled in createTempleGrottoArea()
        console.log('✅ Grotto pool integrated into temple complex');
    }
    
    // Utility methods
    getPoolBounds() {
        return {
            width: this.poolWidth,
            depth: this.poolDepth,
            depthValue: this.poolDepthValue,
            waterLevel: -0.5
        };
    }
    
    getRoomBounds() {
        return {
            size: this.roomSize,
            height: this.wallHeight
        };
    }
    
    getWalkwayBounds() {
        return {
            x: 0,        // CENTERED
            startZ: -this.roomSize/2,
            endZ: -this.roomSize/2 - this.walkwayLength,
            width: this.walkwayWidth
        };
    }
    
    getTempleBounds() {
        const templeZ = -this.roomSize/2 - this.walkwayLength - this.templeSize/2;
        return {
            x: 0,        // CENTERED
            z: templeZ,
            size: this.templeSize,
            grottoX: 0,  // CENTERED
            grottoZ: templeZ,
            grottoSize: this.grottoPoolSize
        };
    }

    getPoolBottomMesh() {
        return this.poolBottomMesh;
    }

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
                child.material = new THREE.MeshPhongMaterial({
                    color: child.material.color, shininess: 100,
                    specular: 0xffffff, map: child.material.map
                });
            });
            object.scale.set(2.5, 2.5, 2.5);
            object.position.set(0, 70, this.getTempleBounds().z);
            this.templeGroup.add(object);
        }, undefined, (e) => console.error('head.glb:', e));
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