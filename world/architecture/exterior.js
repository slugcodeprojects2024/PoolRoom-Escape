// world/architecture/exterior.js — extracted from poolroom-world.js
import * as THREE from 'three';

export const ExteriorMixin = {

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
    const fieldMat = new THREE.MeshStandardMaterial({ color: 0x3ecf4a, side: THREE.DoubleSide });
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.rotation.x = -Math.PI / 2;
    field.position.y = -0.2;
    this.scene.add(field);
    // Add hot tub mesh in grotto area
    const hotTub = new THREE.Mesh(
        new THREE.CylinderGeometry(60, 60, 8, 48),
        new THREE.MeshStandardMaterial({ color: 0x87ceeb, roughness: 0.25, metalness: 0.0 })
    );
    hotTub.position.set(grottoX, 4, grottoZ);
    this.scene.add(hotTub);
    // Add hot tub water surface
    const hotTubWater = new THREE.Mesh(
        new THREE.CircleGeometry(58, 48),
        new THREE.MeshStandardMaterial({ color: 0xb0e0ff, roughness: 0.2, metalness: 0.0, transparent: true, opacity: 0.7 })
    );
    hotTubWater.rotation.x = -Math.PI / 2;
    hotTubWater.position.set(grottoX, 8, grottoZ);
    this.scene.add(hotTubWater);
},

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

};