/**
 * TrajectoryScene — R3F Canvas hosting the 3D trajectory replay.
 *
 * Component Contract:
 * - Reads: replayData, frameRef, showGrid, showTrail, followGlider from props
 * - Writes: nothing
 * - Behavior: renders glider mesh at current frame position/orientation with
 *   ground plane, optional grid, optional flight trail, and orbit camera controls
 *
 * Coordinate conversion: MuJoCo uses Z-up, Three.js uses Y-up.
 * Positions are converted via mujocoToThree(). Quaternions are converted by
 * reordering [w,x,y,z] → Quaternion(x,z,-y,w) which applies the axis swap.
 */

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { TrajectoryReplayData, TrajectoryFrame } from '../../types/trajectory';
import { buildGliderGeometry } from '../../scene/buildGliderGeometry';

/** Convert MuJoCo position [x,y,z] (Z-up) to Three.js [x,y,z] (Y-up) */
function mujocoToThree(pos: [number, number, number]): [number, number, number] {
  return [pos[0], pos[2], -pos[1]];
}

/** Convert MuJoCo quaternion [w,x,y,z] to Three.js Quaternion */
function mujocoQuatToThree(q: [number, number, number, number]): THREE.Quaternion {
  const [w, x, y, z] = q;
  // Reorder for Three.js constructor (x,y,z,w) with axis swap: y→z, z→-y
  return new THREE.Quaternion(x, z, -y, w);
}

interface GliderMeshProps {
  geometry: THREE.BufferGeometry;
  frames: TrajectoryFrame[];
  frameRef: React.RefObject<number>;
}

function GliderMesh({ geometry, frames, frameRef }: GliderMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    if (!meshRef.current || frames.length === 0) return;
    const idx = Math.min(Math.floor(frameRef.current ?? 0), frames.length - 1);
    const frame = frames[idx];
    const [tx, ty, tz] = mujocoToThree(frame.position);
    meshRef.current.position.set(tx, ty, tz);
    const quat = mujocoQuatToThree(frame.orientation);
    meshRef.current.quaternion.copy(quat);
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhongMaterial color="#cc3333" opacity={0.7} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

interface FlightTrailProps {
  frames: TrajectoryFrame[];
  frameRef: React.RefObject<number>;
  visible: boolean;
}

function FlightTrail({ frames, frameRef, visible }: FlightTrailProps) {
  const lastRebuildRef = useRef(-10);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const lineRef = useRef<THREE.Line>(null!);

  useFrame(() => {
    if (!visible || frames.length === 0) return;
    const upToIndex = Math.min(Math.floor(frameRef.current ?? 0), frames.length - 1);

    // Only rebuild every 5 frames
    if (
      geometryRef.current &&
      Math.abs(upToIndex - lastRebuildRef.current) < 5
    ) {
      return;
    }

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

    if (lineRef.current) {
      lineRef.current.geometry = geo;
    }
  });

  useEffect(() => {
    return () => {
      if (geometryRef.current) geometryRef.current.dispose();
    };
  }, []);

  if (!visible) return null;

  return (
    <line ref={lineRef as any}>
      <bufferGeometry />
      <lineBasicMaterial color="#f59e0b" linewidth={2} />
    </line>
  );
}

interface SceneGridProps {
  visible: boolean;
}

function SceneGrid({ visible }: SceneGridProps) {
  if (!visible) return null;
  return (
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
  );
}

function GroundPlane() {
  return (
    <mesh position={[0, -50.5, 0]}>
      <boxGeometry args={[1500, 1, 1500]} />
      <meshStandardMaterial color="#374151" roughness={0.9} />
    </mesh>
  );
}

interface OrbitControlsWrapperProps {
  followGlider: boolean;
  frames: TrajectoryFrame[];
  frameRef: React.RefObject<number>;
}

function OrbitControlsWrapper({ followGlider, frames, frameRef }: OrbitControlsWrapperProps) {
  const controlsRef = useRef<any>(null!);

  useFrame(() => {
    if (!controlsRef.current || !followGlider || frames.length === 0) return;
    const idx = Math.min(Math.floor(frameRef.current ?? 0), frames.length - 1);
    const [tx, ty, tz] = mujocoToThree(frames[idx].position);
    controlsRef.current.target.set(tx, ty, tz);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
    />
  );
}

interface TrajectorySceneProps {
  replayData: TrajectoryReplayData;
  frameRef: React.RefObject<number>;
  showGrid: boolean;
  showTrail: boolean;
  followGlider: boolean;
}

export function TrajectoryScene({
  replayData,
  frameRef,
  showGrid,
  showTrail,
  followGlider,
}: TrajectorySceneProps) {
  const gliderGeometry = useMemo(() => {
    return buildGliderGeometry(replayData.vertices, replayData.faces);
  }, [replayData.vertices, replayData.faces]);

  useEffect(() => {
    return () => { gliderGeometry.dispose(); };
  }, [gliderGeometry]);

  return (
    <Canvas
      camera={{ position: [80, 60, 80], fov: 50 }}
      gl={{ antialias: true }}
      style={{ background: '#111827' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[200, 300, 200]} intensity={1.2} />
      <OrbitControlsWrapper
        followGlider={followGlider}
        frames={replayData.frames}
        frameRef={frameRef}
      />
      <GliderMesh
        geometry={gliderGeometry}
        frames={replayData.frames}
        frameRef={frameRef}
      />
      <GroundPlane />
      <FlightTrail
        frames={replayData.frames}
        frameRef={frameRef}
        visible={showTrail}
      />
      <SceneGrid visible={showGrid} />
    </Canvas>
  );
}
