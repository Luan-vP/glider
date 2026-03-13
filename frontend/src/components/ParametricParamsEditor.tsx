import { useVehicleStore } from '../state/vehicle-store';

export function ParametricParamsEditor() {
  const parametricParams = useVehicleStore((state) => state.parametricParams);
  const setParametricParams = useVehicleStore((state) => state.setParametricParams);

  return (
    <div className="space-y-4 border border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-200">Parametric Airfoil Parameters</h3>

      {/* Max camber */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <span>Max Camber</span>
          <span className="text-white font-mono">{parametricParams.max_camber.toFixed(3)}</span>
        </label>
        <input
          type="range"
          min="0.0"
          max="0.1"
          step="0.001"
          value={parametricParams.max_camber}
          onChange={(e) =>
            setParametricParams({ ...parametricParams, max_camber: parseFloat(e.target.value) })
          }
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.0</span>
          <span>0.1</span>
        </div>
      </div>

      {/* Camber position */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <span>Camber Position</span>
          <span className="text-white font-mono">{parametricParams.camber_position.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.01"
          value={parametricParams.camber_position}
          onChange={(e) =>
            setParametricParams({
              ...parametricParams,
              camber_position: parseFloat(e.target.value),
            })
          }
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.1</span>
          <span>0.9</span>
        </div>
      </div>

      {/* Max thickness */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <span>Max Thickness</span>
          <span className="text-white font-mono">{parametricParams.max_thickness.toFixed(3)}</span>
        </label>
        <input
          type="range"
          min="0.05"
          max="0.30"
          step="0.005"
          value={parametricParams.max_thickness}
          onChange={(e) =>
            setParametricParams({
              ...parametricParams,
              max_thickness: parseFloat(e.target.value),
            })
          }
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.05</span>
          <span>0.30</span>
        </div>
      </div>

      {/* Span */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <span>Span (m)</span>
          <span className="text-white font-mono">{parametricParams.span.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="6.0"
          step="0.1"
          value={parametricParams.span}
          onChange={(e) =>
            setParametricParams({ ...parametricParams, span: parseFloat(e.target.value) })
          }
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.5</span>
          <span>6.0</span>
        </div>
      </div>

      {/* Chord */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <span>Chord (m)</span>
          <span className="text-white font-mono">{parametricParams.chord.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.05"
          value={parametricParams.chord}
          onChange={(e) =>
            setParametricParams({ ...parametricParams, chord: parseFloat(e.target.value) })
          }
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.1</span>
          <span>3.0</span>
        </div>
      </div>
    </div>
  );
}
