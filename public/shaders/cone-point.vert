// cone-point.vert
varying vec3 vNormal;
varying vec2 vUv;
void main() {
    vNormal = normalMatrix * normal;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
} 