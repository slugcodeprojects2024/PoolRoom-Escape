// goldfish-system.js — low-poly screensaver fish
import * as THREE from 'three';

const SPECIES = [
    { body: 0xff8c1a, fin: 0xffc04d, tail: 0xffd98a, scale: 1.00, speed: 1.00 },
    { body: 0xff4d6d, fin: 0xff92a8, tail: 0xffc2cd, scale: 0.85, speed: 1.15 },
    { body: 0x33c4ff, fin: 0x8ce0ff, tail: 0xc2f0ff, scale: 0.95, speed: 1.05 },
    { body: 0xffe14d, fin: 0xfff08c, tail: 0xfff7c2, scale: 0.70, speed: 1.35 },
    { body: 0x9d6bff, fin: 0xc4a3ff, tail: 0xe0d1ff, scale: 1.15, speed: 0.85 },
    { body: 0x2fe0a0, fin: 0x8cf0cc, tail: 0xc2f7e4, scale: 0.90, speed: 1.10 },
    { body: 0xff5f2e, fin: 0xff9c78, tail: 0xffd0bc, scale: 1.30, speed: 0.75 }
];

function fishMat(color) {
    // Flat saturated colour with a hard specular pop — the screensaver look.
    return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.0,
        emissive: color,
        emissiveIntensity: 0.12
    });
}

class Goldfish {
    constructor(bounds, species) {
        const s = species;
        this.group = new THREE.Group();
        this.group.scale.setScalar(1.1 * s.scale);

        const bodyMat = fishMat(s.body);
        const finMat = fishMat(s.fin);
        const tailMat = fishMat(s.tail);

        const body = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 10), bodyMat);
        body.scale.set(1.5, 1, 0.8);
        this.group.add(body);

        // Tail pivots from its own root so the wiggle sweeps instead of sliding
        this.tailPivot = new THREE.Group();
        this.tailPivot.position.set(-8, 0, 0);
        this.group.add(this.tailPivot);

        const tail = new THREE.Mesh(new THREE.ConeGeometry(4, 7, 4), tailMat);
        tail.position.set(-3.5, 0, 0);
        tail.rotation.z = Math.PI / 2;
        tail.scale.set(1, 1, 0.35);
        this.tailPivot.add(tail);

        const dorsal = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 4), finMat);
        dorsal.position.set(-1, 5, 0);
        dorsal.scale.set(1, 1, 0.3);
        this.group.add(dorsal);

        this.fins = [];
        for (const z of [3.5, -3.5]) {
            const fin = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 4), finMat);
            fin.position.set(1, -1, z);
            fin.rotation.x = z > 0 ? Math.PI / 2 : -Math.PI / 2;
            fin.scale.set(1, 1, 0.4);
            this.group.add(fin);
            this.fins.push(fin);
        }

        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.2 });
        for (const z of [2.6, -2.6]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), eyeMat);
            eye.position.set(6.5, 1.4, z);
            this.group.add(eye);
        }

        this.bounds = bounds;
        this.speedMul = s.speed;
        this.phase = Math.random() * Math.PI * 2;
        this.reset();
    }

    reset() {
        const b = this.bounds;
        this.group.position.set(
            (Math.random() - 0.5) * b.width * 0.8,
            b.floorY + 8 + Math.random() * (b.surfaceY - b.floorY - 16),
            (Math.random() - 0.5) * b.depth * 0.8
        );
        this.direction = Math.random() * Math.PI * 2;
        this.targetDir = this.direction;
        this.pitch = 0;
        this.targetPitch = 0;
        this.bank = 0;
        this.speed = (9 + Math.random() * 7) * this.speedMul;
        this.turnTimer = Math.random() * 2;
    }

    update(dt, t) {
        const b = this.bounds;
        const pos = this.group.position;

        this.turnTimer -= dt;
        if (this.turnTimer <= 0) {
            this.targetDir += (Math.random() - 0.5) * 1.6;
            this.targetPitch = (Math.random() - 0.5) * 0.5;
            this.turnTimer = 1.5 + Math.random() * 2.5;
        }

        // Steer away from walls before hitting them, instead of snapping 180°
        const marginX = b.width / 2 - 40;
        const marginZ = b.depth / 2 - 40;
        if (Math.abs(pos.x) > marginX || Math.abs(pos.z) > marginZ) {
            this.targetDir = Math.atan2(-pos.z, -pos.x);
        }
        if (pos.y < b.floorY + 12) this.targetPitch = 0.35;
        if (pos.y > b.surfaceY - 12) this.targetPitch = -0.35;

        // Shortest-path angle lerp so they never spin the long way round
        let diff = ((this.targetDir - this.direction + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const turnRate = diff * Math.min(1, dt * 2.0);
        this.direction += turnRate;
        this.pitch += (this.targetPitch - this.pitch) * Math.min(1, dt * 1.5);

        // Bank into the turn — the detail that sells it as swimming
        this.bank += (-turnRate * 14 - this.bank) * Math.min(1, dt * 4);
        this.bank = Math.max(-0.6, Math.min(0.6, this.bank));

        const fwd = this.speed * dt;
        pos.x += Math.cos(this.direction) * fwd * Math.cos(this.pitch);
        pos.z += Math.sin(this.direction) * fwd * Math.cos(this.pitch);
        pos.y += Math.sin(this.pitch) * fwd + Math.sin(t * 1.4 + this.phase) * dt * 2.5;
        pos.y = Math.max(b.floorY + 5, Math.min(b.surfaceY - 5, pos.y));

        // Body is modelled along +X, so heading maps to -direction
        this.group.rotation.set(0, -this.direction, 0);
        this.group.rotateZ(this.pitch);
        this.group.rotateX(this.bank);

        const wag = Math.sin(t * 9 + this.phase) * 0.5;
        this.tailPivot.rotation.y = wag;
        this.fins[0].rotation.z = wag * 0.3;
        this.fins[1].rotation.z = -wag * 0.3;
    }
}

export class GoldfishSystem {
    constructor(scene, poolBounds, count = 14) {
        this.scene = scene;
        this.time = 0;
        this.bounds = {
            width: poolBounds.width,
            depth: poolBounds.depth,
            floorY: poolBounds.floorY !== undefined ? poolBounds.floorY : -18,
            surfaceY: poolBounds.waterLevel !== undefined ? poolBounds.waterLevel : -0.5
        };
        this.goldfish = [];
        for (let i = 0; i < count; i++) {
            const species = SPECIES[i % SPECIES.length];
            const fish = new Goldfish(this.bounds, species);
            fish.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
            this.goldfish.push(fish);
            scene.add(fish.group);
        }
    }

    update(deltaTime) {
        this.time += deltaTime;
        for (const fish of this.goldfish) fish.update(deltaTime, this.time);
    }

    setDepth(floorY, surfaceY) {
        this.bounds.floorY = floorY;
        this.bounds.surfaceY = surfaceY;
    }
}