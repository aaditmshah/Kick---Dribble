#ifdef GL_ES
precision highp float;
#endif

attribute vec2 vertexCoord;
attribute vec3 position;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec3 bitangent;

uniform vec3 lightPosition;

uniform mat4 perspectiveMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;

varying vec2 texCoord;
varying vec3 lightTangent;
varying vec3 eyeTangent;

void main(void) {
    vec4 vertexPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = perspectiveMatrix * vertexPosition;
    texCoord = vertexCoord;

    vec3 n = normalize(normal * normalMatrix);
    vec3 t = normalize(tangent * normalMatrix);
    vec3 b = normalize(bitangent * normalMatrix);

    vec3 lightDirection = lightPosition - vertexPosition.xyz;
    lightTangent.x = dot(lightDirection, t);
    lightTangent.y = dot(lightDirection, b);
    lightTangent.z = dot(lightDirection, n);

    vec3 eyeDirection = normalize(-vertexPosition.xyz);
    eyeTangent.x = dot(eyeDirection, t);
    eyeTangent.y = dot(eyeDirection, b);
    eyeTangent.z = dot(eyeDirection, n);
}