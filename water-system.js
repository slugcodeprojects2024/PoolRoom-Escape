// water-system.js — refractive surface, projected caustics, underwater state
import * as THREE from 'three';

const WAVE_GLSL = `
uniform float uTime;
uniform float uWaveAmp;
varying vec3 vWorldPos;

vec3 waveNormalTS(vec2 p, float t, float amplitude) {
    vec2 slope = vec2(0.0);
    float amp = 1.0;
    float freq = 1.0;
    float norm = 0.0;
    for (int i = 0; i < 4; i++) {
        float a = float(i) * 2.399963;
        vec2 dir = vec2(cos(a), sin(a));
        float ph = dot(p * freq, dir) + t * (0.9 + float(i) * 0.37);
        slope += dir * cos(ph) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 1.93;
    }
    slope = slope / norm * amplitude;
    return normalize(vec3(-slope.x, -slope.y, 1.0));
}

float causticPattern(vec2 p, float t) {
    vec2 i = p;
    float c = 1.0;
    const float inten = 0.005;
    for (int n = 0; n < 3; n++) {
        float tt = t * (1.0 - (3.5 / float(n + 1)));
        i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
        c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
    }
    c /= 3.0;
    c = 1.17 - pow(c, 1.4);
    return clamp(pow(abs(c), 8.0), 0.0, 1.0);
}
`;

function flatNormalTexture() {
    // 1x1 neutral normal. Its only job is to make three define
    // USE_NORMALMAP_TANGENTSPACE so the tbn matrix exists for our injection.
    const tex = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
}

export class WaterSystem {
    constructor(scene, opts = {}) {
        this.scene = scene;
        this.size = opts.size || 480;
        this.waterLevel = opts.waterLevel !== undefined ? opts.waterLevel : -0.5;
        this.floorY = opts.floorY !== undefined ? opts.floorY : -90;
        // Higher scale = smaller, tighter ripples. 0.06 is roughly pool chop.
        this.waveScale = opts.waveScale || 0.06;

        this.uniforms = {
            uTime: { value: 0 },
            uWaveAmp: { value: opts.waveAmp !== undefined ? opts.waveAmp : 0.35 },
            uWaterLevel: { value: this.waterLevel },
            uFloorY: { value: this.floorY },
            uCausticStrength: { value: opts.causticStrength !== undefined ? opts.causticStrength : 0.30 },
            uCausticScale: { value: opts.causticScale || 0.13 }
        };

        this.isUnderwater = false;
        this.fogTarget = 0;
        this.fogCurrent = 0;
        this.maxFogDensity = opts.fogDensity || 0.006;

        this.waterGroup = new THREE.Group();
        scene.add(this.waterGroup);

        // Fog must exist from frame one. Assigning scene.fog later changes the
        // shader program cache key and recompiles every material in the scene —
        // that stall is what froze the tab on entering the water.
        if (!scene.fog) scene.fog = new THREE.FogExp2(0x1b6ea8, 0.0);
        this.fog = scene.fog;
        this.aboveColor = new THREE.Color(this.fog.color.getHex());
        this.belowColor = new THREE.Color(0x1b6ea8);
    }

    init() {
        this.createSurface();
    }

