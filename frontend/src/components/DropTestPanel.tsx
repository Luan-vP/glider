/**
 * DropTestPanel - Component for running drop test simulations and displaying fitness scores.
 *
 * Component Contract:
 * - Reads: vehicle from shared state
 * - Writes: appends to fitnessHistory in shared state
 * - Behavior: user clicks Run -> reads current vehicle -> calls API -> displays score and appends to history
 */

import { useState } from 'react';
import { useVehicleStore } from '../state/vehicle-store';
import { getDropTestVideo, type DropTestVideoResult } from '../api/client';

export function DropTestPanel() {
  const vehicle = useVehicleStore((state) => state.vehicle);
  const fitnessHistory = useVehicleStore((state) => state.fitnessHistory);
  const addFitnessResult = useVehicleStore((state) => state.addFitnessResult);
  const clearFitnessHistory = useVehicleStore((state) => state.clearFitnessHistory);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<DropTestVideoResult | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<'fixed' | 'track'>('fixed');

  // Check if vehicle has been generated
  const hasVehicle = vehicle.vertices !== null;

  // Get the most recent score
  const currentScore = fitnessHistory.length > 0 ? fitnessHistory[fitnessHistory.length - 1].score : null;

  // Find the best score in history
  const bestScore = fitnessHistory.length > 0 ? Math.max(...fitnessHistory.map((r) => r.score)) : null;

  // Handle run drop test
  const handleRunDropTest = async () => {
    if (!hasVehicle) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getDropTestVideo(vehicle);

      // Store video result
      setVideoResult(result);

      // Add result to history
      addFitnessResult({
        vehicle,
        score: result.fitness,
        timestamp: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run drop test');
    } finally {
      setLoading(false);
    }
  };

  // Handle clear history
  const handleClearHistory = () => {
    clearFitnessHistory();
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  // Format vehicle config summary
  const formatVehicleSummary = (vehicleData: typeof vehicle): string => {
    const parts: string[] = [];
    if (vehicleData.max_dim_m) parts.push(`${vehicleData.max_dim_m}m`);
    if (vehicleData.pilot) parts.push('pilot');
    if (vehicleData.vertices) parts.push(`${vehicleData.vertices.length}v`);
    return parts.join(', ');
  };

  // Compare current score to best
  const getScoreComparison = () => {
    if (currentScore === null || bestScore === null || fitnessHistory.length < 2) {
      return null;
    }

    const isBest = currentScore === bestScore;
    const previousBest = Math.max(...fitnessHistory.slice(0, -1).map((r) => r.score));
    const isImprovement = currentScore > previousBest;

    return {
      isBest,
      isImprovement,
      delta: currentScore - previousBest,
    };
  };

  const scoreComparison = getScoreComparison();

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">Drop Test</h2>
      </div>

      {/* Run Button */}
      <button
        onClick={handleRunDropTest}
        disabled={!hasVehicle || loading}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors mb-4 ${
          !hasVehicle || loading
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Running drop test...
          </span>
        ) : (
          'Run Drop Test'
        )}
      </button>

      {/* Hint when no vehicle */}
      {!hasVehicle && (
        <div className="text-sm text-gray-400 mb-4 text-center">
          Generate a vehicle first to run drop tests
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Current Score Display */}
      {currentScore !== null && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="text-sm text-gray-400 mb-1">Current Fitness</div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-green-400">
              {currentScore.toFixed(2)}
            </span>
            <span className="text-lg text-gray-400 ml-2">m</span>
            {scoreComparison && (
              <span
                className={`ml-3 text-sm ${
                  scoreComparison.isImprovement ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {scoreComparison.isImprovement ? '↑' : '↓'}{' '}
                {Math.abs(scoreComparison.delta).toFixed(2)}m
              </span>
            )}
          </div>
          {scoreComparison?.isBest && (
            <div className="text-xs text-yellow-400 mt-2">★ Best score!</div>
          )}
        </div>
      )}

      {/* Video Display */}
      {videoResult && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="text-sm text-gray-400 mb-2">Flight Recording</div>

          {/* Camera Selection Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSelectedCamera('fixed')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedCamera === 'fixed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Fixed Camera
            </button>
            <button
              onClick={() => setSelectedCamera('track')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedCamera === 'track'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Tracking Camera
            </button>
          </div>

          {/* Video Player */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              key={selectedCamera}
              className="w-full h-full"
              controls
              autoPlay
              loop
              muted
              src={`data:video/mp4;base64,${
                selectedCamera === 'fixed'
                  ? videoResult.fixed_camera_video
                  : videoResult.track_camera_video
              }`}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            {selectedCamera === 'fixed'
              ? 'Stationary camera view from fixed position'
              : 'Camera attached to glider body'}
          </div>
        </div>
      )}

      {/* History Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-300">History</h3>
        {fitnessHistory.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {fitnessHistory.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            No evaluations yet. Run a drop test to see results.
          </div>
        ) : (
          [...fitnessHistory]
            .reverse()
            .slice(0, 50)
            .map((record, idx) => {
              const isBest = record.score === bestScore;
              const originalIdx = fitnessHistory.length - 1 - idx;

              return (
                <div
                  key={`${record.timestamp}-${originalIdx}`}
                  className={`bg-gray-800 rounded-lg p-3 ${
                    isBest ? 'ring-1 ring-yellow-500/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-baseline">
                      <span className="text-lg font-semibold text-gray-100">
                        {record.score.toFixed(2)} m
                      </span>
                      {isBest && (
                        <span className="text-yellow-400 ml-2 text-sm">★</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(record.timestamp)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatVehicleSummary(record.vehicle)}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
