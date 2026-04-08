/**
 * Type definitions for multi-vehicle trajectory replay data.
 * Matches the JSON output of scripts/multi_drop_comparison.py
 */

import type { TrajectoryFrame } from './trajectory';

export interface MultiVehicleEntry {
  label: string;
  color: string;
  vertices: number[][];
  faces: number[][];
  frames: TrajectoryFrame[];
}

export interface MultiTrajectoryData {
  wind: [number, number, number];
  sample_rate: number;
  drop_height: number;
  vehicles: MultiVehicleEntry[];
}
