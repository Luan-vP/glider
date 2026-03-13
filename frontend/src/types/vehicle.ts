/**
 * Type definitions for vehicle geometry and state.
 * These types must match the backend Pydantic models exactly.
 * Source: src/glider/serving/schema.py
 */

/**
 * Shape type identifiers.
 */
export type ShapeType = 'point_cloud' | 'naca' | 'parametric';

/**
 * Parameters for NACA 4/5-digit airfoil profiles.
 */
export interface NacaParams {
  /** NACA digit string (4 or 5 digits, e.g. "2412" or "23012") */
  digits: string;
  /** Wing span in metres */
  span: number;
  /** Chord length in metres */
  chord: number;
}

/**
 * Parameters for parametric airfoil shape.
 */
export interface ParametricParams {
  /** Maximum camber as fraction of chord (0.0–0.1) */
  max_camber: number;
  /** Chordwise position of maximum camber (0.1–0.9) */
  camber_position: number;
  /** Maximum thickness as fraction of chord (0.05–0.30) */
  max_thickness: number;
  /** Wing span in metres */
  span: number;
  /** Chord length in metres */
  chord: number;
}

/**
 * VehicleType represents the complete vehicle geometry and configuration.
 * Must match the Pydantic VehicleType model field-for-field.
 */
export interface VehicleType {
  /** 3D vertex coordinates as [x, y, z] arrays */
  vertices: number[][] | null;
  /** Triangle face indices referencing vertices array */
  faces: number[][] | null;
  /** Maximum wing dimension in meters */
  max_dim_m: number | null;
  /** Total vehicle mass in kilograms (overrides density calculation if set) */
  mass_kg: number | null;
  /** Euler angles [roll, pitch, yaw] for initial orientation */
  orientation: number[] | null;
  /** Wing material density (kg/m³) - used if mass_kg is null */
  wing_density: number | null;
  /** Whether to include a pilot body in the simulation */
  pilot: boolean;
  /** Shape generation type */
  shape_type?: ShapeType;
  /** NACA airfoil parameters (used when shape_type is 'naca') */
  naca_params?: NacaParams | null;
  /** Parametric airfoil parameters (used when shape_type is 'parametric') */
  parametric_params?: ParametricParams | null;
}

/**
 * Default vehicle configuration.
 * Sources:
 * - src/glider/vehicle.py lines 57-61
 * - src/glider/constants.py lines 15-17
 */
export const DEFAULT_VEHICLE: VehicleType = {
  vertices: null,
  faces: null,
  max_dim_m: 4.5, // DEFAULT_MAX_WING_DIMENSION_M
  mass_kg: null,
  orientation: [0, 0, 0],
  wing_density: 0.4, // WING_DENSITY
  pilot: false,
  shape_type: 'point_cloud',
};

/**
 * Default NACA params.
 */
export const DEFAULT_NACA_PARAMS: NacaParams = {
  digits: '2412',
  span: 2.0,
  chord: 0.5,
};

/**
 * Default parametric params.
 */
export const DEFAULT_PARAMETRIC_PARAMS: ParametricParams = {
  max_camber: 0.02,
  camber_position: 0.4,
  max_thickness: 0.12,
  span: 2.0,
  chord: 0.5,
};

/**
 * Result from a single generation in the evolutionary algorithm.
 * Uses snake_case to match backend wire format exactly.
 */
export interface GenerationResult {
  /** Generation number (0-indexed) */
  generation: number;
  /** Fitness score of the best individual in this generation */
  best_fitness: number;
  /** Average fitness across the entire population */
  avg_fitness: number;
  /** The best-performing vehicle in this generation */
  best_vehicle: VehicleType;
  /** Fitness scores for all individuals (for histogram rendering) */
  population_fitness: number[];
}

/**
 * Record of a single fitness evaluation.
 */
export interface FitnessRecord {
  /** Vehicle that was evaluated */
  vehicle: VehicleType;
  /** Fitness score achieved */
  score: number;
  /** Unix timestamp (milliseconds) when evaluation completed */
  timestamp: number;
}
