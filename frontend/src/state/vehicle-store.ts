/**
 * Zustand store for global vehicle state management.
 *
 * This store provides shared state across all frontend components:
 * - VehicleEditor writes to `vehicle`
 * - VehiclePreview reads `vehicle` and writes preview state
 * - DropTestPanel reads `vehicle` and writes fitness history
 * - EvolutionDashboard reads `vehicle.config` and writes evolution state
 * - Layout reads all state for status indicators
 */

import { create } from 'zustand';
import { DEFAULT_VEHICLE, VehicleType, GenerationResult, FitnessRecord } from '../types/vehicle';

export interface AppState {
  // ============================================================
  // Vehicle Editing
  // ============================================================

  /** Current vehicle being edited */
  vehicle: VehicleType;

  /** Update the current vehicle (called by VehicleEditor) */
  setVehicle: (vehicle: VehicleType) => void;

  // ============================================================
  // Preview State
  // ============================================================

  /** Whether a preview render is currently in progress */
  previewLoading: boolean;

  /** Base64-encoded preview image (null if not yet loaded) */
  previewImage: string | null;

  /** Set preview loading state */
  setPreviewLoading: (loading: boolean) => void;

  /** Set preview image (base64 string) */
  setPreviewImage: (image: string | null) => void;

  // ============================================================
  // Fitness Evaluation
  // ============================================================

  /** History of all fitness evaluations from DropTestPanel */
  fitnessHistory: FitnessRecord[];

  /** Add a new fitness evaluation result */
  addFitnessResult: (record: FitnessRecord) => void;

  // ============================================================
  // Evolution
  // ============================================================

  /** Whether the evolutionary algorithm is currently running */
  evolutionRunning: boolean;

  /** Set evolution running state */
  setEvolutionRunning: (running: boolean) => void;

  /** Results from each generation of the evolutionary algorithm */
  generations: GenerationResult[];

  /** Add a new generation result */
  addGeneration: (generation: GenerationResult) => void;

  /** Clear all generation history (e.g., when starting a new run) */
  clearGenerations: () => void;
}

/**
 * Global vehicle state store.
 *
 * Usage:
 * ```tsx
 * import { useVehicleStore } from './state/vehicle-store';
 *
 * function MyComponent() {
 *   const vehicle = useVehicleStore((state) => state.vehicle);
 *   const setVehicle = useVehicleStore((state) => state.setVehicle);
 *   // ...
 * }
 * ```
 */
export const useVehicleStore = create<AppState>((set) => ({
  // Initial vehicle state
  vehicle: DEFAULT_VEHICLE,

  setVehicle: (vehicle) => set({ vehicle }),

  // Initial preview state
  previewLoading: false,
  previewImage: null,

  setPreviewLoading: (previewLoading) => set({ previewLoading }),
  setPreviewImage: (previewImage) => set({ previewImage }),

  // Initial fitness state
  fitnessHistory: [],

  addFitnessResult: (record) =>
    set((state) => ({
      fitnessHistory: [...state.fitnessHistory, record],
    })),

  // Initial evolution state
  evolutionRunning: false,
  generations: [],

  setEvolutionRunning: (evolutionRunning) => set({ evolutionRunning }),

  addGeneration: (generation) =>
    set((state) => ({
      generations: [...state.generations, generation],
    })),

  clearGenerations: () => set({ generations: [] }),
}));
