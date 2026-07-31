// cone-point.frag
precision mediump float;
varying vec3 vNormal;
varying vec2 vUv;
uniform vec3 uColor;
uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform vec3 uViewPos;
void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPos - (gl_FragCoord.xyz));
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * uLightColor;
    // Simple specular
    vec3 viewDir = normalize(uViewPos - (gl_FragCoord.xyz));
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 16.0);
    vec3 specular = 0.3 * spec * uLightColor;
    vec3 color = (diffuse + specular) * uColor;
    gl_FragColor = vec4(color, 1.0);
} 