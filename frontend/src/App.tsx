import { Layout } from './components/Layout';
import { VehicleEditor } from './components/VehicleEditor';
import { VehiclePreview } from './components/VehiclePreview';
import { DropTestPanel } from './components/DropTestPanel';
import { EvolutionDashboard } from './components/EvolutionDashboard';
import { TrajectoryViewer } from './components/trajectory/TrajectoryViewer';

function App() {
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
