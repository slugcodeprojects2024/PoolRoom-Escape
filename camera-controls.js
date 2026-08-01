// camera-controls.js - Single Story Design
import * as THREE from 'three';

export class CameraControls {
    constructor(camera, domElement, poolBottomMesh, invisibleWalls = []) {
        this.camera = camera;
        this.domElement = domElement;
        this.poolBottomMesh = poolBottomMesh;
        this.invisibleWalls = invisibleWalls;
        
        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        this.isSwimming = false;
        
        // Physics
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.walkSpeed = 400.0;
        this.swimSpeed = 200.0;
        this.jumpVelocity = 350;
        this.gravity = 9.8 * 100.0;
        this.damping = 10.0;
        
        // Mouse sensitivity
        this.mouseSensitivity = 0.002;
        
        // Pointer lock
        this.isPointerLocked = false;
        
        // Collision boundaries
        this.roomBoundary = 460;
        this.poolBoundary = 240;
        this.poolDepth = -90;
        this.floorLevel = 20;
        this.waterLevel = -1;
        this.grottoWaterLevel = -6;
        
        // Water physics
        this.waterDamping = 15.0;
        this.buoyancy = 200.0;
        
        // NEW: Area boundaries for single-story design - CENTERED
        this.walkwayBounds = {
            x: 0,        // CENTERED
            startZ: -480,
            endZ: -880,
            width: 80
        };
        
        this.templeBounds = {
            x: 0,        // CENTERED
            z: -1030,
            size: 1360, // Expanded: 960 (temple) + 400 margin
            grottoSize: 120
        };
        
        // Add key listener for coordinate display
        document.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'c') {
                console.log('Camera position:', {
                    x: this.camera.position.x.toFixed(2),
                    y: this.camera.position.y.toFixed(2),
                    z: this.camera.position.z.toFixed(2)
                });
            }
        });
    }
    
    init() {
        this.setupPointerLock();
        this.setupKeyboardControls();
        console.log('🎮 Camera controls initialized for single-story design');
    }
    
    setupPointerLock() {
        // Click to request pointer lock
        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
        });
        
        // Handle pointer lock changes
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.domElement;
        });
        
        // Handle mouse movement
        document.addEventListener('mousemove', (event) => {
            if (!this.isPointerLocked) return;
            
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            
            // Update camera rotation
            this.camera.rotation.y -= movementX * this.mouseSensitivity;
            this.camera.rotation.x += movementY * this.mouseSensitivity;
            
            // Limit vertical rotation
            this.camera.rotation.x = Math.max(
                -Math.PI / 2, 
                Math.min(Math.PI / 2, this.camera.rotation.x)
            );
        });
    }
    
    setupKeyboardControls() {
        // Keydown events
        document.addEventListener('keydown', (event) => {
            switch(event.code) {
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'KeyQ':
                    // Rotate camera left
                    this.camera.rotation.y += 0.1;
                    break;
                case 'KeyE':
                    // Rotate camera right
                    this.camera.rotation.y -= 0.1;
                    break;
                case 'Space':
                    event.preventDefault();
                    this.handleJump();
                    break;
                case 'ShiftLeft':
                    this.walkSpeed = 800.0;
                    this.swimSpeed = 400.0;
                    break;
            }
        });
        
        // Keyup events
        document.addEventListener('keyup', (event) => {
            switch(event.code) {
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'KeyD':
                    this.moveRight = false;
                    break;
                case 'ShiftLeft':
                    this.walkSpeed = 400.0;
                    this.swimSpeed = 200.0;
                    break;
            }
        });
    }
    
    handleJump() {
        if (this.isSwimming) {
            this.velocity.y += this.jumpVelocity * 0.7;
        } else if (this.canJump) {
            this.velocity.y += this.jumpVelocity;
            this.canJump = false;
        }
    }
    
    update(deltaTime) {
        this.updateMovement(deltaTime);
        this.handleCollisions();
        this.updateSwimmingState();
        // Raycast to pool bottom mesh for collision
        if (this.poolBottomMesh) {
            const raycaster = new THREE.Raycaster();
            const origin = this.camera.position.clone();
            origin.y += 1; // Start ray just above camera
            raycaster.set(origin, new THREE.Vector3(0, -1, 0));
            const intersects = raycaster.intersectObject(this.poolBottomMesh);
            if (intersects.length > 0) {
                const hitY = intersects[0].point.y;
                const offset = 2; // Stand slightly above mesh
                if (this.camera.position.y < hitY + offset) {
                    this.camera.position.y = hitY + offset;
                    this.velocity.y = 0;
                }
            }
        }
        // --- NEW: Mesh-based collision with invisible walls ---
        if (this.invisibleWalls && this.invisibleWalls.length > 0) {
            const cameraBB = new THREE.Box3().setFromCenterAndSize(
                this.camera.position,
                new THREE.Vector3(6, 16, 6) // Camera collision box size (tweak as needed)
            );
            for (const wall of this.invisibleWalls) {
                wall.updateMatrixWorld();
                const wallBB = new THREE.Box3().setFromObject(wall);
                if (cameraBB.intersectsBox(wallBB)) {
                    // Simple response: push camera back along the smallest axis
                    const cam = this.camera.position;
                    const min = wallBB.min;
                    const max = wallBB.max;
                    // Find closest face and push out
                    if (cam.x < min.x) cam.x = min.x - 3;
                    if (cam.x > max.x) cam.x = max.x + 3;
                    if (cam.z < min.z) cam.z = min.z - 3;
                    if (cam.z > max.z) cam.z = max.z + 3;
                    if (cam.y < min.y) cam.y = min.y - 3;
                    if (cam.y > max.y) cam.y = max.y + 3;
                    this.velocity.set(0, 0, 0);
                }
            }
        }
    }
    
    updateMovement(deltaTime) {
        const currentSpeed = this.isSwimming ? this.swimSpeed : this.walkSpeed;
        const currentDamping = this.isSwimming ? this.waterDamping : this.damping;
        
        // Apply damping
        this.velocity.x -= this.velocity.x * currentDamping * deltaTime;
        this.velocity.z -= this.velocity.z * currentDamping * deltaTime;
        
        // Apply gravity or buoyancy
        if (this.isSwimming) {
            if (this.camera.position.y < this.waterLevel) {
                this.velocity.y += this.buoyancy * deltaTime;
            }
            this.velocity.y -= (this.gravity * 0.3) * deltaTime;
        } else {
            this.velocity.y -= this.gravity * deltaTime;
        }
        
        // Calculate movement direction
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();
        
        // Apply movement
        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * currentSpeed * deltaTime;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x -= this.direction.x * currentSpeed * deltaTime;
        }
        
        // Convert to world coordinates
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3(-1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();
        
        // Apply movement to camera
        const movement = new THREE.Vector3();
        movement.addScaledVector(forward, this.velocity.z * deltaTime);
        movement.addScaledVector(right, this.velocity.x * deltaTime);
        
        this.camera.position.add(movement);
        this.camera.position.y += this.velocity.y * deltaTime;
        // HARD CLAMP for pool bottom immediately after Y update
        const pos = this.camera.position;
        const margin = 2;
        if (Math.abs(pos.x) < this.poolBoundary + margin && Math.abs(pos.z) < this.poolBoundary + margin) {
            if (pos.y < this.poolDepth) {
                console.log('🔵 IMMEDIATE CLAMP: Forcing Y to pool bottom');
                pos.y = this.poolDepth;
                this.velocity.y = 0;
            }
        }
    }
    
    handleCollisions() {
        const pos = this.camera.position;
        // Determine which area we're in and handle appropriate collisions
        if (this.isInTempleArea(pos.x, pos.z)) {
            this.handleTempleCollisions();
        } else if (this.isOnWalkway(pos.x, pos.z)) {
            this.handleWalkwayCollisions();
        } else if (this.isInMainRoom(pos.x, pos.z)) {
            this.handleMainRoomCollisions();
        } else {
            // Remove fallback boundary: allow free movement
            // Default floor collision
            if (pos.y < this.floorLevel) {
                pos.y = this.floorLevel;
                this.velocity.y = 0;
                this.canJump = true;
            }
        }
    }
    
    isInMainRoom(x, z) {
        return Math.abs(x) < this.roomBoundary && z > -this.roomBoundary && z < this.roomBoundary;
    }
    
    isOnWalkway(x, z) {
        return Math.abs(x - this.walkwayBounds.x) < this.walkwayBounds.width/2 &&
               z >= this.walkwayBounds.endZ && z <= this.walkwayBounds.startZ;
    }
    
    isInTempleArea(x, z) {
        return Math.abs(x - this.templeBounds.x) < this.templeBounds.size/2 &&
               Math.abs(z - this.templeBounds.z) < this.templeBounds.size/2;
    }
    
    handleMainRoomCollisions() {
        const pos = this.camera.position;
        // Room boundary collision
        if (pos.x > this.roomBoundary) pos.x = this.roomBoundary;
        if (pos.x < -this.roomBoundary) pos.x = -this.roomBoundary;
        if (pos.z > this.roomBoundary) pos.z = this.roomBoundary;
        if (pos.z < -this.roomBoundary) pos.z = -this.roomBoundary;
        // Check if in main pool area (add margin)
        const margin = 2;
        const inPoolArea = Math.abs(pos.x) < this.poolBoundary + margin && Math.abs(pos.z) < this.poolBoundary + margin;
        if (inPoolArea) {
            this.handlePoolCollisions();
        } else {
            // Regular floor collision
            if (pos.y < this.floorLevel) {
                pos.y = this.floorLevel;
                this.velocity.y = 0;
                this.canJump = true;
            }
        }
    }
    
    handleWalkwayCollisions() {
        const pos = this.camera.position;
        
        // Keep within walkway bounds
        const halfWidth = this.walkwayBounds.width / 2;
        if (pos.x > this.walkwayBounds.x + halfWidth) pos.x = this.walkwayBounds.x + halfWidth;
        if (pos.x < this.walkwayBounds.x - halfWidth) pos.x = this.walkwayBounds.x - halfWidth;
        
        // Floor collision
        if (pos.y < this.floorLevel) {
            pos.y = this.floorLevel;
            this.velocity.y = 0;
            this.canJump = true;
        }
    }
    
    handleTempleCollisions() {
        const pos = this.camera.position;
        
        // Check if in grotto pool
        const grottoDistance = Math.sqrt(
            Math.pow(pos.x - this.templeBounds.x, 2) + 
            Math.pow(pos.z - this.templeBounds.z, 2)
        );
        
        if (grottoDistance < this.templeBounds.grottoSize / 2) {
            // In grotto pool
            if (pos.y < this.grottoWaterLevel) {
                pos.y = this.grottoWaterLevel;
                this.velocity.y = 0;
                this.canJump = true;
            }
        } else {
            // On temple floor
            if (pos.y < this.floorLevel) {
                pos.y = this.floorLevel;
                this.velocity.y = 0;
                this.canJump = true;
            }
        }
    }
    
    handlePoolCollisions() {
        const pos = this.camera.position;
        // Pool bottom collision (match pool mesh via this.poolDepth)
        const poolBottomY = this.poolDepth;
        if (pos.y <= poolBottomY) {
            console.log('🟢 handlePoolCollisions: setting Y to pool bottom');
            pos.y = poolBottomY;
            this.velocity.y = 0;
            this.canJump = true;
        }
    }
    
    updateSwimmingState() {
        const pos = this.camera.position;
        
        // Check main pool
        const inMainPool = Math.abs(pos.x) < this.poolBoundary && 
                          Math.abs(pos.z) < this.poolBoundary && 
                          pos.y < this.waterLevel;
        
        // Check grotto pool
        const grottoDistance = Math.sqrt(
            Math.pow(pos.x - this.templeBounds.x, 2) + 
            Math.pow(pos.z - this.templeBounds.z, 2)
        );
        const inGrottoPool = grottoDistance < this.templeBounds.grottoSize / 2 && 
                            pos.y < this.grottoWaterLevel;
        
        this.isSwimming = inMainPool || inGrottoPool;
    }
    
    // Public methods
    getPosition() {
        return this.camera.position.clone();
    }
    
    isInWater() {
        return this.isSwimming;
    }
    
    getCurrentArea() {
        const pos = this.camera.position;
        if (this.isInTempleArea(pos.x, pos.z)) return 'temple';
        if (this.isOnWalkway(pos.x, pos.z)) return 'walkway';
        if (this.isInMainRoom(pos.x, pos.z)) return 'poolroom';
        return 'outside';
    }
    
    setPosition(x, y, z) {
        this.camera.position.set(x, y, z);
        this.velocity.set(0, 0, 0);
    }
    
    reset() {
        this.setPosition(50, 2, 50);
        this.camera.rotation.set(0, 0, 0);
    }
}