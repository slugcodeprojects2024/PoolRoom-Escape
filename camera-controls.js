// camera-controls.js — first-person movement and look
import * as THREE from 'three';

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);
const _raycaster = new THREE.Raycaster();

export class CameraControls {
    constructor(camera, domElement, poolBottomMesh, options = {}) {
        this.camera = camera;
        this.domElement = domElement;
        this.poolBottomMesh = poolBottomMesh;

        // Yaw and pitch are tracked as plain numbers and written to the camera
        // each frame. Mutating camera.rotation directly with the default XYZ
        // Euler order introduces roll when yaw and pitch combine — the "swimmy"
        // feel. YXZ applies yaw first, so the horizon stays level.
        this.camera.rotation.order = 'YXZ';
        this.yaw = 0;
        this.pitch = 0;
        this.mouseSensitivity = options.sensitivity || 0.0022;
        this.invertY = false;
        this.maxPitch = Math.PI / 2 - 0.01;   // just short of the pole

        this.keys = { forward: false, back: false, left: false, right: false, sprint: false };

        // Speeds are targets, not accelerations. Displacement is velocity * dt,
        // integrated once. The old code applied speed as an acceleration and
        // then multiplied by dt again, so movement scaled with dt² and terminal
        // speed was set by the damping constant — that was the floatiness.
        this.walkSpeed = options.walkSpeed || 260;
        this.sprintMultiplier = options.sprintMultiplier || 1.9;
        this.swimSpeed = options.swimSpeed || 150;

        // How fast actual velocity converges on target. High on ground for
        // crisp starts and stops; low in air so you keep momentum.
        this.groundControl = 18;
        this.airControl = 2.5;
        this.waterControl = 5;

        this.velocity = new THREE.Vector3();
        this.jumpVelocity = options.jumpVelocity || 230;
        this.gravity = options.gravity || 620;
        this.swimGravity = 150;
        this.buoyancy = 190;

        this.onGround = false;
        this.isSwimming = false;
        this.isPointerLocked = false;

        // World geometry. Kept as data so Phase 5 can rebuild the level
        // without touching movement code.
        this.eyeHeight = options.eyeHeight || 20;
        this.roomBoundary = options.roomBoundary || 460;
        this.poolBoundary = options.poolBoundary || 240;
        this.poolFloor = options.poolFloor !== undefined ? options.poolFloor : -90;
        this.waterLevel = options.waterLevel !== undefined ? options.waterLevel : -1;
        this.grottoWaterLevel = -6;
        this.boundsEnabled = options.boundsEnabled !== false;

        // Optional external ground query. When supplied it replaces the
        // built-in pool/temple height logic entirely — this is the hook the
        // blockout uses and the one the elevator will extend.
        this.groundQuery = options.groundQuery || null;

        this.walkwayBounds = { x: 0, startZ: -480, endZ: -880, width: 80 };
        this.templeBounds = { x: 0, z: -1030, size: 1360, grottoSize: 120 };

        this._onMouseMove = this._onMouseMove.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
    }

