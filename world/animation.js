// world/animation.js — extracted from poolroom-world.js
import * as THREE from 'three';

export const AnimationMixin = {

updateAnimatedShapes(deltaTime) {
    if (this.galleryCylinder) this.galleryCylinder.rotation.y += 0.3 * deltaTime;
    if (this.gallerySphere) this.gallerySphere.rotation.x += 0.4 * deltaTime;
    if (this.galleryCube) this.galleryCube.rotation.y += 0.5 * deltaTime;
    if (this.galleryCone) this.galleryCone.rotation.y += 0.2 * deltaTime;
    // Animate altar cones and SpotLights through vaporwave colors (no float)
    if (this.altarCubes && this.altarSpotLights) {
        const t = Date.now() * 0.0005;
        const colors = [0xff69b4, 0x8ec5fc, 0x6a82fb, 0xf7971e, 0x43e97b, 0x38f9d7];
        this.altarCubes.forEach((cone, i) => {
            const colorIdx = Math.floor((t + i/6) % colors.length);
            const nextIdx = (colorIdx + 1) % colors.length;
            const lerp = (t + i/6) % 1;
            // Lerp between two colors
            const c1 = new THREE.Color(colors[colorIdx]);
            const c2 = new THREE.Color(colors[nextIdx]);
            cone.material.color.lerpColors(c1, c2, lerp);
            // Animate SpotLight color to match
            if (this.altarSpotLights && this.altarSpotLights[i]) {
                this.altarSpotLights[i].color.lerpColors(c1, c2, lerp);
            }
        });
    }
    // Smooth color lerp for gallery shapes
    this.colorLerpElapsed += deltaTime;
    let t = Math.min(this.colorLerpElapsed / this.colorLerpTime, 1.0);
    // Cylinder
    if (this.galleryCylinder) {
        this.galleryCylinder.material.color.lerpColors(this.galleryShapeColors[0].from, this.galleryShapeColors[0].to, t);
    }
    // Sphere
    if (this.gallerySphere) {
        this.gallerySphere.material.color.lerpColors(this.galleryShapeColors[1].from, this.galleryShapeColors[1].to, t);
    }
    // Cube
    if (this.galleryCube) {
        this.galleryCube.material.color.lerpColors(this.galleryShapeColors[2].from, this.galleryShapeColors[2].to, t);
    }
    // Cone
    if (this.galleryCone) {
        this.galleryCone.material.color.lerpColors(this.galleryShapeColors[3].from, this.galleryShapeColors[3].to, t);
    }
    // When finished, pick new random colors
    if (this.colorLerpElapsed >= this.colorLerpTime) {
        this.colorLerpElapsed = 0;
        for (let i = 0; i < 4; i++) {
            this.galleryShapeColors[i].from.copy(this.galleryShapeColors[i].to);
            this.galleryShapeColors[i].to.setHSL(Math.random(), 0.7 + 0.3 * Math.random(), 0.45 + 0.2 * Math.random());
        }
    }
}

};