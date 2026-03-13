import { useVehicleStore } from '../state/vehicle-store';
import type { ShapeType } from '../types/vehicle';

interface ShapeOption {
  value: ShapeType;
  label: string;
}

const SHAPE_OPTIONS: ShapeOption[] = [
  { value: 'point_cloud', label: 'Point Cloud' },
  { value: 'naca', label: 'NACA Profile' },
  { value: 'parametric', label: 'Parametric Airfoil' },
];

export function ShapeTypeSelector() {
  const shapeType = useVehicleStore((state) => state.shapeType);
  const setShapeType = useVehicleStore((state) => state.setShapeType);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">Shape Type</label>
      <select
        value={shapeType}
        onChange={(e) => setShapeType(e.target.value as ShapeType)}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {SHAPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
