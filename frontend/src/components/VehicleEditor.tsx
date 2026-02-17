/**
 * VehicleEditor: Form panel for configuring glider parameters
 *
 * Component Contract (from #8):
 * - Writes: vehicle in shared state via setVehicle()
 * - Reads: vehicle from shared state (to populate form)
 * - Events: updates shared VehicleType on every form change
 *
 * Dependencies: #1 (frontend scaffold), #2 (API client), #8 (state store)
 */

import { useState } from 'react';
import { useVehicleStore } from '../state/vehicle-store';
import { getDefaultVehicle } from '../api/client';

export function VehicleEditor() {
  const vehicle = useVehicleStore((state) => state.vehicle);
  const setVehicle = useVehicleStore((state) => state.setVehicle);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track whether mass_kg is explicitly set (enables/disables density slider)
  const hasMass = vehicle.mass_kg !== null;

  /**
   * Update a vehicle parameter without affecting vertices/faces
   */
  const updateParameter = <K extends keyof typeof vehicle>(
    key: K,
    value: (typeof vehicle)[K]
  ) => {
    setVehicle({
      ...vehicle,
      [key]: value,
    });
  };

  /**
   * Toggle mass_kg between null and a default value
   */
  const toggleMass = () => {
    if (hasMass) {
      updateParameter('mass_kg', null);
    } else {
      updateParameter('mass_kg', 10.0); // Default mass when enabled
    }
  };

  /**
   * Generate a random vehicle by calling the backend API
   */
  const handleGenerateRandom = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const randomVehicle = await getDefaultVehicle();
      setVehicle(randomVehicle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate vehicle');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Vehicle Parameters</h2>
        <button
          onClick={handleGenerateRandom}
          disabled={isGenerating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate Random Vehicle'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Vertex count display (read-only) */}
      {vehicle.vertices && (
        <div className="bg-gray-700 rounded p-3">
          <label className="text-sm font-medium text-gray-300">Current Vertices</label>
          <div className="text-white font-mono">{vehicle.vertices.length} vertices</div>
        </div>
      )}

      {/* Max dimension slider */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <span>Max Wing Dimension (m)</span>
          <span className="text-white font-mono">{vehicle.max_dim_m?.toFixed(2) ?? 4.5}</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="20.0"
          step="0.1"
          value={vehicle.max_dim_m ?? 4.5}
          onChange={(e) => updateParameter('max_dim_m', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.5</span>
          <span>20.0</span>
        </div>
      </div>

      {/* Mass toggle and input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Explicit Mass (kg)</label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={hasMass}
              onChange={toggleMass}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="ml-2 text-sm text-gray-400">Override density</span>
          </label>
        </div>
        {hasMass && (
          <input
            type="number"
            min="0.1"
            max="1000.0"
            step="0.1"
            value={vehicle.mass_kg ?? 10.0}
            onChange={(e) => updateParameter('mass_kg', parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Wing density slider (disabled when mass is set) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <span>Wing Density (kg/m³) {hasMass && '(disabled)'}</span>
          <span className="text-white font-mono">{vehicle.wing_density?.toFixed(2) ?? 0.4}</span>
        </label>
        <input
          type="range"
          min="0.01"
          max="10.0"
          step="0.01"
          value={vehicle.wing_density ?? 0.4}
          onChange={(e) => updateParameter('wing_density', parseFloat(e.target.value))}
          disabled={hasMass}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.01</span>
          <span>10.0</span>
        </div>
      </div>

      {/* Orientation sliders (X, Y, Z rotation) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-200">Orientation (degrees)</h3>

        {/* X rotation (roll) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
            <span>X Rotation (Roll)</span>
            <span className="text-white font-mono">{vehicle.orientation?.[0]?.toFixed(1) ?? 0}°</span>
          </label>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={vehicle.orientation?.[0] ?? 0}
            onChange={(e) => {
              const newOrientation = [...(vehicle.orientation ?? [0, 0, 0])];
              newOrientation[0] = parseFloat(e.target.value);
              updateParameter('orientation', newOrientation);
            }}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Y rotation (pitch) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
            <span>Y Rotation (Pitch)</span>
            <span className="text-white font-mono">{vehicle.orientation?.[1]?.toFixed(1) ?? 0}°</span>
          </label>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={vehicle.orientation?.[1] ?? 0}
            onChange={(e) => {
              const newOrientation = [...(vehicle.orientation ?? [0, 0, 0])];
              newOrientation[1] = parseFloat(e.target.value);
              updateParameter('orientation', newOrientation);
            }}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Z rotation (yaw) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
            <span>Z Rotation (Yaw)</span>
            <span className="text-white font-mono">{vehicle.orientation?.[2]?.toFixed(1) ?? 0}°</span>
          </label>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={vehicle.orientation?.[2] ?? 0}
            onChange={(e) => {
              const newOrientation = [...(vehicle.orientation ?? [0, 0, 0])];
              newOrientation[2] = parseFloat(e.target.value);
              updateParameter('orientation', newOrientation);
            }}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>

      {/* Pilot toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">Include Pilot</label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={vehicle.pilot}
            onChange={(e) => updateParameter('pilot', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  );
}