    init() {
        this.yaw = this.camera.rotation.y;
        this.pitch = this.camera.rotation.x;

        this.domElement.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                const p = this.domElement.requestPointerLock();
                // Chrome returns a promise here; a rejection is normal if the
                // user exits and re-clicks too quickly, and must not throw.
                if (p && p.catch) p.catch(() => {});
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.domElement;
            if (!this.isPointerLocked) {
                // Drop held keys, or the player keeps walking after focus loss
                for (const k in this.keys) this.keys[k] = false;
            }
        });

        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }

    dispose() {
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
    }

    _onMouseMove(event) {
        if (!this.isPointerLocked) return;
        const mx = event.movementX || 0;
        const my = event.movementY || 0;

        this.yaw -= mx * this.mouseSensitivity;
        // Moving the mouse down gives positive movementY and must pitch the
        // view down, which is negative rotation.x. The original used += here.
        this.pitch -= (this.invertY ? -my : my) * this.mouseSensitivity;
        this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
    }

    _onKeyDown(event) {
        if (event.repeat) return;
        switch (event.code) {
            case 'KeyW': case 'ArrowUp':    this.keys.forward = true; break;
            case 'KeyS': case 'ArrowDown':  this.keys.back = true; break;
            case 'KeyA': case 'ArrowLeft':  this.keys.left = true; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
            case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = true; break;
            case 'Space':
                event.preventDefault();
                this.jump();
                break;
            case 'KeyC':
                console.log('Camera:', this.camera.position.toArray().map(n => n.toFixed(1)).join(', '));
                break;
        }
    }

    _onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp':    this.keys.forward = false; break;
            case 'KeyS': case 'ArrowDown':  this.keys.back = false; break;
            case 'KeyA': case 'ArrowLeft':  this.keys.left = false; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
            case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = false; break;
        }
    }

    jump() {
        if (this.isSwimming) {
            this.velocity.y = this.jumpVelocity * 0.55;
        } else if (this.onGround) {
            this.velocity.y = this.jumpVelocity;
            this.onGround = false;
        }
    }

    update(deltaTime) {
        // Clamp dt so a tab-switch stall can't teleport the player through walls
        const dt = Math.min(deltaTime, 0.05);

        this.camera.rotation.set(this.pitch, this.yaw, 0);

        this.updateSwimmingState();
        this.updateMovement(dt);
        this.handleCollisions();
    }

    updateMovement(dt) {
        const swimming = this.isSwimming;

        // Basis vectors from yaw only, so looking up doesn't slow you down
        _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

        const fwdInput = (this.keys.forward ? 1 : 0) - (this.keys.back ? 1 : 0);
        const strafeInput = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);

        _wish.set(0, 0, 0);
        _wish.addScaledVector(_forward, fwdInput);
        _wish.addScaledVector(_right, strafeInput);
        if (_wish.lengthSq() > 0) _wish.normalize();   // no diagonal speed bonus

        let speed = swimming ? this.swimSpeed : this.walkSpeed;
        if (this.keys.sprint) speed *= this.sprintMultiplier;

        const control = swimming ? this.waterControl
                      : this.onGround ? this.groundControl
                      : this.airControl;
        const t = 1 - Math.exp(-control * dt);   // frame-rate independent

        this.velocity.x += (_wish.x * speed - this.velocity.x) * t;
        this.velocity.z += (_wish.z * speed - this.velocity.z) * t;

        if (swimming) {
            this.velocity.y -= this.swimGravity * dt;
            if (this.camera.position.y < this.waterLevel) {
                this.velocity.y += this.buoyancy * dt;
            }
            this.velocity.y *= (1 - Math.min(1, 2.2 * dt));   // water drag
        } else {
            this.velocity.y -= this.gravity * dt;
        }

        this.camera.position.addScaledVector(this.velocity, dt);
    }

    handleCollisions() {
        const pos = this.camera.position;
        this.onGround = false;

        if (this.boundsEnabled) {
            if (this.isInTempleArea(pos.x, pos.z)) {
                // temple floor, no lateral clamp
            } else if (this.isOnWalkway(pos.x, pos.z)) {
                const half = this.walkwayBounds.width / 2;
                pos.x = Math.max(this.walkwayBounds.x - half, Math.min(this.walkwayBounds.x + half, pos.x));
            } else if (this.isInMainRoom(pos.x, pos.z)) {
                pos.x = Math.max(-this.roomBoundary, Math.min(this.roomBoundary, pos.x));
                pos.z = Math.max(-this.roomBoundary, Math.min(this.roomBoundary, pos.z));
            }
        }

        const groundY = this.groundHeightAt(pos);
        if (pos.y < groundY) {
            pos.y = groundY;
            if (this.velocity.y < 0) this.velocity.y = 0;
            // Only grounded on real ground — not while submerged, or you get
            // an infinite jump off the pool floor.
            this.onGround = !this.isSwimming;
        }
    }

    // Single source of truth for "what is the floor here". Phase 5's elevator
    // and multi-level layout should extend this rather than adding more clamps.
    groundHeightAt(pos) {
        if (this.groundQuery) return this.groundQuery(pos);
        const inPool = Math.abs(pos.x) < this.poolBoundary + 2 &&
                       Math.abs(pos.z) < this.poolBoundary + 2;

        if (inPool) {
            if (this.poolBottomMesh) {
                _rayOrigin.set(pos.x, pos.y + 4, pos.z);
                _raycaster.set(_rayOrigin, _down);
                _raycaster.far = 200;
                const hits = _raycaster.intersectObject(this.poolBottomMesh, false);
                if (hits.length > 0) return hits[0].point.y + 2;
            }
            return this.poolFloor + 2;
        }

        const dx = pos.x - this.templeBounds.x;
        const dz = pos.z - this.templeBounds.z;
        if (Math.sqrt(dx * dx + dz * dz) < this.templeBounds.grottoSize / 2) {
            return this.grottoWaterLevel;
        }

        return this.eyeHeight;
    }

    updateSwimmingState() {
        const pos = this.camera.position;
        const inMainPool = Math.abs(pos.x) < this.poolBoundary &&
                           Math.abs(pos.z) < this.poolBoundary &&
                           pos.y < this.waterLevel;

        const dx = pos.x - this.templeBounds.x;
        const dz = pos.z - this.templeBounds.z;
        const inGrotto = Math.sqrt(dx * dx + dz * dz) < this.templeBounds.grottoSize / 2 &&
                         pos.y < this.grottoWaterLevel;

        this.isSwimming = inMainPool || inGrotto;
    }

    isInMainRoom(x, z) {
        return Math.abs(x) < this.roomBoundary && Math.abs(z) < this.roomBoundary;
    }

    isOnWalkway(x, z) {
        return Math.abs(x - this.walkwayBounds.x) < this.walkwayBounds.width / 2 &&
               z >= this.walkwayBounds.endZ && z <= this.walkwayBounds.startZ;
    }

    isInTempleArea(x, z) {
        return Math.abs(x - this.templeBounds.x) < this.templeBounds.size / 2 &&
               Math.abs(z - this.templeBounds.z) < this.templeBounds.size / 2;
    }

    getPosition() { return this.camera.position.clone(); }
    isInWater() { return this.isSwimming; }

    getCurrentArea() {
        const p = this.camera.position;
        if (this.isInTempleArea(p.x, p.z)) return 'temple';
        if (this.isOnWalkway(p.x, p.z)) return 'walkway';
        if (this.isInMainRoom(p.x, p.z)) return 'poolroom';
        return 'outside';
    }

    setPosition(x, y, z) {
        this.camera.position.set(x, y, z);
        this.velocity.set(0, 0, 0);
    }

    lookAt(yaw, pitch = 0) {
        this.yaw = yaw;
        this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, pitch));
    }

    reset() {
        this.setPosition(0, this.eyeHeight, 300);
        this.lookAt(0, 0);
    }
}
