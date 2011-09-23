#ifdef GL_ES
precision highp float;
#endif

varying vec2 texCoord;
varying vec3 lightTangent;
varying vec3 eyeTangent;

uniform sampler2D textureMap;
uniform sampler2D normalMap;

uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;

uniform float shininess;

void main(void) {
    vec3 lightDirection = normalize(lightTangent);
    vec3 eyeDirection = normalize(eyeTangent);

    vec3 normal = normalize(2.0 * (texture2D(normalMap, texCoord.st).rgb - 0.5));
    vec4 fragColor = texture2D(textureMap, texCoord.st);

    float diffuseFactor = max(dot(lightDirection, normal), 0.0);

    vec3 reflectedDirection = reflect(-lightDirection, normal);
    float specularFactor = pow(max(dot(reflectedDirection, eyeDirection), 0.0), shininess);

    vec3 lightWeighting = ambientColor + (diffuseFactor * diffuseColor) + (specularFactor * specularColor);

    gl_FragColor = vec4(fragColor.rgb * lightWeighting, fragColor.a);
}