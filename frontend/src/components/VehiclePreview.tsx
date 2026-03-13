/**
 * VehiclePreview component
 *
 * Displays an interactive 3D preview of the current vehicle using Three.js.
 *
 * Component Contract:
 * - Reads: vehicle from shared state
 * - Writes: nothing
 * - Behavior: renders vehicle mesh in a 3D scene with orbit controls,
 *   updates instantly when vehicle vertices/faces change (no API call)
 */

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useVehicleStore } from '../state/vehicle-store';
import { buildGliderGeometry } from '../scene/buildGliderGeometry';

function VehicleMesh({ vertices, faces }: { vertices: number[][]; faces: number[][] }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const geometry = useMemo(
    () => buildGliderGeometry(vertices, faces),
    [vertices, faces],
  );

  // Slow auto-rotation
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  // Center the geometry
  useEffect(() => {
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox?.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    return () => { geometry.dispose(); };
  }, [geometry]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhongMaterial
        color="#cc3333"
        opacity={0.7}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function VehiclePreview() {
  const vehicle = useVehicleStore((state) => state.vehicle);
  const hasVehicle = vehicle.vertices !== null && vehicle.vertices.length > 0;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 rounded-lg">
      {!hasVehicle ? (
        <div className="text-gray-400 text-center">
          <p className="text-lg">Generate a vehicle to see a preview</p>
        </div>
      ) : (
        <Canvas
          camera={{ position: [8, 6, 8], fov: 45 }}
          gl={{ antialias: true }}
          style={{ background: '#111827', borderRadius: '0.5rem' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 15, 10]} intensity={1} />
          <directionalLight position={[-10, -5, -10]} intensity={0.3} />
          <VehicleMesh
            vertices={vehicle.vertices!}
            faces={vehicle.faces ?? []}
          />
          <OrbitControls enableDamping dampingFactor={0.05} />
        </Canvas>
      )}
    </div>
  );
}
