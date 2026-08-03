// world/lighting.js — extracted from poolroom-world.js
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export const LightingMixin = {

async createBasicSkybox() {
    // Atmospheric sky (vertical depth) until Phase 6 cubemap
    const sky = new Sky();
    sky.scale.setScalar(450000);
    sky.userData.noShadow = true;
    this.scene.add(sky);

    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = 2;
    uniforms['rayleigh'].value = 1;
    uniforms['mieCoefficient'].value = 0.001;
    uniforms['mieDirectionalG'].value = 0.8;

    uniforms['sunPosition'].value.copy(this.sunDirection).normalize();

    this.scene.background = null;
    this.sky = sky;
},

setupLighting() {
    // Fill only — everything else should come from a direction
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    this.scene.add(this.ambientLight);

    // Desaturated ground color so it stops tinting the white tile green
    // 0.7 + env 0.9 blew out white tile around window openings
    this.hemiLight = new THREE.HemisphereLight(0xbcd8ff, 0xf2f0ec, 0.55);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    this.sunLight.position.copy(this.sunDirection);   // off-axis: rakes instead of flattens
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

    // Placeholder fill disabled — was blowing out walls/sky through openings.
    // Phase 3 water transmission / caustics replaces this.
    // const poolLight = new THREE.PointLight(0xaee6ff, 12000, 180, 2);
    // poolLight.position.set(0, -40, 0);
    // this.scene.add(poolLight);
    // this.poolLight = poolLight;
},

enableShadows() {
    this.scene.traverse(obj => {
        if (!obj.isMesh || obj.userData.noShadow) return;
        obj.castShadow = !obj.userData.noCast;
        obj.receiveShadow = true;
    });
},

createTorchLights(templeZ) {
    // Removed: no torch lights
},

createVaporwaveLighting(templeZ) {
    // Removed: no perimeter accent lights or central lighting balls
}

};