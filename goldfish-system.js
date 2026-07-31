// goldfish-system.js - Simple goldfish swimming in the pool
import * as THREE from 'three';

class Goldfish {
    constructor(poolBounds) {
        this.group = new THREE.Group();
        this.group.scale.set(0.4, 0.4, 0.4); // Scale down the whole fish
        // Body
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(6, 16, 16),
            new THREE.MeshPhongMaterial({ color: 0xffa500, shininess: 80 })
        );
        body.scale.set(1.5, 1, 1);
        this.group.add(body);
        // Tail
        const tail = new THREE.Mesh(
            new THREE.ConeGeometry(3, 6, 12),
            new THREE.MeshPhongMaterial({ color: 0xffc04d, shininess: 60 })
        );
        tail.position.set(-9, 0, 0); // Attach to back of body
        tail.rotation.z = Math.PI / 2; // Point tail along -X
        this.group.add(tail);
        // Fins
        const finMat = new THREE.MeshPhongMaterial({ color: 0xffe066, shininess: 60 });
        const fin1 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3, 8), finMat);
        fin1.position.set(0, 3, 2);
        fin1.rotation.x = Math.PI / 2;
        this.group.add(fin1);
        const fin2 = fin1.clone();
        fin2.position.set(0, 3, -2);
        this.group.add(fin2);
        // Eyes
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), eyeMat);
        eye1.position.set(7, 1.5, 2);
        this.group.add(eye1);
        const eye2 = eye1.clone();
        eye2.position.set(7, 1.5, -2);
        this.group.add(eye2);
        // Movement
        this.poolBounds = poolBounds;
        this.reset();
    }
    reset() {
        // Start at random position in pool
        this.group.position.set(
            (Math.random() - 0.5) * this.poolBounds.width * 0.8,
            -10 + Math.random() * 10,
            (Math.random() - 0.5) * this.poolBounds.depth * 0.8
        );
        this.direction = Math.random() * Math.PI * 2;
        this.speed = 8 + Math.random() * 6;
        this.turnTimer = 0;
    }
    update(deltaTime) {
        // Randomly turn
        this.turnTimer -= deltaTime;
        if (this.turnTimer <= 0) {
            this.direction += (Math.random() - 0.5) * 0.8;
            this.turnTimer = 1 + Math.random() * 2;
        }
        // Move forward
        const dx = Math.cos(this.direction) * this.speed * deltaTime;
        const dz = Math.sin(this.direction) * this.speed * deltaTime;
        this.group.position.x += dx;
        this.group.position.z += dz;
        // Stay in pool bounds
        const maxX = this.poolBounds.width/2 - 20;
        const maxZ = this.poolBounds.depth/2 - 20;
        if (Math.abs(this.group.position.x) > maxX || Math.abs(this.group.position.z) > maxZ) {
            this.direction += Math.PI;
        }
        // Wiggle tail
        this.group.children[1].rotation.y = Math.sin(Date.now() * 0.01 + this.group.position.x) * 0.7;
    }
}

export class GoldfishSystem {
    constructor(scene, poolBounds, count = 8) {
        this.scene = scene;
        this.poolBounds = poolBounds;
        this.goldfish = [];
        for (let i = 0; i < count; i++) {
            const fish = new Goldfish(poolBounds);
            this.goldfish.push(fish);
            scene.add(fish.group);
        }
    }
    update(deltaTime) {
        this.goldfish.forEach(fish => fish.update(deltaTime));
    }
} 