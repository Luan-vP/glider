/**
 * TrajectoryViewer — Top-level panel for 3D trajectory replay.
 *
 * Component Contract:
 * - Reads: vehicle from shared state
 * - Writes: nothing to shared state (self-contained)
 * - Behavior: user clicks "Load Trajectory" → calls API with current vehicle + sample rate
 *   → displays interactive 3D replay with playback controls
 */

import { useState } from 'react';
import { useVehicleStore } from '../../state/vehicle-store';
import { getTrajectoryReplay } from '../../api/client';
import { useTrajectoryPlayback } from '../../hooks/useTrajectoryPlayback';
import type { TrajectoryReplayData } from '../../types/trajectory';
import { TrajectoryScene } from './TrajectoryScene';
import { PlaybackControls } from './PlaybackControls';

export function TrajectoryViewer() {
  const vehicle = useVehicleStore((state) => state.vehicle);
  const hasVehicle = vehicle.vertices !== null;

  const [replayData, setReplayData] = useState<TrajectoryReplayData | null>(null);
  const [sampleRate, setSampleRate] = useState<30 | 60>(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showGrid, setShowGrid] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [followGlider, setFollowGlider] = useState(false);

  const [playbackState, playbackControls, frameRef] = useTrajectoryPlayback(
    replayData?.frames ?? [],
    replayData?.sample_rate ?? 60,
  );

  const handleLoad = async () => {
    if (!hasVehicle) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getTrajectoryReplay(vehicle, sampleRate);
      setReplayData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trajectory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">Trajectory Replay</h2>

        <div className="flex items-center gap-2">
          {/* Sample rate toggle */}
          <div className="flex items-center gap-1">
            {([30, 60] as const).map((rate) => (
              <button
                key={rate}
                onClick={() => setSampleRate(rate)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  sampleRate === rate
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {rate}Hz
              </button>
            ))}
          </div>

          {/* Load button */}
          <button
            onClick={handleLoad}
            disabled={!hasVehicle || loading}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              !hasVehicle || loading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </span>
            ) : (
              'Load Trajectory'
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* 3D Scene */}
      <div className="flex-1 min-h-0 rounded-lg overflow-hidden mb-4">
        {replayData ? (
          <TrajectoryScene
            replayData={replayData}
            frameRef={frameRef}
            showGrid={showGrid}
            showTrail={showTrail}
            followGlider={followGlider}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-500">
              {hasVehicle
                ? 'Click "Load Trajectory" to replay the drop test in 3D'
                : 'Generate a vehicle first, then load a trajectory'}
            </p>
          </div>
        )}
      </div>

      {/* Fitness display */}
      {replayData && (
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-sm text-gray-400">Fitness:</span>
          <span className="text-lg font-bold text-green-400">
            {replayData.fitness.toFixed(2)}
          </span>
          <span className="text-sm text-gray-400">m</span>
          <span className="text-xs text-gray-500 ml-2">
            {replayData.frames.length} frames @ {replayData.sample_rate}Hz
          </span>
        </div>
      )}

      {/* Playback controls */}
      {replayData && (
        <PlaybackControls
          state={playbackState}
          controls={playbackControls}
          showGrid={showGrid}
          showTrail={showTrail}
          followGlider={followGlider}
          onToggleGrid={() => setShowGrid((v) => !v)}
          onToggleTrail={() => setShowTrail((v) => !v)}
          onToggleFollow={() => setFollowGlider((v) => !v)}
        />
      )}
    </div>
  );
}
