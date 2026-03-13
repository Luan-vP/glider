/**
 * Type definitions for trajectory replay data.
 * Must match backend Pydantic models in src/glider/serving/schema.py
 */

export interface TrajectoryFrame {
  time: number;
  /** [x, y, z] in MuJoCo world coordinates */
  position: [number, number, number];
  /** [w, x, y, z] quaternion in MuJoCo convention */
  orientation: [number, number, number, number];
}

export interface TrajectoryReplayData {
  fitness: number;
  sample_rate: number;
  frames: TrajectoryFrame[];
  vertices: number[][];
  faces: number[][];
}
