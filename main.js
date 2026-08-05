// main.js - Fixed Three.js Poolrooms Application Entry Point
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraControls } from './camera-controls.js';
import { PoolroomWorld } from './poolroom-world.js';
import { WaterSystem } from './water-system.js';
import { CollectiblesManager } from './collectibles-manager.js';
import { GoldfishSystem } from './goldfish-system.js';
import { AudioManager } from './audio-manager.js';

class PoolroomsApp {
    constructor() {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        // Game systems
        this.cameraControls = null;
        this.poolroomWorld = null;
        this.waterSystem = null;
        this.collectiblesManager = null;
        this.goldfishSystem = null;
        this.audio = null;
        
        // State
        this.isInitialized = false;
    }
    
    async init() {
        console.log('🏊‍♂️ Initializing Poolrooms Three.js Application...');
        
        try {
            // Initialize Three.js core
            this.initThreeJS();

            this.audio = new AudioManager();
            
            // Create world
            this.poolroomWorld = new PoolroomWorld(this.scene);
            await this.poolroomWorld.init();
            
            // Setup camera controls
            this.cameraControls = new CameraControls(
                this.camera,
                this.renderer.domElement,
                this.poolroomWorld.getPoolBottomMesh(),
                this.poolroomWorld.invisibleWalls
            );
            this.cameraControls.init();
            
            // Initialize water system, sized from the pool it sits in
            const pb = this.poolroomWorld.getPoolBounds();
            this.waterSystem = new WaterSystem(this.scene, {
                size: pb.width,
                waterLevel: pb.waterLevel,
                floorY: pb.floorY
            });
            this.waterSystem.init();

            // Inject caustics into every surface below the waterline.
            // Must run before first render — onBeforeCompile only fires on compile.
            if (this.poolroomWorld.poolSurfaceMaterials) {
                this.poolroomWorld.poolSurfaceMaterials.forEach(
                    m => this.waterSystem.applyCaustics(m)
                );
            }
            
            // Initialize collectibles
            this.collectiblesManager = new CollectiblesManager(this.scene);
            await this.collectiblesManager.init();
            
            // After poolroomWorld is created and pool is initialized
            this.goldfishSystem = new GoldfishSystem(
                this.scene,
                this.poolroomWorld.getPoolBounds(),
                14
            );

            this.poolroomWorld.enableShadows();
            
            // Start render loop
            this.animate();
            
            // Hide loading screen
            document.getElementById('loading').style.display = 'none';
            
            this.isInitialized = true;
            console.log('✅ Poolrooms application initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize poolrooms:', error && error.stack ? error.stack : error);
            document.getElementById('loading').innerHTML = 
                '<div style="color: red;">❌ Failed to load poolrooms</div>';
        }
    }
    
    initThreeJS() {
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 6000);
        this.camera.rotation.order = 'YXZ';   // stops roll-wobble when yaw+pitch combine
        this.camera.position.set(0, 20, 250);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.85;
        
        // Add to DOM
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);

        const pmrem = new THREE.PMREMGenerator(this.renderer);
        pmrem.compileEquirectangularShader();
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environmentIntensity = 0.70;
        
        console.log('🎮 Three.js core initialized with fixed camera position');
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.isInitialized) return;
        
        const deltaTime = this.clock.getDelta();
        
        // Update systems
        if (this.cameraControls) {
            this.cameraControls.update(deltaTime);
        }

        if (this.audio && this.cameraControls) {
            this.audio.updateListener(this.camera);
            this.audio.updateFootsteps(
                this.camera.position,
                this.cameraControls.velocity.lengthSq() > 100,
                this.cameraControls.onGround,
                this.cameraControls.isSwimming
            );
        }
        
        if (this.waterSystem) {
            this.waterSystem.update(deltaTime, this.camera.position);
        }
        
        if (this.collectiblesManager) {
            this.collectiblesManager.update(deltaTime, this.camera.position);
        }
        
        // Animate art gallery shapes
        if (this.poolroomWorld && this.poolroomWorld.updateAnimatedShapes) {
            this.poolroomWorld.updateAnimatedShapes(deltaTime);
        }
        
        // Update goldfish system
        if (this.goldfishSystem) this.goldfishSystem.update(deltaTime);
        
        // Update UI
        this.updateUI();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    updateUI() {
        // Removed status and environment UI update since #status no longer exists
        // Only update collectibles counter
        if (this.collectiblesManager) {
            const collected = this.collectiblesManager.getCollectedCount();
            const total = this.collectiblesManager.getTotalCount();
            document.getElementById('collectibles-counter').textContent = 
                `Collectibles: ${collected}/${total}`;
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Public API for debugging
    getCamera() { return this.camera; }
    getScene() { return this.scene; }
    getRenderer() { return this.renderer; }
}

// Initialize application when page loads
const app = new PoolroomsApp();

// Start the application
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Make app available globally for debugging
window.poolroomsApp = app;