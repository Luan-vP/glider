import { useVehicleStore } from '../state/vehicle-store';

const NACA_PATTERN = /^\d{4,5}$/;

export function NacaParamsEditor() {
  const nacaParams = useVehicleStore((state) => state.nacaParams);
  const setNacaParams = useVehicleStore((state) => state.setNacaParams);

  const isValidDigits = NACA_PATTERN.test(nacaParams.digits);

  return (
    <div className="space-y-4 border border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-200">NACA Profile Parameters</h3>

      {/* NACA digit input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <span>NACA Digits</span>
          {!isValidDigits && (
            <span className="text-red-400 text-xs">Must be 4 or 5 digits</span>
          )}
        </label>
        <input
          type="text"
          value={nacaParams.digits}
          onChange={(e) => setNacaParams({ ...nacaParams, digits: e.target.value })}
          placeholder="e.g. 2412 or 23012"
          maxLength={5}
          className={`w-full px-3 py-2 bg-gray-700 border rounded text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isValidDigits ? 'border-gray-600' : 'border-red-500'
          }`}
        />
        <p className="text-xs text-gray-500">
          4-digit: MPTT (max camber, position, thickness). 5-digit: LPPQTT.
        </p>
      </div>

      {/* Span slider */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <span>Span (m)</span>
          <span className="text-white font-mono">{nacaParams.span.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0.3"
          max="6.0"
          step="0.1"
          value={nacaParams.span}
          onChange={(e) => setNacaParams({ ...nacaParams, span: parseFloat(e.target.value) })}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.3</span>
          <span>6.0</span>
        </div>
      </div>

      {/* Chord slider */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <span>Chord (m)</span>
          <span className="text-white font-mono">{nacaParams.chord.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0.05"
          max="3.0"
          step="0.05"
          value={nacaParams.chord}
          onChange={(e) => setNacaParams({ ...nacaParams, chord: parseFloat(e.target.value) })}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.05</span>
          <span>3.0</span>
        </div>
      </div>
    </div>
  );
}
