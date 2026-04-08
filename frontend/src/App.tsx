import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { VehicleEditor } from './components/VehicleEditor';
import { VehiclePreview } from './components/VehiclePreview';
import { DropTestPanel } from './components/DropTestPanel';
import { EvolutionDashboard } from './components/EvolutionDashboard';
import { TrajectoryViewer } from './components/trajectory/TrajectoryViewer';
import { MultiReplayPage } from './pages/MultiReplayPage';

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return hash;
}

function App() {
  const hash = useHashRoute();

  if (hash.startsWith('#/replay/multi')) {
    return <MultiReplayPage />;
  }

  return (
    <Layout
      vehicleEditor={<VehicleEditor />}
      dropTestPanel={<DropTestPanel />}
      vehiclePreview={<VehiclePreview />}
      evolutionDashboard={<EvolutionDashboard />}
      trajectoryViewer={<TrajectoryViewer />}
    />
  );
}

export default App;