    createSurface() {
        const geo = new THREE.PlaneGeometry(this.size, this.size, 1, 1);

        const mat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: 0.08,
            metalness: 0.0,
            transmission: 1.0,
            thickness: 30.0,
            ior: 1.333,
            attenuationColor: new THREE.Color(0x3a9ac9),
            attenuationDistance: 120.0,
            transparent: true,
            side: THREE.DoubleSide,
            normalMap: flatNormalTexture(),
            normalScale: new THREE.Vector2(1, 1)
        });

        const waveScale = this.waveScale;
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.uniforms.uTime;
            shader.uniforms.uWaveAmp = this.uniforms.uWaveAmp;

            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
                .replace(
                    '#include <begin_vertex>',
                    '#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;'
                );

            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', '#include <common>\n' + WAVE_GLSL)
                .replace(
                    '#include <normal_fragment_maps>',
                    `vec3 mapN = waveNormalTS(vWorldPos.xz * ${waveScale.toFixed(4)}, uTime, uWaveAmp);
                     mapN.xy *= normalScale;
                     normal = normalize( tbn * mapN );`
                );

            };

        this.surface = new THREE.Mesh(geo, mat);
        this.surface.rotation.x = -Math.PI / 2;
        this.surface.position.y = this.waterLevel;
        this.surface.renderOrder = 2;
        this.surface.userData.noShadow = true;
        this.surface.userData.noCast = true;
        this.waterGroup.add(this.surface);
        this.material = mat;
    }

    // Call on the pool floor and wall materials so light through the surface
    // actually lands on them. Replaces the placeholder point light.
    applyCaustics(material) {
        if (!material || material.userData.hasCaustics) return material;
        material.userData.hasCaustics = true;

        const u = this.uniforms;
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = u.uTime;
            shader.uniforms.uWaveAmp = u.uWaveAmp;
            shader.uniforms.uWaterLevel = u.uWaterLevel;
            shader.uniforms.uFloorY = u.uFloorY;
            shader.uniforms.uCausticStrength = u.uCausticStrength;
            shader.uniforms.uCausticScale = u.uCausticScale;

            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
                .replace(
                    '#include <begin_vertex>',
                    '#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;'
                );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    '#include <common>\nuniform float uWaterLevel;\nuniform float uFloorY;\nuniform float uCausticStrength;\nuniform float uCausticScale;\n' + WAVE_GLSL
                )
                .replace(
                    '#include <dithering_fragment>',
                    `#include <dithering_fragment>
                     if (vWorldPos.y < uWaterLevel) {
                        float depth01 = clamp((uWaterLevel - vWorldPos.y) / max(1.0, uWaterLevel - uFloorY), 0.0, 1.0);
                        float fade = 1.0 - depth01 * 0.6;
                        float c = causticPattern(vWorldPos.xz * uCausticScale, uTime * 0.4);
                        gl_FragColor.rgb += vec3(0.5, 0.8, 1.0) * c * uCausticStrength * fade;
                     }`
                );
        };
        material.needsUpdate = true;
        return material;
    }

    update(deltaTime, cameraPosition) {
        this.uniforms.uTime.value += deltaTime;

        if (cameraPosition) {
            const submerged = this.isInWater(cameraPosition);
            if (submerged !== this.isUnderwater) {
                this.isUnderwater = submerged;
                this.fogTarget = submerged ? this.maxFogDensity : 0;
            }
        }

        // Density and colour only — never reassign scene.fog itself
        if (Math.abs(this.fogCurrent - this.fogTarget) > 1e-6) {
            this.fogCurrent += (this.fogTarget - this.fogCurrent) * Math.min(1, deltaTime * 4);
            this.fog.density = this.fogCurrent;
            const t = this.maxFogDensity > 0 ? this.fogCurrent / this.maxFogDensity : 0;
            this.fog.color.copy(this.aboveColor).lerp(this.belowColor, t);
        }
    }

    // Live tuning from the console:
    //   poolroomsApp.waterSystem.setWaveAmp(0.2)
    setWaveAmp(a) { this.uniforms.uWaveAmp.value = a; }
    setCaustics(strength) { this.uniforms.uCausticStrength.value = strength; }

    setDepth(floorY, waterLevel) {
        this.floorY = floorY;
        this.waterLevel = waterLevel;
        this.uniforms.uFloorY.value = floorY;
        this.uniforms.uWaterLevel.value = waterLevel;
        if (this.surface) this.surface.position.y = waterLevel;
    }

    isInWater(position) {
        const h = this.size / 2;
        return position.y < this.waterLevel &&
               Math.abs(position.x) < h &&
               Math.abs(position.z) < h;
    }
}