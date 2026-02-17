/**
 * Type definitions for vehicle geometry and state.
 * These types must match the backend Pydantic models exactly.
 * Source: src/glider/serving/schema.py
 */

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
