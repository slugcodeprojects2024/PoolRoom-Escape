// blockout-main.js — standalone entry for walking the grey-box level
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraControls } from './camera-controls.js';
import { Blockout } from './blockout.js';
import { LEVEL, wingCenter } from './level-config.js';
import { BlockoutEditor } from './blockout-editor.js';
import { BlockoutTools } from './blockout-tools.js';

const _down = new THREE.Vector3(0, -1, 0);
const _origin = new THREE.Vector3();
const _ray = new THREE.Raycaster();

class BlockoutApp {
    async init() {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();

        this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 12000);
        this.camera.rotation.order = 'YXZ';
        this.camera.position.set(...LEVEL.player.spawn);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(innerWidth, innerHeight);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        this.sunDirection = new THREE.Vector3(0.55, 0.42, 0.72).normalize();
        this.setupSky();
        this.setupLights();

        this.blockout = new Blockout(this.scene).build();
        this.tools = new BlockoutTools(this);
        await this.tools.loadFromDisk();
        this.editor = new BlockoutEditor(this);

        this.controls = new CameraControls(this.camera, this.renderer.domElement, null, {
            eyeHeight: LEVEL.player.eyeHeight,
            walkSpeed: LEVEL.player.walkSpeed,
            sprintMultiplier: LEVEL.player.sprintMultiplier,
            swimSpeed: LEVEL.player.swimSpeed,
            jumpVelocity: LEVEL.player.jumpVelocity,
            gravity: LEVEL.player.gravity,
            boundsEnabled: false,
            waterLevel: LEVEL.pool.waterLevel,
            poolBoundary: LEVEL.pool.width / 2,
            poolFloor: -LEVEL.pool.depthBelow,
            groundQuery: (pos) => this.groundAt(pos)
        });
        this.controls.init();

        addEventListener('resize', () => {
            this.camera.aspect = innerWidth / innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(innerWidth, innerHeight);
        });

        this.hud = document.getElementById('hud');
        this.animate();
    }

    wingCenter(name) { return wingCenter(name); }

    // Tear down and regenerate from LEVEL. Cheap enough at blockout fidelity
    // that live editing stays responsive.
    rebuild() {
        this.scene.remove(this.blockout.root);
        this.blockout.root.traverse(o => {
            if (o.isMesh || o.isInstancedMesh) o.geometry?.dispose();
        });
        this.blockout = new Blockout(this.scene).build();
    }

    setupSky() {
        const sky = new Sky();
        sky.scale.setScalar(450000);
        const u = sky.material.uniforms;
        u.turbidity.value = 4;
        u.rayleigh.value = 2;
        u.mieCoefficient.value = 0.005;
        u.mieDirectionalG.value = 0.8;
        u.sunPosition.value.copy(this.sunDirection);
        this.scene.add(sky);

        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environmentIntensity = 0.75;
    }

    setupLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.06));
        this.scene.add(new THREE.HemisphereLight(0xbcd8ff, 0xe8e2d2, 0.5));

        const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
        sun.position.copy(this.sunDirection).multiplyScalar(400);
        sun.castShadow = true;
        const s = sun.shadow;
        s.mapSize.set(4096, 4096);
        s.camera.left = -140; s.camera.right = 140;
        s.camera.top = 140;   s.camera.bottom = -140;
        s.camera.near = 1;    s.camera.far = 900;
        s.bias = -0.0002;
        s.normalBias = 0.05;   // metric scale — small values now work
        s.camera.updateProjectionMatrix();
        this.scene.add(sun, sun.target);
    }

    // Raycast down onto blockout collision meshes. This is the pattern the
    // real level should use — one query, no scattered clamps.
    groundAt(pos) {
        _origin.set(pos.x, pos.y + 3, pos.z);
        _ray.set(_origin, _down);
        _ray.far = 400;
        const hits = _ray.intersectObjects(this.blockout.collision, false);
        if (hits.length > 0) return hits[0].point.y + LEVEL.player.eyeHeight;
        return -LEVEL.pool.depthBelow + LEVEL.player.eyeHeight;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = this.clock.getDelta();
        // Movement stays live in edit mode; mouse look is naturally
        // suppressed because CameraControls only applies it under pointer lock.
        this.controls.update(dt);
        this.tools.update();

        const p = this.camera.position;
        this.hud.textContent =
            `x ${p.x.toFixed(1)}  y ${p.y.toFixed(1)}  z ${p.z.toFixed(1)}   ` +
            `${this.controls.getCurrentArea?.() || ''}  ` +
            `${this.controls.isSwimming ? 'swimming' : this.controls.onGround ? 'ground' : 'air'}`;

        this.renderer.render(this.scene, this.camera);
    }
}

const app = new BlockoutApp();
app.init();
window.blockoutApp = app;
