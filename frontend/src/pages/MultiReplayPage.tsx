/**
 * MultiReplayPage — Standalone page for multi-vehicle trajectory replay.
 *
 * Loads trajectory data from a URL (query param `data`) or from a local file,
 * and renders the MultiTrajectoryScene with playback controls.
 *
 * Usage:
 *   /#/replay/multi?data=http://localhost:8000/output/multi_drop_trajectories.json
 *   /#/replay/multi  (will prompt for file upload)
 *
 * Designed to be embedded as an iframe in comic-engine with transparent bg.
 */

import { useState, useEffect, useCallback } from 'react';
import type { MultiTrajectoryData } from '../types/multiTrajectory';
import { MultiTrajectoryScene } from '../components/trajectory/MultiTrajectoryScene';
import { PlaybackControls } from '../components/trajectory/PlaybackControls';
import { useTrajectoryPlayback } from '../hooks/useTrajectoryPlayback';

export function MultiReplayPage() {
  const [data, setData] = useState<MultiTrajectoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showTrail, setShowTrail] = useState(true);
  const [followVehicle, setFollowVehicle] = useState<number | null>(null);

  // Check URL for transparent mode
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const transparent = params.get('transparent') === '1';

  // Load data from URL param
  useEffect(() => {
    const dataUrl = params.get('data');
    if (dataUrl) {
      fetch(dataUrl)
        .then(r => r.json())
        .then(setData)
        .catch(e => setError(`Failed to load: ${e.message}`));
    }
  }, []);

  // File upload fallback
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setData(JSON.parse(reader.result as string));
        setError(null);
      } catch (err) {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }, []);

  // Use the longest vehicle's frames for playback timing
  const longestFrames = data
    ? data.vehicles.reduce((a, b) => a.frames.length > b.frames.length ? a : b).frames
    : [];
  const sampleRate = data?.sample_rate ?? 60;

  const [playbackState, playbackControls, frameRef] = useTrajectoryPlayback(longestFrames, sampleRate);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-red-400 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg mb-4">{error}</p>
          <label className="cursor-pointer bg-gray-700 px-4 py-2 rounded hover:bg-gray-600">
            Load JSON file
            <input type="file" accept=".json" onChange={handleFile} className="hidden" />
          </label>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-300 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-lg">Multi-Vehicle Trajectory Replay</p>
          <p className="text-sm text-gray-500">
            Loading... or drop a trajectory JSON:
          </p>
          <label className="cursor-pointer bg-gray-700 px-4 py-2 rounded hover:bg-gray-600">
            Load JSON file
            <input type="file" accept=".json" onChange={handleFile} className="hidden" />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${transparent ? '' : 'bg-gray-900'}`}>
      {/* 3D Scene */}
      <div className="flex-1">
        <MultiTrajectoryScene
          vehicles={data.vehicles}
          wind={data.wind}
          frameRef={frameRef}
          showGrid={showGrid}
          showTrail={showTrail}
          followVehicle={followVehicle}
          transparent={transparent}
        />
      </div>

      {/* Controls bar */}
      {!transparent && (
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <PlaybackControls
            state={playbackState}
            controls={playbackControls}
            showGrid={showGrid}
            showTrail={showTrail}
            followGlider={followVehicle !== null}
            onToggleGrid={() => setShowGrid(g => !g)}
            onToggleTrail={() => setShowTrail(t => !t)}
            onToggleFollow={() => setFollowVehicle(v => v === null ? 0 : null)}
          />

          {/* Vehicle legend */}
          <div className="flex gap-4 mt-3 justify-center">
            {data.vehicles.map((v, i) => (
              <button
                key={v.label}
                onClick={() => setFollowVehicle(f => f === i ? null : i)}
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                  followVehicle === i ? 'bg-gray-600' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: v.color }}
                />
                <span className="text-gray-300">{v.label}</span>
                <span className="text-gray-500">{v.frames.length}f</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
