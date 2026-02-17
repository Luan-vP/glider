import { useState } from 'react';

type Mode = 'single' | 'evolution';

interface LayoutProps {
  vehicleEditor?: React.ReactNode;
  dropTestPanel?: React.ReactNode;
  vehiclePreview?: React.ReactNode;
  evolutionDashboard?: React.ReactNode;
}

export function Layout({
  vehicleEditor,
  dropTestPanel,
  vehiclePreview,
  evolutionDashboard,
}: LayoutProps) {
  const [mode, setMode] = useState<Mode>('single');

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Glider Lab</h1>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              mode === 'single'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Single Vehicle
          </button>
          <button
            onClick={() => setMode('evolution')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              mode === 'evolution'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Evolution
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 overflow-hidden">
        {/* Desktop layout: sidebar + main area */}
        <div className="hidden md:grid md:grid-cols-[380px_1fr] md:grid-rows-2 h-full gap-4 p-4">
          {/* Sidebar - Left Column (spans 2 rows) */}
          <div className="row-span-2 flex flex-col gap-4">
            {/* Parameter Editor */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex-1 overflow-auto">
              {vehicleEditor || (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Vehicle Parameter Editor
                </div>
              )}
            </div>

            {/* Drop Test Panel */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex-1 overflow-auto">
              {dropTestPanel || (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Drop Test Panel
                </div>
              )}
            </div>
          </div>

          {/* Main Area - Right Column */}
          {/* Vehicle Preview - Top */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-auto">
            {vehiclePreview || (
              <div className="flex items-center justify-center h-full text-gray-500">
                Vehicle Preview
              </div>
            )}
          </div>

          {/* Evolution Dashboard - Bottom (conditionally shown) */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-auto">
            {mode === 'evolution' ? (
              evolutionDashboard || (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Evolution Dashboard
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {mode === 'single' ? 'Switch to Evolution mode to view dashboard' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Mobile layout: stacked */}
        <div className="md:hidden flex flex-col gap-4 p-4 h-full overflow-auto">
          {/* Parameter Editor */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 min-h-[300px]">
            {vehicleEditor || (
              <div className="flex items-center justify-center h-full text-gray-500">
                Vehicle Parameter Editor
              </div>
            )}
          </div>

          {/* Vehicle Preview */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 min-h-[300px]">
            {vehiclePreview || (
              <div className="flex items-center justify-center h-full text-gray-500">
                Vehicle Preview
              </div>
            )}
          </div>

          {/* Drop Test Panel */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 min-h-[300px]">
            {dropTestPanel || (
              <div className="flex items-center justify-center h-full text-gray-500">
                Drop Test Panel
              </div>
            )}
          </div>

          {/* Evolution Dashboard (if in evolution mode) */}
          {mode === 'evolution' && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 min-h-[300px]">
              {evolutionDashboard || (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Evolution Dashboard
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
