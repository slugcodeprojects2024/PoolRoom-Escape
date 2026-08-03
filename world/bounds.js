// world/bounds.js — extracted from poolroom-world.js
import * as THREE from 'three';

export const BoundsMixin = {

getPoolBounds() {
    return {
        width: this.poolWidth,
        depth: this.poolDepth,
        depthValue: this.poolDepthValue,
        floorY: -this.poolDepthValue,
        waterLevel: -0.5
    };
},

getRoomBounds() {
    return {
        size: this.roomSize,
        height: this.wallHeight
    };
},

getWalkwayBounds() {
    return {
        x: 0,        // CENTERED
        startZ: -this.roomSize/2,
        endZ: -this.roomSize/2 - this.walkwayLength,
        width: this.walkwayWidth
    };
},

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
},

getPoolBottomMesh() {
    return this.poolBottomMesh;
}

};