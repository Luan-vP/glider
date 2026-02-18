/**
 * Typed API client for Glider backend endpoints.
 * All functions use the native fetch API and throw errors on failure.
 */

import type { VehicleType, GenerationResult } from '../types/vehicle';

/**
 * Base API URL, configurable via VITE_API_URL environment variable.
 * Must NOT have a trailing slash.
 */
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/**
 * Configuration for running evolutionary optimization.
 */
export interface EvolutionConfig {
  population_size: number;
  num_generations: number;
  survival_weight: number;
  cloning_weight: number;
  max_dim_m: number;
  pilot: boolean;
  mass_kg: number | null;
  wing_density: number | null;
}

/**
 * Fetches a default random vehicle from the backend.
 *
 * @returns A VehicleType with random geometry
 * @throws Error if the request fails
 */
export async function getDefaultVehicle(): Promise<VehicleType> {
  const response = await fetch(`${API_BASE}/vehicle/`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to get default vehicle: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generates a base64-encoded PNG preview of a vehicle.
 *
 * @param vehicle - The vehicle to render
 * @returns Base64-encoded PNG image string
 * @throws Error if the request fails
 */
export async function viewVehicle(vehicle: VehicleType): Promise<string> {
  const response = await fetch(`${API_BASE}/vehicle/view/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(vehicle),
  });

  if (!response.ok) {
    throw new Error(`Failed to view vehicle: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Performs a drop test simulation and returns the MuJoCo world XML.
 *
 * @param vehicle - The vehicle to test
 * @returns MuJoCo world XML string
 * @throws Error if the request fails
 */
export async function dropTestVehicle(vehicle: VehicleType): Promise<string> {
  const response = await fetch(`${API_BASE}/vehicle/drop_test/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(vehicle),
  });

  if (!response.ok) {
    throw new Error(`Failed to drop test vehicle: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Evaluates the fitness score of a vehicle.
 *
 * @param vehicle - The vehicle to evaluate
 * @returns Fitness score (higher is better)
 * @throws Error if the request fails
 */
export async function getVehicleFitness(vehicle: VehicleType): Promise<number> {
  const response = await fetch(`${API_BASE}/vehicle/fitness/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(vehicle),
  });

  if (!response.ok) {
    throw new Error(`Failed to get vehicle fitness: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Result from drop test with video rendering.
 */
export interface DropTestVideoResult {
  fitness: number;
  fixed_camera_video: string;
  track_camera_video: string;
}

/**
 * Runs a drop test with video rendering from both camera angles.
 *
 * @param vehicle - The vehicle to test
 * @returns Fitness score and base64-encoded mp4 videos from fixed and track cameras
 * @throws Error if the request fails
 */
export async function getDropTestVideo(vehicle: VehicleType): Promise<DropTestVideoResult> {
  const response = await fetch(`${API_BASE}/vehicle/drop_test_video/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(vehicle),
  });

  if (!response.ok) {
    throw new Error(`Failed to get drop test video: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Runs evolutionary optimization with server-sent events streaming.
 * Each generation result is passed to the onGeneration callback as it arrives.
 *
 * @param config - Evolution configuration parameters
 * @param onGeneration - Callback invoked for each generation result
 * @param signal - Optional AbortSignal to cancel the stream
 * @throws Error if the request fails or stream parsing fails
 */
export async function runEvolution(
  config: EvolutionConfig,
  onGeneration: (result: GenerationResult) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE}/evolution/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to run evolution: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events (format: "data: <JSON>\n\n")
      const lines = buffer.split('\n\n');
      buffer = lines.pop() ?? ''; // Keep incomplete event in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6); // Remove "data: " prefix
          try {
            const result = JSON.parse(jsonStr) as GenerationResult;
            onGeneration(result);
          } catch (error) {
            console.error('Failed to parse SSE event:', error);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
