/**
 * PlaybackControls — Pure UI component for trajectory playback controls.
 * No Three.js or store dependencies.
 */

import type { PlaybackState, PlaybackControls as PlaybackControlsType } from '../../hooks/useTrajectoryPlayback';

interface PlaybackControlsProps {
  state: PlaybackState;
  controls: PlaybackControlsType;
  showGrid: boolean;
  showTrail: boolean;
  followGlider: boolean;
  onToggleGrid: () => void;
  onToggleTrail: () => void;
  onToggleFollow: () => void;
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const ms = Math.floor((seconds - s) * 10);
  return `${s}.${ms}s`;
}

export function PlaybackControls({
  state,
  controls,
  showGrid,
  showTrail,
  followGlider,
  onToggleGrid,
  onToggleTrail,
  onToggleFollow,
}: PlaybackControlsProps) {
  const speeds = [0.5, 1, 2];

  return (
    <div className="space-y-3">
      {/* Scrub bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={controls.togglePlay}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex-shrink-0"
        >
          {state.isPlaying ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min={0}
          max={Math.max(state.totalFrames - 1, 0)}
          value={state.frameIndex}
          onChange={(e) => controls.seek(parseInt(e.target.value))}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />

        <span className="text-xs text-gray-400 w-20 text-right flex-shrink-0">
          {formatTime(state.currentTime)} / {formatTime(state.totalTime)}
        </span>
      </div>

      {/* Speed + toggles row */}
      <div className="flex items-center justify-between">
        {/* Speed controls */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">Speed</span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => controls.setSpeed(s)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                state.speed === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Toggle controls */}
        <div className="flex items-center gap-2">
          <ToggleButton label="Grid" active={showGrid} onClick={onToggleGrid} />
          <ToggleButton label="Trail" active={showTrail} onClick={onToggleTrail} />
          <ToggleButton label="Follow" active={followGlider} onClick={onToggleFollow} />
          <ToggleButton
            label="Loop"
            active={state.loop}
            onClick={() => controls.setLoop(!state.loop)}
          />
        </div>
      </div>
    </div>
  );
}

interface ToggleButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToggleButton({ label, active, onClick }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
        active
          ? 'bg-gray-600 text-gray-100'
          : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}
