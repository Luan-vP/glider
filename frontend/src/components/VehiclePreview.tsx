/**
 * VehiclePreview component
 *
 * Displays a rendered image of the current vehicle, updating live when parameters change.
 *
 * Component Contract:
 * - Reads: vehicle from shared state
 * - Writes: previewImage, previewLoading in shared state
 * - Behavior: watches vehicle state, debounces 500ms, calls API, displays result
 */

import { useEffect, useRef, useState } from 'react';
import { useVehicleStore } from '../state/vehicle-store';
import { viewVehicle } from '../api/client';

export function VehiclePreview() {
  const vehicle = useVehicleStore((state) => state.vehicle);
  const previewImage = useVehicleStore((state) => state.previewImage);
  const previewLoading = useVehicleStore((state) => state.previewLoading);
  const setPreviewImage = useVehicleStore((state) => state.setPreviewImage);
  const setPreviewLoading = useVehicleStore((state) => state.setPreviewLoading);

  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetches the vehicle preview from the API.
   * Cancels any in-flight request before starting a new one.
   */
  const fetchPreview = async () => {
    // Don't fetch if vehicle has no vertices
    if (!vehicle.vertices) {
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setPreviewLoading(true);
    setError(null);

    try {
      const base64Image = await viewVehicle(vehicle);
      setPreviewImage(base64Image);
      setError(null);
    } catch (err) {
      // Ignore abort errors (these are expected when cancelling)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      // Handle other errors
      const errorMessage = err instanceof Error ? err.message : 'Failed to load preview';
      setError(errorMessage);
      setPreviewImage(null);
    } finally {
      setPreviewLoading(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Watch for vehicle changes and debounce API calls.
   * Triggers preview fetch on mount if vehicle has vertices.
   */
  useEffect(() => {
    // If no vertices, don't fetch anything
    if (!vehicle.vertices) {
      return;
    }

    // Set up debounce timer (500ms)
    const timerId = setTimeout(() => {
      fetchPreview();
    }, 500);

    // Cleanup: cancel timer and abort any in-flight request
    return () => {
      clearTimeout(timerId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle]); // Re-run whenever vehicle changes

  /**
   * Retry handler for error state
   */
  const handleRetry = () => {
    fetchPreview();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 rounded-lg p-6">
      {/* No vehicle state */}
      {!vehicle.vertices && (
        <div className="text-gray-400 text-center">
          <p className="text-lg">Generate a vehicle to see a preview</p>
        </div>
      )}

      {/* Loading state */}
      {vehicle.vertices && previewLoading && !error && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-64 h-48 bg-gray-800 rounded-lg animate-pulse" />
          <p className="text-gray-400 text-sm">Rendering vehicle...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-red-400">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="font-semibold">Failed to load preview</p>
            <p className="text-sm text-gray-400 mt-1">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success state: display image */}
      {vehicle.vertices && !previewLoading && !error && previewImage && (
        <div className="flex items-center justify-center">
          <img
            src={`data:image/png;base64,${previewImage}`}
            alt="Vehicle preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
