/**
 * MultiTrajectoryScene — R3F Canvas rendering multiple vehicles simultaneously.
 *
 * Extends the single-vehicle TrajectoryScene pattern to support N vehicles,
 * each with its own mesh, color, trail, and label.
 *
 * Coordinate conversion: MuJoCo (Z-up) → Three.js (Y-up).
 */

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { TrajectoryFrame } from '../../types/trajectory';
import type { MultiVehicleEntry } from '../../types/multiTrajectory';
import { buildGliderGeometry } from '../../scene/buildGliderGeometry';

function mujocoToThree(pos: [number, number, number]): [number, number, number] {
  return [pos[0], pos[2], -pos[1]];
}

function mujocoQuatToThree(q: [number, number, number, number]): THREE.Quaternion {
  const [w, x, y, z] = q;
  return new THREE.Quaternion(x, z, -y, w);
}

// -- Per-vehicle components ---------------------------------------------------

interface VehicleMeshProps {
  geometry: THREE.BufferGeometry;
  frames: TrajectoryFrame[];
  frameRef: React.RefObject<number>;
  color: string;
  label: string;
}

function VehicleMesh({ geometry, frames, frameRef, color, label }: VehicleMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!meshRef.current || frames.length === 0) return;
    const idx = Math.min(Math.floor(frameRef.current ?? 0), frames.length - 1);
    const frame = frames[idx];
    const [tx, ty, tz] = mujocoToThree(frame.position);
    groupRef.current.position.set(tx, ty, tz);
    const quat = mujocoQuatToThree(frame.orientation);
    meshRef.current.quaternion.copy(quat);
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshPhongMaterial color={color} opacity={0.8} transparent side={THREE.DoubleSide} />
      </mesh>
      <Html distanceFactor={100} style={{ pointerEvents: 'none' }}>
        <div style={{
          color,
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
          transform: 'translate(12px, -8px)',
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

interface VehicleTrailProps {
  frames: TrajectoryFrame[];
  frameRef: React.RefObject<number>;
  color: string;
  visible: boolean;
}

function VehicleTrail({ frames, frameRef, color, visible }: VehicleTrailProps) {
  const lastRebuildRef = useRef(-10);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const lineRef = useRef<THREE.Line>(null!);

  useFrame(() => {
    if (!visible || frames.length === 0) return;
    const upToIndex = Math.min(Math.floor(frameRef.current ?? 0), frames.length - 1);

    if (geometryRef.current && Math.abs(upToIndex - lastRebuildRef.current) < 5) return;

    const count = Math.min(upToIndex + 1, frames.length);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const [tx, ty, tz] = mujocoToThree(frames[i].position);
      positions[i * 3] = tx;
      positions[i * 3 + 1] = ty;
      positions[i * 3 + 2] = tz;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    if (geometryRef.current) geometryRef.current.dispose();
    geometryRef.current = geo;
    lastRebuildRef.current = upToIndex;

    if (lineRef.current) lineRef.current.geometry = geo;
  });

  useEffect(() => {
    return () => { if (geometryRef.current) geometryRef.current.dispose(); };
  }, []);

  if (!visible) return null;

  return (
    <line ref={lineRef as any}>
      <bufferGeometry />
      <lineBasicMaterial color={color} linewidth={2} />
    </line>
  );
}

// -- Wind indicator -----------------------------------------------------------

function WindArrow({ wind }: { wind: [number, number, number] }) {
  const [wx, , wz] = wind; // only show horizontal wind
  const mag = Math.sqrt(wx * wx + wz * wz);
  if (mag < 0.1) return null;

  const angle = Math.atan2(-wz, wx);
  return (
    <group position={[-20, 30, 0]} rotation={[0, angle, 0]}>
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, 8, 8]} />
        <meshStandardMaterial color="#ffffff" opacity={0.4} transparent />
      </mesh>
      <mesh position={[0, 5, 0]}>
        <coneGeometry args={[1, 3, 8]} />
        <meshStandardMaterial color="#ffffff" opacity={0.4} transparent />
      </mesh>
      <Html distanceFactor={80} position={[0, -6, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          color: '#aaa', fontSize: '11px', fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}>
          Wind {mag.toFixed(1)} m/s
        </div>
      </Html>
    </group>
  );
}

// -- Main scene ---------------------------------------------------------------

interface MultiTrajectorySceneProps {
  vehicles: MultiVehicleEntry[];
  wind: [number, number, number];
  frameRef: React.RefObject<number>;
  showGrid: boolean;
  showTrail: boolean;
  followVehicle: number | null; // index of vehicle to follow, or null for free cam
  transparent?: boolean;
}

export function MultiTrajectoryScene({
  vehicles,
  wind,
  frameRef,
  showGrid,
  showTrail,
  followVehicle,
  transparent = false,
}: MultiTrajectorySceneProps) {
  const geometries = useMemo(() => {
    return vehicles.map(v => buildGliderGeometry(v.vertices, v.faces));
  }, [vehicles]);

  useEffect(() => {
    return () => { geometries.forEach(g => g.dispose()); };
  }, [geometries]);

  const controlsRef = useRef<any>(null!);

  function CameraFollow() {
    useFrame(() => {
      if (followVehicle === null || !controlsRef.current) return;
      const v = vehicles[followVehicle];
      if (!v || v.frames.length === 0) return;
      const idx = Math.min(Math.floor(frameRef.current ?? 0), v.frames.length - 1);
      const [tx, ty, tz] = mujocoToThree(v.frames[idx].position);
      controlsRef.current.target.set(tx, ty, tz);
      controlsRef.current.update();
    });
    return null;
  }

  return (
    <Canvas
      camera={{ position: [80, 60, 80], fov: 50 }}
      gl={{ antialias: true, alpha: transparent }}
      style={{ background: transparent ? 'transparent' : '#111827' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[200, 300, 200]} intensity={1.2} />
      <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} />
      <CameraFollow />

      {vehicles.map((v, i) => (
        <group key={v.label}>
          <VehicleMesh
            geometry={geometries[i]}
            frames={v.frames}
            frameRef={frameRef}
            color={v.color}
            label={v.label}
          />
          <VehicleTrail
            frames={v.frames}
            frameRef={frameRef}
            color={v.color}
            visible={showTrail}
          />
        </group>
      ))}

      <WindArrow wind={wind} />

      {showGrid && (
        <Grid
          position={[0, -50, 0]}
          args={[1500, 1500]}
          cellSize={10}
          cellThickness={0.5}
          cellColor="#4b5563"
          sectionSize={50}
          sectionThickness={1}
          sectionColor="#6b7280"
          fadeDistance={500}
          fadeStrength={1}
          infiniteGrid={false}
        />
      )}

      {!transparent && (
        <mesh position={[0, -50.5, 0]}>
          <boxGeometry args={[1500, 1, 1500]} />
          <meshStandardMaterial color="#374151" roughness={0.9} />
        </mesh>
      )}
    </Canvas>
  );
}
