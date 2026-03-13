/**
 * Pure Three.js geometry builder — no React dependencies.
 * Converts raw vertex/face arrays into a BufferGeometry.
 */
import * as THREE from 'three';

export function buildGliderGeometry(
  vertices: number[][],
  faces: number[][],
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // Flatten vertices into Float32Array
  const positions = new Float32Array(vertices.length * 3);
  for (let i = 0; i < vertices.length; i++) {
    positions[i * 3] = vertices[i][0];
    positions[i * 3 + 1] = vertices[i][1];
    positions[i * 3 + 2] = vertices[i][2];
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Flatten face indices
  if (faces.length > 0) {
    const indices = new Uint32Array(faces.length * 3);
    for (let i = 0; i < faces.length; i++) {
      indices[i * 3] = faces[i][0];
      indices[i * 3 + 1] = faces[i][1];
      indices[i * 3 + 2] = faces[i][2];
    }
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  }

  geometry.computeVertexNormals();
  return geometry;
}
