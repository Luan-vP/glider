/**
 * Unit tests for API client functions.
 * Requires: npm install -D vitest @vitest/ui
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDefaultVehicle,
  viewVehicle,
  dropTestVehicle,
  getVehicleFitness,
  runEvolution,
  type EvolutionConfig,
} from '../client';
import type { VehicleType, GenerationResult } from '../../types/vehicle';

// Mock global fetch
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('getDefaultVehicle', () => {
  it('should fetch a default vehicle', async () => {
    const mockVehicle: VehicleType = {
      vertices: [[0, 0, 0], [1, 1, 1]],
      faces: [[0, 1, 2]],
      max_dim_m: 4.5,
      mass_kg: null,
      orientation: [0, 0, 0],
      wing_density: 0.4,
      pilot: false,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockVehicle,
    });

    const result = await getDefaultVehicle();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/vehicle/',
      { method: 'GET' }
    );
    expect(result).toEqual(mockVehicle);
  });

  it('should throw error on failed request', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(getDefaultVehicle()).rejects.toThrow(
      'Failed to get default vehicle: 500 Internal Server Error'
    );
  });
});

describe('viewVehicle', () => {
  it('should return base64 PNG data', async () => {
    const mockVehicle: VehicleType = {
      vertices: [[0, 0, 0]],
      faces: [[0, 1, 2]],
      max_dim_m: 4.5,
      mass_kg: null,
      orientation: [0, 0, 0],
      wing_density: 0.4,
      pilot: false,
    };

    const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockBase64 }),
    });

    const result = await viewVehicle(mockVehicle);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/vehicle/view/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockVehicle),
      }
    );
    expect(result).toBe(mockBase64);
  });

  it('should throw error on failed request', async () => {
    const mockVehicle: VehicleType = {
      vertices: null,
      faces: null,
      max_dim_m: null,
      mass_kg: null,
      orientation: null,
      wing_density: null,
      pilot: false,
    };

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    });

    await expect(viewVehicle(mockVehicle)).rejects.toThrow(
      'Failed to view vehicle: 400 Bad Request'
    );
  });
});

describe('dropTestVehicle', () => {
  it('should return MuJoCo XML string', async () => {
    const mockVehicle: VehicleType = {
      vertices: [[0, 0, 0]],
      faces: [[0, 1, 2]],
      max_dim_m: 4.5,
      mass_kg: null,
      orientation: [0, 0, 0],
      wing_density: 0.4,
      pilot: false,
    };

    const mockXML = '<mujoco><worldbody></worldbody></mujoco>';

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => mockXML,
    });

    const result = await dropTestVehicle(mockVehicle);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/vehicle/drop_test/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockVehicle),
      }
    );
    expect(result).toBe(mockXML);
  });

  it('should throw error on failed request', async () => {
    const mockVehicle: VehicleType = {
      vertices: null,
      faces: null,
      max_dim_m: null,
      mass_kg: null,
      orientation: null,
      wing_density: null,
      pilot: false,
    };

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(dropTestVehicle(mockVehicle)).rejects.toThrow(
      'Failed to drop test vehicle: 500 Internal Server Error'
    );
  });
});

describe('getVehicleFitness', () => {
  it('should return fitness score', async () => {
    const mockVehicle: VehicleType = {
      vertices: [[0, 0, 0]],
      faces: [[0, 1, 2]],
      max_dim_m: 4.5,
      mass_kg: null,
      orientation: [0, 0, 0],
      wing_density: 0.4,
      pilot: false,
    };

    const mockFitness = 42.5;

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockFitness,
    });

    const result = await getVehicleFitness(mockVehicle);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/vehicle/fitness/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockVehicle),
      }
    );
    expect(result).toBe(mockFitness);
  });

  it('should throw error on failed request', async () => {
    const mockVehicle: VehicleType = {
      vertices: null,
      faces: null,
      max_dim_m: null,
      mass_kg: null,
      orientation: null,
      wing_density: null,
      pilot: false,
    };

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(getVehicleFitness(mockVehicle)).rejects.toThrow(
      'Failed to get vehicle fitness: 500 Internal Server Error'
    );
  });
});

describe('runEvolution', () => {
  it('should parse SSE events and call onGeneration callback', async () => {
    const mockConfig: EvolutionConfig = {
      population_size: 10,
      num_generations: 5,
      survival_weight: 0.3,
      cloning_weight: 0.4,
      max_dim_m: 4.5,
      pilot: false,
      mass_kg: null,
      wing_density: null,
    };

    const mockGeneration: GenerationResult = {
      generation: 0,
      best_fitness: 10.5,
      avg_fitness: 5.2,
      best_vehicle: {
        vertices: [[0, 0, 0]],
        faces: [[0, 1, 2]],
        max_dim_m: 4.5,
        mass_kg: null,
        orientation: [0, 0, 0],
        wing_density: 0.4,
        pilot: false,
      },
      population_fitness: [10.5, 8.3, 5.1, 3.2],
    };

    // Mock ReadableStream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(mockGeneration)}\n\n`));
        controller.close();
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onGeneration = vi.fn();
    await runEvolution(mockConfig, onGeneration);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/evolution/run',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockConfig),
        signal: undefined,
      }
    );
    expect(onGeneration).toHaveBeenCalledWith(mockGeneration);
  });

  it('should handle multiple SSE events', async () => {
    const mockConfig: EvolutionConfig = {
      population_size: 10,
      num_generations: 2,
      survival_weight: 0.3,
      cloning_weight: 0.4,
      max_dim_m: 4.5,
      pilot: false,
      mass_kg: null,
      wing_density: null,
    };

    const gen0: GenerationResult = {
      generation: 0,
      best_fitness: 10.5,
      avg_fitness: 5.2,
      best_vehicle: {
        vertices: [[0, 0, 0]],
        faces: [[0, 1, 2]],
        max_dim_m: 4.5,
        mass_kg: null,
        orientation: [0, 0, 0],
        wing_density: 0.4,
        pilot: false,
      },
      population_fitness: [10.5, 8.3],
    };

    const gen1: GenerationResult = {
      ...gen0,
      generation: 1,
      best_fitness: 12.3,
      avg_fitness: 6.1,
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(gen0)}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(gen1)}\n\n`));
        controller.close();
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onGeneration = vi.fn();
    await runEvolution(mockConfig, onGeneration);

    expect(onGeneration).toHaveBeenCalledTimes(2);
    expect(onGeneration).toHaveBeenNthCalledWith(1, gen0);
    expect(onGeneration).toHaveBeenNthCalledWith(2, gen1);
  });

  it('should throw error on failed request', async () => {
    const mockConfig: EvolutionConfig = {
      population_size: 10,
      num_generations: 5,
      survival_weight: 0.3,
      cloning_weight: 0.4,
      max_dim_m: 4.5,
      pilot: false,
      mass_kg: null,
      wing_density: null,
    };

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const onGeneration = vi.fn();

    await expect(runEvolution(mockConfig, onGeneration)).rejects.toThrow(
      'Failed to run evolution: 500 Internal Server Error'
    );
    expect(onGeneration).not.toHaveBeenCalled();
  });

  it('should throw error if response body is null', async () => {
    const mockConfig: EvolutionConfig = {
      population_size: 10,
      num_generations: 5,
      survival_weight: 0.3,
      cloning_weight: 0.4,
      max_dim_m: 4.5,
      pilot: false,
      mass_kg: null,
      wing_density: null,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: null,
    });

    const onGeneration = vi.fn();

    await expect(runEvolution(mockConfig, onGeneration)).rejects.toThrow(
      'Response body is null'
    );
    expect(onGeneration).not.toHaveBeenCalled();
  });

  it('should support AbortSignal', async () => {
    const mockConfig: EvolutionConfig = {
      population_size: 10,
      num_generations: 5,
      survival_weight: 0.3,
      cloning_weight: 0.4,
      max_dim_m: 4.5,
      pilot: false,
      mass_kg: null,
      wing_density: null,
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {}\n\n'));
        controller.close();
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: stream,
    });

    const controller = new AbortController();
    const onGeneration = vi.fn();

    await runEvolution(mockConfig, onGeneration, controller.signal);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/evolution/run',
      expect.objectContaining({
        signal: controller.signal,
      })
    );
  });
});
