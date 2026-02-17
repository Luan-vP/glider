/**
 * EvolutionDashboard component for running and visualizing genetic algorithm evolution.
 * Manages the evolution lifecycle and displays real-time fitness charts and statistics.
 *
 * Component Contract (see issue #8):
 * - Reads: vehicle config (max_dim_m, pilot, mass_kg, wing_density) from shared state as seed
 * - Writes: generations, evolutionRunning in shared state
 * - Behavior: manages its own population lifecycle, streams results from POST /evolution/run
 */

import { useState, useRef, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useVehicleStore } from '../state/vehicle-store';
import { runEvolution, viewVehicle, type EvolutionConfig } from '../api/client';

/**
 * Local configuration form state (not shared globally)
 */
interface EvolutionFormConfig {
  population_size: number;
  num_generations: number;
  survival_weight: number;
  cloning_weight: number;
}

/**
 * Default form configuration values
 */
const DEFAULT_FORM_CONFIG: EvolutionFormConfig = {
  population_size: 100,
  num_generations: 10,
  survival_weight: 0.3,
  cloning_weight: 0.4,
};

export function EvolutionDashboard() {
  // Shared state from Zustand store
  const vehicle = useVehicleStore((state) => state.vehicle);
  const evolutionRunning = useVehicleStore((state) => state.evolutionRunning);
  const setEvolutionRunning = useVehicleStore((state) => state.setEvolutionRunning);
  const generations = useVehicleStore((state) => state.generations);
  const addGeneration = useVehicleStore((state) => state.addGeneration);
  const clearGenerations = useVehicleStore((state) => state.clearGenerations);
  const setVehicle = useVehicleStore((state) => state.setVehicle);

  // Local form configuration state
  const [formConfig, setFormConfig] = useState<EvolutionFormConfig>(DEFAULT_FORM_CONFIG);

  // Best vehicle preview state
  const [bestVehicleImage, setBestVehicleImage] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // AbortController for canceling evolution
  const abortControllerRef = useRef<AbortController | null>(null);

  // Validation: survival_weight + cloning_weight must be <= 1.0
  const isConfigValid = formConfig.survival_weight + formConfig.cloning_weight <= 1.0;

  // Get latest generation for "Load Best" button
  const latestGeneration = generations.length > 0 ? generations[generations.length - 1] : null;

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Start evolution run
   */
  const handleStartEvolution = async () => {
    if (!isConfigValid) return;

    // Clear previous results and set running state
    clearGenerations();
    setEvolutionRunning(true);
    setBestVehicleImage(null);
    setShowPreview(false);

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Build evolution config from form + vehicle seed
    const config: EvolutionConfig = {
      population_size: formConfig.population_size,
      num_generations: formConfig.num_generations,
      survival_weight: formConfig.survival_weight,
      cloning_weight: formConfig.cloning_weight,
      max_dim_m: vehicle.max_dim_m ?? 4.5,
      pilot: vehicle.pilot,
      mass_kg: vehicle.mass_kg,
      wing_density: vehicle.wing_density,
    };

    try {
      await runEvolution(
        config,
        (result) => {
          // Add each generation result to shared state
          addGeneration(result);
        },
        controller.signal
      );
    } catch (error: unknown) {
      // Handle abortion vs real errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Evolution aborted by user');
      } else {
        console.error('Evolution failed:', error);
      }
    } finally {
      setEvolutionRunning(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Stop evolution run
   */
  const handleStopEvolution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  /**
   * Load best vehicle into shared state (for VehicleEditor/VehiclePreview)
   */
  const handleLoadBest = () => {
    if (latestGeneration) {
      setVehicle(latestGeneration.best_vehicle);
    }
  };

  /**
   * Fetch and display preview of best vehicle from latest generation
   */
  const handleShowPreview = async () => {
    if (!latestGeneration || loadingPreview) return;

    setLoadingPreview(true);
    try {
      const imageData = await viewVehicle(latestGeneration.best_vehicle);
      setBestVehicleImage(imageData);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to load best vehicle preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  /**
   * Prepare data for fitness over time chart (best and average)
   */
  const fitnessOverTimeData = generations.map((gen) => ({
    generation: gen.generation,
    best: gen.best_fitness,
    avg: gen.avg_fitness,
  }));

  /**
   * Prepare data for population fitness distribution (histogram)
   * Shows latest generation's population fitness distribution
   */
  const populationDistributionData = latestGeneration
    ? latestGeneration.population_fitness.map((fitness, idx) => ({
        individual: idx + 1,
        fitness,
      }))
    : [];

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Evolution Dashboard</h2>

      {/* Configuration Form */}
      <div className="border border-gray-300 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold">Evolution Configuration</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Population Size
            </label>
            <input
              type="number"
              min="10"
              max="1000"
              value={formConfig.population_size}
              onChange={(e) =>
                setFormConfig({ ...formConfig, population_size: parseInt(e.target.value) || 100 })
              }
              disabled={evolutionRunning}
              className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Number of Generations
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formConfig.num_generations}
              onChange={(e) =>
                setFormConfig({ ...formConfig, num_generations: parseInt(e.target.value) || 10 })
              }
              disabled={evolutionRunning}
              className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Survival Weight
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={formConfig.survival_weight}
              onChange={(e) =>
                setFormConfig({ ...formConfig, survival_weight: parseFloat(e.target.value) || 0.3 })
              }
              disabled={evolutionRunning}
              className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Cloning Weight
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={formConfig.cloning_weight}
              onChange={(e) =>
                setFormConfig({ ...formConfig, cloning_weight: parseFloat(e.target.value) || 0.4 })
              }
              disabled={evolutionRunning}
              className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* Validation Error */}
        {!isConfigValid && (
          <div className="text-red-600 text-sm">
            Error: Survival Weight + Cloning Weight must be ≤ 1.0 (currently:{' '}
            {(formConfig.survival_weight + formConfig.cloning_weight).toFixed(2)})
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleStartEvolution}
            disabled={evolutionRunning || !isConfigValid}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Start Evolution
          </button>

          <button
            onClick={handleStopEvolution}
            disabled={!evolutionRunning}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Stop
          </button>
        </div>
      </div>

      {/* Current Generation Stats */}
      {latestGeneration && (
        <div className="border border-gray-300 rounded-lg p-4 space-y-2">
          <h3 className="text-lg font-semibold">
            Generation {latestGeneration.generation}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Best Fitness:</span>
              <span className="ml-2 font-bold">{latestGeneration.best_fitness.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Average Fitness:</span>
              <span className="ml-2 font-bold">{latestGeneration.avg_fitness.toFixed(2)}</span>
            </div>
          </div>

          {/* Load Best and Show Preview Buttons */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleLoadBest}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Load Best Vehicle
            </button>

            <button
              onClick={handleShowPreview}
              disabled={loadingPreview}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loadingPreview ? 'Loading Preview...' : 'Show Best Vehicle Preview'}
            </button>
          </div>

          {/* Best Vehicle Preview */}
          {showPreview && bestVehicleImage && (
            <div className="mt-4">
              <h4 className="text-md font-semibold mb-2">Best Vehicle Preview</h4>
              <img
                src={`data:image/png;base64,${bestVehicleImage}`}
                alt="Best vehicle"
                className="max-w-full h-auto border border-gray-300 rounded"
              />
            </div>
          )}
        </div>
      )}

      {/* Fitness Over Time Chart */}
      {generations.length > 0 && (
        <div className="border border-gray-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Fitness Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={fitnessOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="generation" label={{ value: 'Generation', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'Fitness', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="best" stroke="#2563eb" name="Best Fitness" />
              <Line type="monotone" dataKey="avg" stroke="#16a34a" name="Average Fitness" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Population Fitness Distribution */}
      {latestGeneration && (
        <div className="border border-gray-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">
            Population Fitness Distribution (Generation {latestGeneration.generation})
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={populationDistributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="individual" label={{ value: 'Individual', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'Fitness', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="fitness" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* No Data Message */}
      {generations.length === 0 && !evolutionRunning && (
        <div className="text-center text-gray-500 py-8">
          No evolution data yet. Configure parameters and click "Start Evolution" to begin.
        </div>
      )}
    </div>
  );
}
