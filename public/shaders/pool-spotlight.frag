uniform vec3 spotPosition;
uniform vec3 spotColor;
uniform float spotIntensity;
uniform float spotAngle;
uniform float spotDecay;
uniform float spotDistance;
varying vec3 vWorldPosition;

void main() {
    // Pool base color
    vec3 baseColor = vec3(0.1, 0.4, 0.8);

    // Vector from light to fragment
    vec3 lightDir = normalize(vWorldPosition - spotPosition);
    float dist = length(vWorldPosition - spotPosition);

    // Spotlight cone
    float theta = dot(lightDir, vec3(0.0, -1.0, 0.0)); // Downward
    float epsilon = spotAngle;
    float intensity = smoothstep(epsilon, epsilon * 0.8, theta);

    // Attenuation
    float attenuation = spotIntensity / (1.0 + spotDecay * dist * dist);
    attenuation *= step(dist, spotDistance);

    // Final color
    vec3 color = baseColor + spotColor * intensity * attenuation;
    gl_FragColor = vec4(color, 1.0);
} 